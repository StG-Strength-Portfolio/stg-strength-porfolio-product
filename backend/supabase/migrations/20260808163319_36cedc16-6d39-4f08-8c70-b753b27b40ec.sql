CREATE OR REPLACE FUNCTION public.enforce_monotonic_current_screen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_screen IS DISTINCT FROM OLD.current_screen THEN
    -- server-side / admin contexts and super admins are exempt
    IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'super_admin') THEN
      RETURN NEW;
    END IF;
    IF NEW.current_screen < OLD.current_screen THEN
      NEW.current_screen := OLD.current_screen;
    ELSIF NEW.current_screen > OLD.current_screen + 1 THEN
      NEW.current_screen := OLD.current_screen + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_monotonic_current_screen ON public.profiles;
CREATE TRIGGER profiles_monotonic_current_screen
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_monotonic_current_screen();