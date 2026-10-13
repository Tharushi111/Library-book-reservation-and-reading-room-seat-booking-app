-- ==============================================================================
-- MIGRATION 04: STORAGE POLICIES AND SECURE STAFF PROVISIONING (CORRECTED)
-- SLIIT Library Management System (Role-Based Student & Staff System)
-- ==============================================================================
-- 1. NO automatic fictional data or overwriting of existing book inventory.
-- 2. Revokes public, anon, and authenticated execute on promote_to_staff().
--    Only trusted administrative execution (postgres role via Supabase SQL Editor
--    or service_role) can promote accounts to staff. Ordinary students CANNOT.
-- 3. Configures Supabase Storage bucket security policies.
-- ==============================================================================

-- ==============================================================================
-- 1. SECURE FUNCTION TO PROVISION STAFF ACCOUNTS (Admin-Only Execution)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.promote_to_staff(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    matched_id UUID;
    clean_email TEXT := LOWER(TRIM(target_email));
BEGIN
    SELECT id INTO matched_id
    FROM public.profiles
    WHERE LOWER(email) = clean_email;

    IF matched_id IS NULL THEN
        -- Also check auth.users in case the profile row hasn't been created yet
        SELECT id INTO matched_id
        FROM auth.users
        WHERE LOWER(email) = clean_email;

        IF matched_id IS NULL THEN
            RETURN 'Error: No user account found with email ' || target_email || '. User must register or sign in at least once first.';
        END IF;

        INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active)
        VALUES (matched_id, target_email, 'Library', 'Staff', 'staff', true)
        ON CONFLICT (id) DO UPDATE SET role = 'staff', is_active = true;
    ELSE
        UPDATE public.profiles
        SET role = 'staff', is_active = true, updated_at = now()
        WHERE id = matched_id;
    END IF;

    RETURN 'Success: Account (' || target_email || ') is now provisioned with Library Staff privileges.';
END;
$$;

-- STRICT ACCESS CONTROL:
-- Revoke all permissions from general users, anon, and authenticated mobile clients.
-- Only superuser/postgres (SQL Editor) and service_role can call promote_to_staff().
REVOKE ALL ON FUNCTION public.promote_to_staff(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_staff(TEXT) TO postgres, service_role;

-- ==============================================================================
-- 2. STORAGE BUCKET POLICIES (PROFILE-IMAGES, BOOK-IMAGES, ROOM-IMAGES)
-- ==============================================================================
-- Safely insert storage buckets if not already existing
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-images', 'book-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for library images and profile avatars
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view library images" ON storage.objects;
CREATE POLICY "Public can view library images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('profile-images', 'book-images', 'room-images'));

-- Authenticated upload for avatars (users can only upload to their own user-id folder)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-images' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Staff-only upload for book covers and study room images
DROP POLICY IF EXISTS "Staff can upload library assets" ON storage.objects;
CREATE POLICY "Staff can upload library assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN ('book-images', 'room-images') 
    AND public.is_staff(auth.uid())
);
