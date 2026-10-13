-- ==============================================================================
-- SLIIT LIBRARY: PATCH FOR NOTIFICATIONS, ROOM APPROVAL, & BORROWED BOOKS
-- Execute in your NEW development Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wkafyepfqqjqbytxghfd/sql
-- ==============================================================================

-- 1. NOTIFICATIONS RLS POLICIES
-- Allow authenticated students to receive/insert their own in-app notifications
-- and allow library staff to send notifications to students.
DROP POLICY IF EXISTS "notifications_staff_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own_or_staff" ON public.notifications;

CREATE POLICY "notifications_insert_own_or_staff"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id OR public.is_staff(auth.uid())
);

-- Ensure users can read their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Ensure users can mark their own notifications as read
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- 2. LOCK ROOM BOOKINGS ONCE APPROVED BY STAFF
-- Students can only update/cancel their booking if it has NOT been approved yet.
-- Once approved_by is set, only library staff can modify or cancel it.
DROP POLICY IF EXISTS "room_bookings_update_own" ON public.room_bookings;

CREATE POLICY "room_bookings_update_own"
ON public.room_bookings FOR UPDATE
TO authenticated
USING (
    (auth.uid() = user_id AND approved_by IS NULL)
    OR public.is_staff(auth.uid())
)
WITH CHECK (
    (auth.uid() = user_id AND approved_by IS NULL)
    OR public.is_staff(auth.uid())
);


-- 3. AUTOMATIC NOTIFICATION TRIGGERS IN POSTGRESQL

-- 3.1 Room Booking Notifications Trigger Function
CREATE OR REPLACE FUNCTION public.fn_trg_room_booking_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room_name TEXT;
    v_start_hhmm TEXT;
    v_end_hhmm TEXT;
BEGIN
    SELECT name INTO v_room_name FROM public.rooms WHERE id = NEW.room_id;
    IF v_room_name IS NULL THEN
        v_room_name := 'Study Room';
    END IF;

    v_start_hhmm := to_char(NEW.start_time, 'HH24:MI');
    v_end_hhmm   := to_char(NEW.end_time, 'HH24:MI');

    -- Event 1: New Room Booking Created
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read)
        VALUES (
            NEW.user_id,
            'Room Booking Submitted',
            'Your booking for ' || v_room_name || ' on ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' (' || v_start_hhmm || ' - ' || v_end_hhmm || ') has been submitted.',
            'room_booking',
            false
        );
        RETURN NEW;
    END IF;

    -- Event 2: Room Booking Approved by Staff
    IF TG_OP = 'UPDATE' AND OLD.approved_by IS NULL AND NEW.approved_by IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read)
        VALUES (
            NEW.user_id,
            'Room Booking Approved',
            'Your booking for ' || v_room_name || ' on ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' (' || v_start_hhmm || ' - ' || v_end_hhmm || ') has been approved by library staff.',
            'room_booking',
            false
        );
        RETURN NEW;
    END IF;

    -- Event 3: Room Booking Cancelled
    IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'cancelled' THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read)
        VALUES (
            NEW.user_id,
            'Room Booking Cancelled',
            'Your booking for ' || v_room_name || ' on ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' has been cancelled.',
            'room_booking',
            false
        );
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_booking_notifications ON public.room_bookings;
CREATE TRIGGER trg_room_booking_notifications
AFTER INSERT OR UPDATE ON public.room_bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_room_booking_notifications();


-- 3.2 Book Reservation Notifications Trigger Function
CREATE OR REPLACE FUNCTION public.fn_trg_book_reservation_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_book_title TEXT;
BEGIN
    SELECT title INTO v_book_title FROM public.books WHERE id = NEW.book_id;
    IF v_book_title IS NULL THEN
        v_book_title := 'Book';
    END IF;

    -- Event 1: New Reservation Created
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read)
        VALUES (
            NEW.user_id,
            'Book Reserved',
            'You have reserved "' || v_book_title || '". We will notify you as soon as it is marked ready for pickup.',
            'collection_reminder',
            false
        );
        RETURN NEW;
    END IF;

    -- Event 2: Marked Ready for Pickup
    IF TG_OP = 'UPDATE' AND NEW.status = 'ready_for_pickup' AND (OLD.status IS DISTINCT FROM 'ready_for_pickup') THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read)
        VALUES (
            NEW.user_id,
            'Book Ready for Pickup',
            '"' || v_book_title || '" is ready for collection at the SLIIT Library counter!',
            'book_available',
            false
        );
        RETURN NEW;
    END IF;

    -- Event 3: Reservation Cancelled
    IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read)
        VALUES (
            NEW.user_id,
            'Reservation Cancelled',
            'Your reservation for "' || v_book_title || '" has been cancelled.',
            'system',
            false
        );
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_book_reservation_notifications ON public.book_reservations;
CREATE TRIGGER trg_book_reservation_notifications
AFTER INSERT OR UPDATE ON public.book_reservations
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_book_reservation_notifications();


-- 3.3 Book Queue (Waiting List) Notifications Trigger Function
CREATE OR REPLACE FUNCTION public.fn_trg_book_queue_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_book_title TEXT;
BEGIN
    SELECT title INTO v_book_title FROM public.books WHERE id = NEW.book_id;
    IF v_book_title IS NULL THEN
        v_book_title := 'Book';
    END IF;

    -- Event 1: Joined Queue
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read)
        VALUES (
            NEW.user_id,
            'Joined Waiting Queue',
            'You joined the waiting queue for "' || v_book_title || '" at position #' || COALESCE(NEW.queue_position, 1) || '.',
            'system',
            false
        );
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_book_queue_notifications ON public.book_queue;
CREATE TRIGGER trg_book_queue_notifications
AFTER INSERT ON public.book_queue
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_book_queue_notifications();


-- 4. VERIFICATION QUERY
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('notifications', 'room_bookings')
ORDER BY tablename, policyname;
