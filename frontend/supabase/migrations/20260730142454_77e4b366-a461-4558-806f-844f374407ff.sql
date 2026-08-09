CREATE OR REPLACE FUNCTION public.get_my_received_strengths()
RETURNS TABLE(id uuid, strength_id text, message text, created_at timestamptz, teacher_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.strength_id, t.message, t.created_at,
         COALESCE(p.display_name, 'Opettaja')
  FROM public.teacher_assigned_strengths t
  LEFT JOIN public.profiles p ON p.id = t.teacher_id
  WHERE t.student_id = auth.uid()
  ORDER BY t.created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.get_my_received_strengths() TO authenticated;