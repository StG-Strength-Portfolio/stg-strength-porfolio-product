-- Service-description compliance: student application access is based only on
-- the one active class. Memberships retained for a deleted class's 90-day
-- restore window must not be mistaken for the student's current class.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_active_class_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.class_id
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = auth.uid()
    AND COALESCE(c.is_deleted, false) = false
  ORDER BY cm.joined_at DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_active_class_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_active_class_id() TO authenticated;

COMMIT;
