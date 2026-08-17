DROP POLICY IF EXISTS req_insert_sender ON public.contact_requests;
CREATE POLICY req_insert_sender ON public.contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND status = 'pending' AND sender_id <> receiver_id);

DROP POLICY IF EXISTS req_update_receiver ON public.contact_requests;
CREATE POLICY req_update_receiver ON public.contact_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND status IN ('accepted','rejected'));