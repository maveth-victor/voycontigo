
-- 1) Limpieza tabla antigua
DROP TABLE IF EXISTS public.contacts CASCADE;

-- 2) contact_requests
CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_requests_no_self CHECK (sender_id <> receiver_id),
  CONSTRAINT contact_requests_unique UNIQUE (sender_id, receiver_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "req_select_own" ON public.contact_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "req_insert_sender" ON public.contact_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "req_update_receiver" ON public.contact_requests FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
CREATE POLICY "req_delete_own" ON public.contact_requests FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 3) contacts (bidireccional, aceptados)
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contacts_no_self CHECK (user_id <> contact_id),
  CONSTRAINT contacts_unique UNIQUE (user_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select_own" ON public.contacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "contacts_delete_own" ON public.contacts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
-- Inserts se hacen vía trigger security definer

-- 4) email_invites (para correos no registrados)
CREATE TABLE public.email_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_invites_unique UNIQUE (inviter_id, email)
);
CREATE INDEX email_invites_email_idx ON public.email_invites (lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_invites TO authenticated;
GRANT ALL ON public.email_invites TO service_role;
ALTER TABLE public.email_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select_own" ON public.email_invites FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id);
CREATE POLICY "invites_insert_own" ON public.email_invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "invites_delete_own" ON public.email_invites FOR DELETE TO authenticated
  USING (auth.uid() = inviter_id);

-- 5) Vista pública de perfiles (buscar por email sin exponer teléfono)
CREATE OR REPLACE VIEW public.profiles_lookup
WITH (security_invoker=on) AS
  SELECT id, full_name, email FROM public.profiles;
GRANT SELECT ON public.profiles_lookup TO authenticated;

-- Permitir buscar cualquier perfil por email (solo campos básicos vía vista)
DROP POLICY IF EXISTS "profiles_lookup_by_email" ON public.profiles;
CREATE POLICY "profiles_lookup_by_email" ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- 6) Trigger: al aceptar una solicitud, crear ambos contactos
CREATE OR REPLACE FUNCTION public.on_contact_request_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    INSERT INTO public.contacts (user_id, contact_id) VALUES (NEW.sender_id, NEW.receiver_id)
      ON CONFLICT DO NOTHING;
    INSERT INTO public.contacts (user_id, contact_id) VALUES (NEW.receiver_id, NEW.sender_id)
      ON CONFLICT DO NOTHING;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_contact_request_accepted
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_contact_request_accepted();

-- 7) Ajustar handle_new_user para materializar invitaciones por email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Materializar invitaciones pendientes que apuntan a este correo
  INSERT INTO public.contact_requests (sender_id, receiver_id, status)
  SELECT DISTINCT ei.inviter_id, NEW.id, 'pending'
    FROM public.email_invites ei
   WHERE lower(ei.email) = lower(NEW.email)
     AND ei.status = 'pending'
     AND ei.inviter_id <> NEW.id
  ON CONFLICT (sender_id, receiver_id) DO NOTHING;

  UPDATE public.email_invites
     SET status = 'claimed'
   WHERE lower(email) = lower(NEW.email)
     AND status = 'pending';

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8) Función RPC opcional: enviar solicitud por email (busca o crea invitación)
CREATE OR REPLACE FUNCTION public.send_contact_request_by_email(_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _target uuid;
  _existing uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_required');
  END IF;

  SELECT id INTO _target FROM public.profiles WHERE lower(email) = lower(trim(_email)) LIMIT 1;

  IF _target IS NULL THEN
    INSERT INTO public.email_invites (inviter_id, email)
    VALUES (_me, lower(trim(_email)))
    ON CONFLICT (inviter_id, email) DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'kind', 'invite_email');
  END IF;

  IF _target = _me THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self');
  END IF;

  -- ¿Ya son contactos?
  SELECT 1 INTO _existing FROM public.contacts WHERE user_id = _me AND contact_id = _target;
  IF FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'already_contact'); END IF;

  -- ¿Ya hay solicitud?
  SELECT id INTO _existing FROM public.contact_requests
    WHERE (sender_id = _me AND receiver_id = _target)
       OR (sender_id = _target AND receiver_id = _me)
    LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'already_pending'); END IF;

  INSERT INTO public.contact_requests (sender_id, receiver_id) VALUES (_me, _target);
  RETURN jsonb_build_object('ok', true, 'kind', 'request_sent');
END; $$;
GRANT EXECUTE ON FUNCTION public.send_contact_request_by_email(text) TO authenticated;
