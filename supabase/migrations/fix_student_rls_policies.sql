/* ==============================================================================
   SLIIT LIBRARY: RESTORE STUDENT ROW LEVEL SECURITY (RLS) POLICIES
   ==============================================================================
   Fixes:
   1. Allows authenticated students to insert & cancel their own book reservations.
   2. Allows authenticated users to update book availability when reserving/returning.
   3. Allows authenticated students to book study & collaborative rooms and cancel their own bookings.
      (Enforces that Conference Room remains strictly staff-only).
   4. Allows authenticated students to join, update notifications, and leave the book waiting queue.
   ============================================================================== */

-- 1. BOOK RESERVATIONS POLICIES
DROP POLICY IF EXISTS "reservations_insert_own" ON public.book_reservations;
CREATE POLICY "reservations_insert_own"
ON public.book_reservations FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND status = 'reserved'
);

DROP POLICY IF EXISTS "reservations_update_own" ON public.book_reservations;
CREATE POLICY "reservations_update_own"
ON public.book_reservations FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_staff(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

-- 2. BOOKS TABLE: ALLOW AUTHENTICATED AVAILABILITY UPDATES
DROP POLICY IF EXISTS "books_authenticated_update_status" ON public.books;
CREATE POLICY "books_authenticated_update_status"
ON public.books FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. ROOM BOOKINGS POLICIES
DROP POLICY IF EXISTS "room_bookings_insert_own" ON public.room_bookings;
CREATE POLICY "room_bookings_insert_own"
ON public.room_bookings FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND (
        -- Students cannot book conference rooms (staff only)
        NOT EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = room_id AND r.room_type = 'conference_room'
        )
        OR public.is_staff(auth.uid())
    )
);

DROP POLICY IF EXISTS "room_bookings_update_own" ON public.room_bookings;
CREATE POLICY "room_bookings_update_own"
ON public.room_bookings FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_staff(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

-- 4. BOOK QUEUE (WAITING LIST) POLICIES
DROP POLICY IF EXISTS "queue_insert_own" ON public.book_queue;
CREATE POLICY "queue_insert_own"
ON public.book_queue FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "queue_update_own" ON public.book_queue;
CREATE POLICY "queue_update_own"
ON public.book_queue FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_staff(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

DROP POLICY IF EXISTS "queue_delete_own" ON public.book_queue;
CREATE POLICY "queue_delete_own"
ON public.book_queue FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

-- 5. VERIFICATION
SELECT tablename, policyname, cmd, permissive, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('book_reservations', 'books', 'room_bookings', 'book_queue')
ORDER BY tablename, cmd;
