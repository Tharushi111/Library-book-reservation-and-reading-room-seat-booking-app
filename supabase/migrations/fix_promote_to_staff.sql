-- ==============================================================================
-- SLIIT LIBRARY — MINIMAL SECURE FIX: STAFF & ADMIN ROLE PROMOTION
-- ==============================================================================
-- Purpose:
-- Fixes P0001: Permission denied error when running promote_to_staff() in SQL Editor.
-- Preserves role immutability for ordinary authenticated students.
-- ==============================================================================

-- 1. UPDATE TRIGGER FUNCTION: protect_profile_columns
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_db_admin BOOLEAN := (
        session_user IN ('postgres', 'supabase_admin')
        OR auth.role() = 'service_role'
        OR current_setting('app.allow_role_change', true) = 'true'
    );
BEGIN
    -- Only DB admins, service_role, or app admins can modify account role
    IF NOT (v_is_db_admin OR public.is_admin(v_caller_id)) THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify account role.';
        END IF;
    END IF;

    -- Only DB admins, service_role, or staff/admin can modify is_active, id, or email
    IF NOT (v_is_db_admin OR public.is_staff(v_caller_id)) THEN
        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify account active status.';
        END IF;
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify account ID.';
        END IF;
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Permission denied: Email can only be updated through Supabase Auth.';
        END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- 2. RE-ESTABLISH TRIGGER ON public.profiles
DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- 3. DROP PREVIOUS FUNCTION SIGNATURES TO PREVENT OVERLOAD AMBIGUITY
DROP FUNCTION IF EXISTS public.promote_to_staff(TEXT);
DROP FUNCTION IF EXISTS public.promote_to_staff(TEXT, TEXT);

-- 4. RECREATE promote_to_staff WITH TRANSACTION FLAG AND DUAL-ROLE SUPPORT
-- Usage 1: SELECT public.promote_to_staff('it23633940@my.sliit.lk'); (defaults to 'staff')
-- Usage 2: SELECT public.promote_to_staff('it23633940@my.sliit.lk', 'admin');
CREATE OR REPLACE FUNCTION public.promote_to_staff(target_email TEXT, target_role TEXT DEFAULT 'staff')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    matched_id UUID;
    clean_email TEXT := LOWER(TRIM(target_email));
    clean_role TEXT := LOWER(TRIM(target_role));
BEGIN
    -- Validate requested role
    IF clean_role NOT IN ('staff', 'admin') THEN
        RETURN 'Error: Invalid target role ''' || target_role || '''. Permitted roles: staff, admin.';
    END IF;

    -- Set local transaction flag to permit role modification
    PERFORM set_config('app.allow_role_change', 'true', true);

    SELECT id INTO matched_id
    FROM public.profiles
    WHERE LOWER(email) = clean_email;

    IF matched_id IS NULL THEN
        SELECT id INTO matched_id
        FROM auth.users
        WHERE LOWER(email) = clean_email;

        IF matched_id IS NULL THEN
            RETURN 'Error: No user account found with email ' || target_email || '. User must register or sign in at least once first.';
        END IF;

        INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active)
        VALUES (matched_id, target_email, 'Library', CASE WHEN clean_role = 'admin' THEN 'Admin' ELSE 'Staff' END, clean_role, true)
        ON CONFLICT (id) DO UPDATE SET role = clean_role, is_active = true, updated_at = now();
    ELSE
        UPDATE public.profiles
        SET role = clean_role, is_active = true, updated_at = now()
        WHERE id = matched_id;
    END IF;

    RETURN 'Success: Account (' || target_email || ') is now provisioned with ' || clean_role || ' privileges.';
END;
$$;

-- 5. SECURE EXECUTION PERMISSIONS
REVOKE ALL ON FUNCTION public.promote_to_staff(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_staff(TEXT, TEXT) TO postgres, service_role;
