
-- 1) RPC to create a pending contact invite from an inviter to the caller
CREATE OR REPLACE FUNCTION public.create_contact_invite(_inviter_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _existing_id uuid;
  _new_id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _inviter_id IS NULL OR _inviter_id = _me THEN RETURN NULL; END IF;

  SELECT id INTO _existing_id FROM public.contacts
   WHERE (requester_id = _inviter_id AND addressee_id = _me)
      OR (requester_id = _me AND addressee_id = _inviter_id)
   LIMIT 1;
  IF _existing_id IS NOT NULL THEN RETURN _existing_id; END IF;

  INSERT INTO public.contacts (requester_id, addressee_id, status)
  VALUES (_inviter_id, _me, 'pending')
  RETURNING id INTO _new_id;
  RETURN _new_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_contact_invite(uuid) TO authenticated;

-- 2) Global forum reviews
CREATE TABLE IF NOT EXISTS public.forum_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text NOT NULL,
  category text,
  risk_level text,
  image_url text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_reviews TO authenticated;
GRANT ALL ON public.forum_reviews TO service_role;

ALTER TABLE public.forum_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read reviews"
  ON public.forum_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reviews"
  ON public.forum_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews"
  ON public.forum_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews"
  ON public.forum_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reviews;
