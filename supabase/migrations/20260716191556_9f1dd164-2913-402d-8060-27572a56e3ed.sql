
-- Quitar política duplicada
DROP POLICY IF EXISTS "profiles_lookup_by_email" ON public.profiles;

-- Revocar ejecución pública en funciones nuevas y existentes (el linter las marcó)
REVOKE ALL ON FUNCTION public.on_contact_request_accepted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_contact_request_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_contact_request_by_email(text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_contact_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_contact_invite(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.are_contacts(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_contacts(uuid, uuid) TO authenticated;
