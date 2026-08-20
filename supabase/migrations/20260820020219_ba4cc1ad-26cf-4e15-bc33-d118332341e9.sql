ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS address text;

CREATE TABLE IF NOT EXISTS public.emergency_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date date,
  blood_type text,
  medical_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_profiles TO authenticated;
GRANT ALL ON public.emergency_profiles TO service_role;

ALTER TABLE public.emergency_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own emergency profile"
  ON public.emergency_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Contacts read emergency profile"
  ON public.emergency_profiles FOR SELECT TO authenticated
  USING (public.are_contacts(auth.uid(), user_id));

CREATE TRIGGER update_emergency_profiles_updated_at
  BEFORE UPDATE ON public.emergency_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();