DELETE FROM public.class_members WHERE class_id IN (SELECT id FROM public.classes WHERE join_code IN ('ZZ-SV-01','ZZ-FI-01','ZZ-EN-01'));
DELETE FROM public.classes WHERE join_code IN ('ZZ-SV-01','ZZ-FI-01','ZZ-EN-01');
UPDATE public.profiles p SET language = COALESCE((
  SELECT c.language FROM public.class_members cm JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = p.id ORDER BY cm.joined_at DESC LIMIT 1
), 'fi');