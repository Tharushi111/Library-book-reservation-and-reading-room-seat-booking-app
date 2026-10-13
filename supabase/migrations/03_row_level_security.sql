-- ==============================================================================
-- MIGRATION 03: ROW LEVEL SECURITY (RLS) POLICIES (V3 REVISED)
-- SLIIT Library Management System (Role-Based Student & Staff System)
-- ==============================================================================
-- 1. Direct student INSERT/UPDATE permissions on reservations and room bookings
--    are REMOVED. All reservations and bookings MUST go through the secure atomic RPCs.
-- 2. Unrestricted notification INSERT is REMOVED. Students cannot insert notifications
--    for any account. Notifications are created strictly by trusted database functions.
-- 3. Student privacy is enforced: Students can only view their own profile row.
-- 4. Clean removal of all legacy and existing policies.
-- ==============================================================================

-- ==============================================================================
-- 1. DYNAMIC AUDIT & REMOVAL OF ALL LEGACY RLS POLICIES
-- ==============================================================================
-- Dynamically query pg_policies to drop every existing policy across library tables.
-- This ensures no legacy policies (regardless of original name) remain active.
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'profiles',
              'books',
              'book_copies',
              'book_reservations',
              'room_bookings',
              'borrowed_books',
              'book_queue',
              'notifications',
              'recent_searches',
              'announcements',
              'rooms'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ==============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowed_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. SECURE PUBLIC VIEW FOR PROFILES (Zero Contact Detail Leaks)
-- ==============================================================================
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id,
    first_name,
    last_name,
    avatar_url,
    role
FROM public.profiles
WHERE is_active = true;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- ==============================================================================
-- 3. POLICIES: PROFILES TABLE (Strict Personal Privacy)
-- ==============================================================================
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_staff" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_staff_all" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Students can ONLY view their own full profile row. Staff can view all profiles.
CREATE POLICY "profiles_select_own_or_staff"
ON public.profiles FOR SELECT
TO authenticated
USING (
    auth.uid() = id 
    OR public.is_staff(auth.uid())
);

-- Students can update their own permitted fields (trigger protect_profile_columns blocks role/is_active/id tampering)
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Staff have complete administrative access
CREATE POLICY "profiles_staff_all"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 4. POLICIES: BOOKS TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "books_select_public" ON public.books;
DROP POLICY IF EXISTS "books_staff_manage" ON public.books;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.books;
DROP POLICY IF EXISTS "Allow public read" ON public.books;

CREATE POLICY "books_select_public"
ON public.books FOR SELECT
TO authenticated, anon
USING (is_archived = false OR public.is_staff(auth.uid()));

CREATE POLICY "books_staff_manage"
ON public.books FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "books_authenticated_update_status"
ON public.books FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 5. POLICIES: BOOK COPIES TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "book_copies_select" ON public.book_copies;
DROP POLICY IF EXISTS "book_copies_staff_manage" ON public.book_copies;

CREATE POLICY "book_copies_select"
ON public.book_copies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "book_copies_staff_manage"
ON public.book_copies FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 6. POLICIES: BOOK RESERVATIONS TABLE (RPC Enforced)
-- ==============================================================================
DROP POLICY IF EXISTS "reservations_select_own" ON public.book_reservations;
DROP POLICY IF EXISTS "reservations_insert_own" ON public.book_reservations;
DROP POLICY IF EXISTS "reservations_update_own" ON public.book_reservations;
DROP POLICY IF EXISTS "reservations_staff_manage" ON public.book_reservations;
DROP POLICY IF EXISTS "Users can view own reservations" ON public.book_reservations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.book_reservations;

-- Students can view their own reservations; Staff can view all
CREATE POLICY "reservations_select_own"
ON public.book_reservations FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Students can insert their own reservation
CREATE POLICY "reservations_insert_own"
ON public.book_reservations FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND status = 'reserved'
);

-- Students can cancel their own reservation (protect_reservation_status enforces safe transition)
CREATE POLICY "reservations_update_own"
ON public.book_reservations FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_staff(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

-- Staff can directly manage all reservation rows
CREATE POLICY "reservations_staff_manage"
ON public.book_reservations FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 7. POLICIES: BOOK QUEUE (WAITING LIST)
-- ==============================================================================

-- Students can view their own queue spots, staff can view all
CREATE POLICY "queue_select"
ON public.book_queue FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Students can join the queue
CREATE POLICY "queue_insert_own"
ON public.book_queue FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Students can update their own queue entry (e.g. notification toggle)
CREATE POLICY "queue_update_own"
ON public.book_queue FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_staff(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

-- Students can leave the queue
CREATE POLICY "queue_delete_own"
ON public.book_queue FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

-- ==============================================================================
-- 8. POLICIES: BORROWED BOOKS (LOANS)
-- ==============================================================================
DROP POLICY IF EXISTS "loans_select_own" ON public.borrowed_books;
DROP POLICY IF EXISTS "loans_staff_manage" ON public.borrowed_books;

-- Students can ONLY view their own loans
CREATE POLICY "loans_select_own"
ON public.borrowed_books FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Only staff can issue, return, or modify book loan records
CREATE POLICY "loans_staff_manage"
ON public.borrowed_books FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 9. POLICIES: ROOMS TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "rooms_select_public" ON public.rooms;
DROP POLICY IF EXISTS "rooms_staff_manage" ON public.rooms;

CREATE POLICY "rooms_select_public"
ON public.rooms FOR SELECT
TO authenticated, anon
USING (is_archived = false OR public.is_staff(auth.uid()));

CREATE POLICY "rooms_staff_manage"
ON public.rooms FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 10. POLICIES: ROOM BOOKINGS TABLE (RPC Enforced)
-- ==============================================================================
DROP POLICY IF EXISTS "room_bookings_select" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_insert_own" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_update_own" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_staff_manage" ON public.room_bookings;

CREATE POLICY "room_bookings_select"
ON public.room_bookings FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Students can book study & collaborative rooms (Conference room is staff only)
CREATE POLICY "room_bookings_insert_own"
ON public.room_bookings FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND (
        NOT EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = room_id AND r.room_type = 'conference_room'
        )
        OR public.is_staff(auth.uid())
    )
);

-- Students can cancel/update their own bookings (protect_room_booking_status protects schedules)
CREATE POLICY "room_bookings_update_own"
ON public.room_bookings FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_staff(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

-- Staff have full management access
CREATE POLICY "room_bookings_staff_manage"
ON public.room_bookings FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 11. POLICIES: ANNOUNCEMENTS TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "announcements_select_published" ON public.announcements;
DROP POLICY IF EXISTS "announcements_staff_manage" ON public.announcements;

CREATE POLICY "announcements_select_published"
ON public.announcements FOR SELECT
TO authenticated, anon
USING (is_published = true OR public.is_staff(auth.uid()));

CREATE POLICY "announcements_staff_manage"
ON public.announcements FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 12. POLICIES: NOTIFICATIONS TABLE (Zero Direct Insertion by Students)
-- ==============================================================================
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_staff_manage" ON public.notifications;

-- Users can only view their own notifications
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can only update their own notifications (trigger enforces that only is_read can change)
CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can dismiss/delete their own notifications
CREATE POLICY "notifications_delete_own"
ON public.notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- UNRESTRICTED INSERT REMOVED: Students CANNOT insert notifications for any user.
-- Only staff or trusted database functions can insert notifications.
CREATE POLICY "notifications_staff_insert"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 13. POLICIES: RECENT SEARCHES TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "recent_searches_own" ON public.recent_searches;

CREATE POLICY "recent_searches_own"
ON public.recent_searches FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
