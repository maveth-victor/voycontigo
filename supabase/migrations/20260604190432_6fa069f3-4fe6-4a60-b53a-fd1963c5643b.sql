
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Locations (latest per user)
CREATE TABLE public.locations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Location history
CREATE TABLE public.location_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_location_history_user_time ON public.location_history(user_id, recorded_at DESC);
GRANT SELECT, INSERT, DELETE ON public.location_history TO authenticated;
GRANT ALL ON public.location_history TO service_role;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

-- Contacts (bidirectional requests)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- SOS alerts
CREATE TABLE public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  message TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sos_alerts TO authenticated;
GRANT ALL ON public.sos_alerts TO service_role;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- ============ Helper: are two users accepted contacts? ============
CREATE OR REPLACE FUNCTION public.are_contacts(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.contacts
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a))
  )
$$;

-- ============ RLS Policies ============

-- profiles: anyone authenticated can read basic profile info (needed to search/add contacts), own can update, system inserts
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles: user reads own; admin reads all
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- locations: owner can upsert/delete own; contacts (accepted) and admins can read
CREATE POLICY "Read own location" ON public.locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Read contacts location" ON public.locations FOR SELECT TO authenticated USING (public.are_contacts(auth.uid(), user_id));
CREATE POLICY "Admin reads all locations" ON public.locations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own location" ON public.locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own location" ON public.locations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own location" ON public.locations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- location_history: owner manages; admin reads
CREATE POLICY "Owner read history" ON public.location_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin read history" ON public.location_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner insert history" ON public.location_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete history" ON public.location_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- contacts: participants read; requester creates; either updates status; either deletes
CREATE POLICY "Participants read contacts" ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Requester inserts contact" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Participants update contact" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Participants delete contact" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- sos: owner creates and reads own; contacts read; admin all
CREATE POLICY "Owner read sos" ON public.sos_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Contacts read sos" ON public.sos_alerts FOR SELECT TO authenticated USING (public.are_contacts(auth.uid(), user_id));
CREATE POLICY "Admin read sos" ON public.sos_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner insert sos" ON public.sos_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin update sos" ON public.sos_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ Auto-create profile + role on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ Realtime ============
ALTER TABLE public.locations REPLICA IDENTITY FULL;
ALTER TABLE public.sos_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.contacts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
