CREATE OR REPLACE FUNCTION public.are_contacts(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.contacts
    WHERE (user_id = _a AND contact_id = _b) OR (user_id = _b AND contact_id = _a)
  )
$function$;

ALTER TABLE public.locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_requests;