CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  recipient_email text NOT NULL,
  recipient_id uuid,
  language text NOT NULL DEFAULT 'fi',
  subject text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  opened_at timestamp with time zone,
  bounced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can read email log"
  ON public.email_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX email_log_created_at_idx ON public.email_log (created_at DESC);
CREATE INDEX email_log_template_key_idx ON public.email_log (template_key);