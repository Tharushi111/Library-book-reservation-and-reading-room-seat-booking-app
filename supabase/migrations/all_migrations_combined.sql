-- ==============================================================================
-- MIGRATION 01: SCHEMA ENHANCEMENTS AND CONSTRAINTS (V3 REVISED)
-- SLIIT Library Management System (Role-Based Student & Staff System)
-- ==============================================================================
-- SAFE & IDEMPOTENT:
-- 1. Preserves all existing tables, columns, and records.
-- 2. Never mutates, cancels, or deletes existing student bookings automatically.
-- 3. Halts with a helpful message if pre-existing room booking overlaps are detected.
-- 4. Uses btree_gist extension and an immutable range function for the GiST exclusion constraint.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ==============================================================================
-- 2. IMMUTABLE RANGE FUNCTION (Required for Room Booking Exclusion Constraint)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.room_booking_range(
    p_date DATE,
    p_start TIME,
    p_end TIME
)
RETURNS tsrange
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT tsrange(
        (p_date + p_start)::timestamp,
        (p_date + p_end)::timestamp,
        '[)'
    );
$$;

-- ==============================================================================
-- 3. ENHANCE: PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(255) UNIQUE,
    student_id VARCHAR(50),
    phone_number VARCHAR(30),
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
            CHECK (role IN ('student', 'staff', 'admin'));
    END IF;
END $$;

-- ==============================================================================
-- 4. ENHANCE: BOOKS TABLE (Do NOT overwrite existing availability or copies)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    edition VARCHAR(50),
    cover_url TEXT,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS isbn VARCHAR(50);
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publisher VARCHAR(255);
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publication_year INT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS shelf_location VARCHAR(100);
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS total_copies INT NOT NULL DEFAULT 1;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS available_copies INT NOT NULL DEFAULT 1;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS has_copy_records BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_availability_check') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_availability_check 
            CHECK (availability_status IN ('available', 'borrowed', 'reserved', 'maintenance'));
    END IF;
END $$;

-- ==============================================================================
-- 5. CREATE: BOOK COPIES TABLE (Physical Inventory)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.book_copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    copy_number VARCHAR(50) NOT NULL,
    barcode VARCHAR(100),
    condition VARCHAR(50) NOT NULL DEFAULT 'good',
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    shelf_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_book_copy_number UNIQUE (book_id, copy_number)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_copies_condition_check') THEN
        ALTER TABLE public.book_copies ADD CONSTRAINT book_copies_condition_check 
            CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'damaged', 'lost'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_copies_status_check') THEN
        ALTER TABLE public.book_copies ADD CONSTRAINT book_copies_status_check 
            CHECK (status IN ('available', 'reserved', 'borrowed', 'damaged', 'lost', 'maintenance'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_copies_barcode_unique') THEN
        ALTER TABLE public.book_copies ADD CONSTRAINT book_copies_barcode_unique UNIQUE (barcode);
    END IF;
END $$;

-- ==============================================================================
-- 6. ENHANCE: BOOK RESERVATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.book_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    collection_deadline TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'reserved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.book_reservations ADD COLUMN IF NOT EXISTS copy_id UUID REFERENCES public.book_copies(id) ON DELETE SET NULL;
ALTER TABLE public.book_reservations ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE public.book_reservations ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;
ALTER TABLE public.book_reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.book_reservations ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.book_reservations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.book_reservations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_reservations_status_check') THEN
        ALTER TABLE public.book_reservations ADD CONSTRAINT book_reservations_status_check 
            CHECK (status IN ('reserved', 'ready_for_pickup', 'collected', 'cancelled', 'expired'));
    END IF;
END $$;

-- ==============================================================================
-- 7. ENHANCE: BOOK QUEUE (WAITING LIST)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.book_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    queue_position INT DEFAULT 1,
    estimated_wait_days INT DEFAULT 4,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notify_enabled BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.book_queue ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
ALTER TABLE public.book_queue ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.book_queue ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.book_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_queue_status_check') THEN
        ALTER TABLE public.book_queue ADD CONSTRAINT book_queue_status_check 
            CHECK (status IN ('waiting', 'notified', 'completed', 'cancelled'));
    END IF;
END $$;

-- ==============================================================================
-- 8. ENHANCE: BORROWED BOOKS (LOANS & CIRCULATION)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.borrowed_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    borrowed_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'borrowed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.borrowed_books ADD COLUMN IF NOT EXISTS copy_id UUID REFERENCES public.book_copies(id) ON DELETE SET NULL;
ALTER TABLE public.borrowed_books ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.borrowed_books ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.borrowed_books ADD COLUMN IF NOT EXISTS renewal_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.borrowed_books ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.borrowed_books ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'borrowed_books_status_check') THEN
        ALTER TABLE public.borrowed_books ADD CONSTRAINT borrowed_books_status_check 
            CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost'));
    END IF;
END $$;

-- ==============================================================================
-- 9. ENHANCE: ROOMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    room_type VARCHAR(50) NOT NULL DEFAULT 'study_room',
    capacity INT NOT NULL DEFAULT 6,
    description TEXT,
    image_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_room_type_check') THEN
        ALTER TABLE public.rooms ADD CONSTRAINT rooms_room_type_check 
            CHECK (room_type IN ('study_room', 'conference_room', 'collaborative_space'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_status_check') THEN
        ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check 
            CHECK (status IN ('available', 'unavailable', 'maintenance'));
    END IF;
END $$;

-- ==============================================================================
-- 10. ENHANCE: ROOM BOOKINGS & SAFE EXCLUSION CONSTRAINT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.room_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    participants INT NOT NULL DEFAULT 5,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.room_bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.room_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.room_bookings ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.room_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_bookings_status_check') THEN
        ALTER TABLE public.room_bookings ADD CONSTRAINT room_bookings_status_check 
            CHECK (status IN ('active', 'completed', 'cancelled', 'rejected'));
    END IF;
END $$;

-- Safe Conflict Check: DO NOT silently mutate or delete real user bookings.
-- If any overlapping active bookings exist, halt with an explicit actionable message.
DO $$
DECLARE
    v_conflict_count INT;
BEGIN
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.room_bookings b1
    JOIN public.room_bookings b2 
      ON b1.room_id = b2.room_id
     AND b1.booking_date = b2.booking_date
     AND b1.id < b2.id
     AND b1.status = 'active'
     AND b2.status = 'active'
     AND (b1.start_time < b2.end_time AND b1.end_time > b2.start_time);

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Migration halted: Found % overlapping active room booking(s) in room_bookings. Please run preflight_validation_and_conflicts.sql to review and resolve the conflicts before applying the exclusion constraint.', v_conflict_count;
    END IF;

    -- Add exclusion constraint if 0 active conflicts exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_active_room_bookings'
    ) THEN
        ALTER TABLE public.room_bookings 
        ADD CONSTRAINT no_overlapping_active_room_bookings 
        EXCLUDE USING gist (
            room_id WITH =, 
            public.room_booking_range(booking_date, start_time, end_time) WITH &&
        ) 
        WHERE (status = 'active');
    END IF;
END $$;

-- ==============================================================================
-- 11. CREATE: ANNOUNCEMENTS TABLE (Clean, empty schema — No fictional notices)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'announcements_category_check') THEN
        ALTER TABLE public.announcements ADD CONSTRAINT announcements_category_check 
            CHECK (category IN ('general', 'holiday', 'events', 'maintenance', 'books'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'announcements_priority_check') THEN
        ALTER TABLE public.announcements ADD CONSTRAINT announcements_priority_check 
            CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
END $$;

-- ==============================================================================
-- 12. ENHANCE: NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 13. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);
CREATE INDEX IF NOT EXISTS idx_books_availability ON public.books(availability_status);
CREATE INDEX IF NOT EXISTS idx_books_title ON public.books(title);

CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON public.book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON public.book_copies(status);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.book_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON public.book_reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.book_reservations(status);

CREATE INDEX IF NOT EXISTS idx_queue_book_id ON public.book_queue(book_id);
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON public.book_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.book_queue(status);

CREATE INDEX IF NOT EXISTS idx_borrowed_user_id ON public.borrowed_books(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowed_status ON public.borrowed_books(status);
CREATE INDEX IF NOT EXISTS idx_borrowed_due_date ON public.borrowed_books(due_date);

CREATE INDEX IF NOT EXISTS idx_room_bookings_room_date ON public.room_bookings(room_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_room_bookings_user ON public.room_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_status ON public.room_bookings(status);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
-- ==============================================================================
-- MIGRATION 02: ATOMIC POSTGRESQL FUNCTIONS AND TRIGGERS (V3 REVISED)
-- SLIIT Library Management System (Role-Based Student & Staff System)
-- ==============================================================================
-- 1. SECURITY DEFINER with fixed search_path = public, pg_temp.
-- 2. Authorization strictly validated using auth.uid() — NO spoofable caller IDs.
-- 3. Column-protection triggers preventing student privilege escalation.
-- 4. Authoritative physical inventory synchronization handling INSERT, UPDATE, DELETE,
--    and moving copies across different books.
-- 5. Safe waiting list queue claim workflow (NO ghost reserved copies; formal reservation
--    with 24h pickup deadline and queue renumbering).
-- 6. Issue book loan validates book, copy, reservation owner, and avoids double borrowing.
-- ==============================================================================

-- ==============================================================================
-- 1. HELPER FUNCTION: IS_STAFF
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_staff(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_role VARCHAR;
    user_active BOOLEAN;
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role, is_active INTO user_role, user_active
    FROM public.profiles
    WHERE id = check_user_id;

    RETURN (user_role IN ('staff', 'admin') AND user_active IS TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.is_staff(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated;

-- ==============================================================================
-- 2. AUTH TRIGGER: AUTO-SYNC PROFILES FROM AUTH.USERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    assigned_role VARCHAR := 'student';
    first_name_val VARCHAR := '';
    last_name_val VARCHAR := '';
    student_id_val VARCHAR := NULL;
    phone_val VARCHAR := NULL;
    extracted_email VARCHAR;
BEGIN
    extracted_email := NEW.email;

    IF NEW.raw_user_meta_data IS NOT NULL THEN
        first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'full_name', '');
        last_name_val  := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
        student_id_val := NEW.raw_user_meta_data->>'student_id';
        phone_val      := NEW.raw_user_meta_data->>'phone_number';

        IF first_name_val = '' AND NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
            first_name_val := NEW.raw_user_meta_data->>'name';
        END IF;

        assigned_role := 'student';
    END IF;

    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        email,
        student_id,
        phone_number,
        role,
        avatar_url,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(first_name_val, 'Student'),
        COALESCE(last_name_val, ''),
        extracted_email,
        student_id_val,
        phone_val,
        assigned_role,
        NEW.raw_user_meta_data->>'avatar_url',
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. COLUMN PROTECTION TRIGGERS (Database-Enforced Immutability for Students)
-- ==============================================================================

-- 3.1 Protect Profiles
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify account role.';
        END IF;
        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify account active status.';
        END IF;
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify account ID.';
        END IF;
        IF NEW.student_id IS DISTINCT FROM OLD.student_id AND OLD.student_id IS NOT NULL THEN
            RAISE EXCEPTION 'Permission denied: Student ID cannot be modified once set.';
        END IF;
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Permission denied: Email can only be updated through Supabase Auth.';
        END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- 3.2 Protect Reservations (Permits legitimate cancellation of BOTH 'reserved' and 'ready_for_pickup')
CREATE OR REPLACE FUNCTION public.protect_reservation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        -- Non-staff can ONLY transition from 'reserved' or 'ready_for_pickup' to 'cancelled'
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT (OLD.status IN ('reserved', 'ready_for_pickup') AND NEW.status = 'cancelled') THEN
                RAISE EXCEPTION 'Permission denied: Students may only cancel their own eligible reservations.';
            END IF;
        END IF;

        IF NEW.book_id IS DISTINCT FROM OLD.book_id OR
           NEW.user_id IS DISTINCT FROM OLD.user_id OR
           NEW.copy_id IS DISTINCT FROM OLD.copy_id OR
           NEW.reserved_at IS DISTINCT FROM OLD.reserved_at OR
           NEW.collection_deadline IS DISTINCT FROM OLD.collection_deadline OR
           NEW.ready_at IS DISTINCT FROM OLD.ready_at OR
           NEW.collected_at IS DISTINCT FROM OLD.collected_at OR
           NEW.processed_by IS DISTINCT FROM OLD.processed_by THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify reservation core metadata.';
        END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_reservation_status ON public.book_reservations;
CREATE TRIGGER trg_protect_reservation_status
    BEFORE UPDATE ON public.book_reservations
    FOR EACH ROW EXECUTE FUNCTION public.protect_reservation_status();

-- 3.3 Protect Room Bookings
CREATE OR REPLACE FUNCTION public.protect_room_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT (OLD.status = 'active' AND NEW.status = 'cancelled') THEN
                RAISE EXCEPTION 'Permission denied: Students may only cancel their own active bookings.';
            END IF;
        END IF;

        IF NEW.room_id IS DISTINCT FROM OLD.room_id OR
           NEW.user_id IS DISTINCT FROM OLD.user_id OR
           NEW.booking_date IS DISTINCT FROM OLD.booking_date OR
           NEW.start_time IS DISTINCT FROM OLD.start_time OR
           NEW.end_time IS DISTINCT FROM OLD.end_time OR
           NEW.participants IS DISTINCT FROM OLD.participants OR
           NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify booking schedule or administrative metadata.';
        END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_room_booking_status ON public.room_bookings;
CREATE TRIGGER trg_protect_room_booking_status
    BEFORE UPDATE ON public.room_bookings
    FOR EACH ROW EXECUTE FUNCTION public.protect_room_booking_status();

-- 3.4 Protect Queue Columns
CREATE OR REPLACE FUNCTION public.protect_queue_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        IF NEW.queue_position IS DISTINCT FROM OLD.queue_position OR
           NEW.status IS DISTINCT FROM OLD.status OR
           NEW.book_id IS DISTINCT FROM OLD.book_id OR
           NEW.user_id IS DISTINCT FROM OLD.user_id OR
           NEW.joined_at IS DISTINCT FROM OLD.joined_at OR
           NEW.notified_at IS DISTINCT FROM OLD.notified_at OR
           NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
            RAISE EXCEPTION 'Permission denied: System-managed queue attributes cannot be modified directly.';
        END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_queue_columns ON public.book_queue;
CREATE TRIGGER trg_protect_queue_columns
    BEFORE UPDATE ON public.book_queue
    FOR EACH ROW EXECUTE FUNCTION public.protect_queue_columns();

-- 3.5 Protect Notification Columns
CREATE OR REPLACE FUNCTION public.protect_notification_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        IF NEW.user_id IS DISTINCT FROM OLD.user_id OR
           NEW.title IS DISTINCT FROM OLD.title OR
           NEW.message IS DISTINCT FROM OLD.message OR
           NEW.type IS DISTINCT FROM OLD.type OR
           NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Permission denied: Students may only update the notification read status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_notification_columns ON public.notifications;
CREATE TRIGGER trg_protect_notification_columns
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.protect_notification_columns();

-- ==============================================================================
-- 4. INVENTORY TRIGGER: SYNCHRONIZE COPIES WITH CATALOG COUNTS (Authoritative)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_book_counts(p_book_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    total_cnt INT;
    avail_cnt INT;
    v_book RECORD;
BEGIN
    IF p_book_id IS NULL THEN
        RETURN;
    END IF;

    SELECT * INTO v_book FROM public.books WHERE id = p_book_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- If this book has copy records tracked, or copies currently exist in book_copies
    IF v_book.has_copy_records OR EXISTS (SELECT 1 FROM public.book_copies WHERE book_id = p_book_id) THEN
        IF NOT v_book.has_copy_records THEN
            UPDATE public.books SET has_copy_records = true WHERE id = p_book_id;
        END IF;

        SELECT COUNT(*) INTO total_cnt
        FROM public.book_copies
        WHERE book_id = p_book_id AND status != 'lost';

        SELECT COUNT(*) INTO avail_cnt
        FROM public.book_copies
        WHERE book_id = p_book_id AND status = 'available';

        -- When the last physical copy is deleted or moved, total_cnt is 0 and avail_cnt is 0.
        -- Update books table so total_copies and available_copies are 0, avoiding stale values.
        UPDATE public.books
        SET 
            total_copies = total_cnt,
            available_copies = avail_cnt,
            availability_status = CASE 
                WHEN avail_cnt > 0 THEN 'available' 
                WHEN total_cnt > 0 THEN 'borrowed' 
                ELSE 'maintenance' 
            END,
            updated_at = now()
        WHERE id = p_book_id;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_book_copy_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_book_id UUID;
    v_new_book_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_old_book_id := OLD.book_id;
        v_new_book_id := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_book_id := NULL;
        v_new_book_id := NEW.book_id;
    ELSE -- UPDATE
        v_old_book_id := OLD.book_id;
        v_new_book_id := NEW.book_id;
    END IF;

    IF v_old_book_id IS NOT NULL AND (v_new_book_id IS NULL OR v_old_book_id IS DISTINCT FROM v_new_book_id) THEN
        PERFORM public.recalculate_book_counts(v_old_book_id);
    END IF;

    IF v_new_book_id IS NOT NULL THEN
        PERFORM public.recalculate_book_counts(v_new_book_id);
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_book_copies ON public.book_copies;
CREATE TRIGGER trg_sync_book_copies
    AFTER INSERT OR UPDATE OR DELETE ON public.book_copies
    FOR EACH ROW EXECUTE FUNCTION public.sync_book_copy_counts();

-- ==============================================================================
-- 5. ATOMIC RPC: RESERVE BOOK
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.reserve_book_atomic(p_book_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_book RECORD;
    v_existing_reservation RECORD;
    v_active_res_count INT;
    v_has_copies BOOLEAN := false;
    v_target_copy_id UUID := NULL;
    v_reservation_id UUID;
    v_deadline TIMESTAMPTZ;
    v_result JSON;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required. Please sign in to reserve books.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_id AND is_active = true) THEN
        RAISE EXCEPTION 'Your account is inactive or not found. Please contact library staff.';
    END IF;

    SELECT * INTO v_book
    FROM public.books
    WHERE id = p_book_id AND is_archived = false
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book not found or has been archived.';
    END IF;

    SELECT id INTO v_existing_reservation
    FROM public.book_reservations
    WHERE book_id = p_book_id 
      AND user_id = v_caller_id 
      AND status IN ('reserved', 'ready_for_pickup')
    LIMIT 1;

    IF v_existing_reservation.id IS NOT NULL THEN
        RAISE EXCEPTION 'You already have an active reservation for this book.';
    END IF;

    SELECT COUNT(*) INTO v_active_res_count
    FROM public.book_reservations
    WHERE user_id = v_caller_id AND status IN ('reserved', 'ready_for_pickup');

    IF v_active_res_count >= 3 THEN
        RAISE EXCEPTION 'You have reached the maximum limit of 3 active reservations.';
    END IF;

    SELECT (v_book.has_copy_records OR EXISTS (SELECT 1 FROM public.book_copies WHERE book_id = p_book_id)) INTO v_has_copies;

    IF v_has_copies THEN
        SELECT id INTO v_target_copy_id
        FROM public.book_copies
        WHERE book_id = p_book_id AND status = 'available'
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF v_target_copy_id IS NULL THEN
            RAISE EXCEPTION 'All copies of this book are currently reserved or checked out. Please join the waiting list.';
        END IF;

        UPDATE public.book_copies
        SET status = 'reserved', updated_at = now()
        WHERE id = v_target_copy_id;
    ELSE
        IF v_book.available_copies <= 0 OR v_book.availability_status != 'available' THEN
            RAISE EXCEPTION 'This book is currently unavailable. Please join the waiting list.';
        END IF;

        UPDATE public.books
        SET 
            available_copies = GREATEST(0, available_copies - 1),
            availability_status = CASE 
                WHEN (available_copies - 1) <= 0 THEN 'borrowed' 
                ELSE 'available' 
            END,
            updated_at = now()
        WHERE id = p_book_id;
    END IF;

    v_deadline := now() + INTERVAL '48 hours';

    INSERT INTO public.book_reservations (
        user_id,
        book_id,
        copy_id,
        reserved_at,
        collection_deadline,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_caller_id,
        p_book_id,
        v_target_copy_id,
        now(),
        v_deadline,
        'reserved',
        now(),
        now()
    )
    RETURNING id INTO v_reservation_id;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        v_caller_id,
        'Book Reservation Confirmed',
        'Your reservation for "' || v_book.title || '" is confirmed. Please collect it from the library within 48 hours.',
        'collection_reminder',
        false,
        now()
    );

    SELECT json_build_object(
        'id', v_reservation_id,
        'book_id', p_book_id,
        'user_id', v_caller_id,
        'copy_id', v_target_copy_id,
        'collection_deadline', v_deadline,
        'status', 'reserved',
        'book_title', v_book.title
    ) INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_book_atomic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_book_atomic(UUID) TO authenticated;

-- ==============================================================================
-- 6. ATOMIC RPC: CANCEL RESERVATION (With Atomic Queue Allocation)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cancel_reservation_atomic(
    p_reservation_id UUID,
    p_reason TEXT DEFAULT 'Cancelled by user'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_res RECORD;
    v_book RECORD;
    v_copy RECORD;
    v_next_queue RECORD;
    v_has_copies BOOLEAN := false;
    v_copy_is_usable BOOLEAN := true;
    v_new_res_id UUID;
    v_queue_deadline TIMESTAMPTZ;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_res
    FROM public.book_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found.';
    END IF;

    IF v_res.user_id != v_caller_id AND NOT public.is_staff(v_caller_id) THEN
        RAISE EXCEPTION 'Permission denied. You can only cancel your own reservations.';
    END IF;

    IF v_res.status NOT IN ('reserved', 'ready_for_pickup') THEN
        RAISE EXCEPTION 'This reservation cannot be cancelled as it is already %.', v_res.status;
    END IF;

    UPDATE public.book_reservations
    SET 
        status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_reservation_id;

    SELECT * INTO v_book FROM public.books WHERE id = v_res.book_id;
    SELECT (v_book.has_copy_records OR EXISTS (SELECT 1 FROM public.book_copies WHERE book_id = v_res.book_id)) INTO v_has_copies;

    -- Evaluate physical copy condition if one was assigned
    IF v_res.copy_id IS NOT NULL THEN
        SELECT * INTO v_copy FROM public.book_copies WHERE id = v_res.copy_id;
        IF FOUND AND (v_copy.status IN ('damaged', 'lost', 'maintenance') OR v_copy.condition IN ('damaged', 'lost')) THEN
            v_copy_is_usable := false;
        END IF;
    END IF;

    -- Only usable copies may be allocated to waiting queue or made available
    IF v_copy_is_usable THEN
        -- Check if someone is waiting in the queue
        SELECT * INTO v_next_queue
        FROM public.book_queue
        WHERE book_id = v_res.book_id AND status = 'waiting'
        ORDER BY queue_position ASC, joined_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF v_next_queue.id IS NOT NULL THEN
            -- Atomic Queue Claim: Create a formal reservation for the next student with a 24h deadline
            v_queue_deadline := now() + INTERVAL '24 hours';

            INSERT INTO public.book_reservations (
                user_id,
                book_id,
                copy_id,
                reserved_at,
                collection_deadline,
                ready_at,
                status,
                created_at,
                updated_at
            ) VALUES (
                v_next_queue.user_id,
                v_res.book_id,
                v_res.copy_id,
                now(),
                v_queue_deadline,
                now(),
                'ready_for_pickup',
                now(),
                now()
            )
            RETURNING id INTO v_new_res_id;

            -- Mark waiting list entry completed
            UPDATE public.book_queue
            SET status = 'completed', completed_at = now(), updated_at = now()
            WHERE id = v_next_queue.id;

            -- Renumber remaining queue positions fairly
            UPDATE public.book_queue
            SET queue_position = queue_position - 1, updated_at = now()
            WHERE book_id = v_res.book_id AND status = 'waiting' AND queue_position > v_next_queue.queue_position;

            -- Notify waiting student
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                is_read,
                created_at
            ) VALUES (
                v_next_queue.user_id,
                'Waiting List Book Available!',
                'Good news! A copy of "' || v_book.title || '" has been reserved for you. Please collect it from the library within 24 hours.',
                'book_available',
                false,
                now()
            );
        ELSE
            -- No one waiting: return copy to available
            IF v_res.copy_id IS NOT NULL THEN
                UPDATE public.book_copies
                SET status = 'available', updated_at = now()
                WHERE id = v_res.copy_id;
            ELSIF NOT v_has_copies THEN
                UPDATE public.books
                SET 
                    available_copies = available_copies + 1,
                    availability_status = 'available',
                    updated_at = now()
                WHERE id = v_res.book_id;
            END IF;
        END IF;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        v_res.user_id,
        'Reservation Cancelled',
        'Your reservation for "' || v_book.title || '" has been cancelled.',
        'system',
        false,
        now()
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Reservation cancelled successfully',
        'reservation_id', p_reservation_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_reservation_atomic(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_reservation_atomic(UUID, TEXT) TO authenticated;

-- ==============================================================================
-- 7. ATOMIC RPC: JOIN BOOK QUEUE (WAITING LIST)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.join_book_queue_atomic(p_book_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_book RECORD;
    v_existing_entry RECORD;
    v_next_pos INT;
    v_queue_id UUID;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_book FROM public.books WHERE id = p_book_id AND is_archived = false;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book not found or has been archived.';
    END IF;

    IF v_book.availability_status = 'available' AND v_book.available_copies > 0 THEN
        RAISE EXCEPTION 'This book is currently available. You can reserve it directly without joining the queue.';
    END IF;

    SELECT id INTO v_existing_entry
    FROM public.book_queue
    WHERE book_id = p_book_id AND user_id = v_caller_id AND status = 'waiting'
    LIMIT 1;

    IF v_existing_entry.id IS NOT NULL THEN
        RAISE EXCEPTION 'You are already in the waiting list for this book.';
    END IF;

    -- Calculate next fair position
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_next_pos
    FROM public.book_queue
    WHERE book_id = p_book_id AND status = 'waiting';

    INSERT INTO public.book_queue (
        user_id,
        book_id,
        queue_position,
        estimated_wait_days,
        notify_enabled,
        status,
        joined_at,
        created_at,
        updated_at
    ) VALUES (
        v_caller_id,
        p_book_id,
        v_next_pos,
        v_next_pos * 4,
        true,
        'waiting',
        now(),
        now(),
        now()
    )
    RETURNING id INTO v_queue_id;

    RETURN json_build_object(
        'success', true,
        'queue_id', v_queue_id,
        'queue_position', v_next_pos,
        'book_title', v_book.title
    );
END;
$$;

REVOKE ALL ON FUNCTION public.join_book_queue_atomic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_book_queue_atomic(UUID) TO authenticated;

-- ==============================================================================
-- 8. ATOMIC RPC: LEAVE BOOK QUEUE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.leave_book_queue_atomic(p_queue_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_entry RECORD;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_entry
    FROM public.book_queue
    WHERE id = p_queue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Queue entry not found.';
    END IF;

    IF v_entry.user_id != v_caller_id AND NOT public.is_staff(v_caller_id) THEN
        RAISE EXCEPTION 'Permission denied. You can only leave your own waiting list spot.';
    END IF;

    UPDATE public.book_queue
    SET status = 'cancelled', cancelled_at = now(), updated_at = now()
    WHERE id = p_queue_id;

    -- Renumber subsequent positions fairly
    UPDATE public.book_queue
    SET queue_position = queue_position - 1, updated_at = now()
    WHERE book_id = v_entry.book_id 
      AND status = 'waiting' 
      AND queue_position > v_entry.queue_position;

    RETURN json_build_object('success', true, 'queue_id', p_queue_id);
END;
$$;

REVOKE ALL ON FUNCTION public.leave_book_queue_atomic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_book_queue_atomic(UUID) TO authenticated;

-- ==============================================================================
-- 9. STAFF CIRCULATION RPC: MARK RESERVATION READY FOR PICKUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.mark_reservation_ready_for_pickup(p_reservation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_res RECORD;
    v_book RECORD;
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        RAISE EXCEPTION 'Access denied. Library staff privileges required.';
    END IF;

    SELECT * INTO v_res FROM public.book_reservations WHERE id = p_reservation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found.';
    END IF;

    IF v_res.status != 'reserved' THEN
        RAISE EXCEPTION 'Reservation is currently % and cannot be marked ready.', v_res.status;
    END IF;

    SELECT * INTO v_book FROM public.books WHERE id = v_res.book_id;

    UPDATE public.book_reservations
    SET 
        status = 'ready_for_pickup',
        ready_at = now(),
        processed_by = v_caller_id,
        updated_at = now()
    WHERE id = p_reservation_id;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        v_res.user_id,
        'Book Ready for Pickup!',
        'Your reserved book "' || v_book.title || '" is now ready at the SLIIT Library front circulation counter.',
        'collection_reminder',
        false,
        now()
    );

    RETURN json_build_object('success', true, 'status', 'ready_for_pickup');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_reservation_ready_for_pickup(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_reservation_ready_for_pickup(UUID) TO authenticated;

-- ==============================================================================
-- 10. STAFF CIRCULATION RPC: ISSUE BOOK LOAN (Strict Verification)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.issue_book_loan(
    p_book_id UUID,
    p_student_id UUID,
    p_due_days INT,
    p_copy_id UUID DEFAULT NULL,
    p_reservation_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_book RECORD;
    v_student RECORD;
    v_target_copy RECORD;
    v_due_date TIMESTAMPTZ;
    v_loan_id UUID;
    v_res RECORD;
    v_resolved_copy_id UUID := p_copy_id;
    v_matched_res_id UUID := p_reservation_id;
    v_res_found BOOLEAN := false;
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        RAISE EXCEPTION 'Access denied. Library staff privileges required.';
    END IF;

    SELECT * INTO v_book FROM public.books WHERE id = p_book_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book not found.';
    END IF;

    SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id;
    IF NOT FOUND OR v_student.is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Student account not found or is currently inactive.';
    END IF;

    -- Validate reservation if explicitly provided
    IF p_reservation_id IS NOT NULL THEN
        SELECT * INTO v_res FROM public.book_reservations WHERE id = p_reservation_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Specified reservation record not found.';
        END IF;

        v_res_found := true;
        v_matched_res_id := v_res.id;

        IF v_res.user_id != p_student_id THEN
            RAISE EXCEPTION 'Reservation % belongs to a different student.', p_reservation_id;
        END IF;

        IF v_res.book_id != p_book_id THEN
            RAISE EXCEPTION 'Reservation % is for a different book title.', p_reservation_id;
        END IF;

        IF v_res.status NOT IN ('reserved', 'ready_for_pickup') THEN
            RAISE EXCEPTION 'Reservation is currently % and cannot be issued.', v_res.status;
        END IF;

        IF v_res.copy_id IS NOT NULL THEN
            IF v_resolved_copy_id IS NOT NULL AND v_resolved_copy_id != v_res.copy_id THEN
                RAISE EXCEPTION 'Selected physical copy does not match the copy allocated to this reservation.';
            END IF;
            v_resolved_copy_id := v_res.copy_id;
        END IF;
    ELSE
        -- Safe matching when p_reservation_id is NULL: search for eligible reservation
        IF v_resolved_copy_id IS NOT NULL THEN
            SELECT * INTO v_res FROM public.book_reservations
            WHERE book_id = p_book_id AND user_id = p_student_id AND copy_id = v_resolved_copy_id AND status IN ('reserved', 'ready_for_pickup')
            LIMIT 1
            FOR UPDATE;

            IF FOUND THEN
                v_res_found := true;
                v_matched_res_id := v_res.id;
            END IF;
        END IF;

        IF NOT v_res_found THEN
            SELECT * INTO v_res FROM public.book_reservations
            WHERE book_id = p_book_id AND user_id = p_student_id AND status IN ('reserved', 'ready_for_pickup')
            ORDER BY reserved_at ASC
            LIMIT 1
            FOR UPDATE;

            IF FOUND THEN
                v_res_found := true;
                v_matched_res_id := v_res.id;
                IF v_res.copy_id IS NOT NULL AND v_resolved_copy_id IS NULL THEN
                    v_resolved_copy_id := v_res.copy_id;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Physical copy validation
    IF v_resolved_copy_id IS NOT NULL THEN
        SELECT * INTO v_target_copy FROM public.book_copies WHERE id = v_resolved_copy_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected physical copy not found.';
        END IF;

        IF v_target_copy.book_id != p_book_id THEN
            RAISE EXCEPTION 'Copy % does not belong to "%".', v_target_copy.copy_number, v_book.title;
        END IF;

        IF v_target_copy.status = 'borrowed' THEN
            RAISE EXCEPTION 'Copy % is already on loan.', v_target_copy.copy_number;
        END IF;

        IF v_target_copy.status IN ('damaged', 'lost', 'maintenance') THEN
            RAISE EXCEPTION 'Copy % is currently in % status and cannot be issued.', v_target_copy.copy_number, v_target_copy.status;
        END IF;

        -- If copy is marked reserved, verify it belongs to this student's active reservation
        IF v_target_copy.status = 'reserved' THEN
            IF NOT v_res_found OR v_res.user_id != p_student_id THEN
                DECLARE
                    v_other_res RECORD;
                BEGIN
                    SELECT * INTO v_other_res FROM public.book_reservations
                    WHERE copy_id = v_resolved_copy_id AND status IN ('reserved', 'ready_for_pickup')
                    LIMIT 1;

                    IF FOUND AND v_other_res.user_id != p_student_id THEN
                        RAISE EXCEPTION 'Copy % is reserved for a different student.', v_target_copy.copy_number;
                    ELSIF NOT FOUND THEN
                        RAISE EXCEPTION 'Copy % is marked reserved but has no active reservation record.', v_target_copy.copy_number;
                    END IF;
                END;
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM public.borrowed_books WHERE copy_id = v_resolved_copy_id AND status = 'borrowed') THEN
            RAISE EXCEPTION 'Physical copy % is already recorded in an active loan.', v_target_copy.copy_number;
        END IF;

        UPDATE public.book_copies
        SET status = 'borrowed', updated_at = now()
        WHERE id = v_resolved_copy_id;
    ELSE
        -- Auto-allocate: select genuinely available copies IF book has physical copy records
        IF v_book.has_copy_records OR EXISTS (SELECT 1 FROM public.book_copies WHERE book_id = p_book_id) THEN
            SELECT * INTO v_target_copy 
            FROM public.book_copies 
            WHERE book_id = p_book_id AND status = 'available'
            LIMIT 1
            FOR UPDATE SKIP LOCKED;

            IF v_target_copy.id IS NOT NULL THEN
                v_resolved_copy_id := v_target_copy.id;
                UPDATE public.book_copies
                SET status = 'borrowed', updated_at = now()
                WHERE id = v_resolved_copy_id;
            ELSE
                RAISE EXCEPTION 'No unreserved copies of "%" are currently available to issue.', v_book.title;
            END IF;
        ELSE
            -- Legacy catalog book without physical copy records: decrement available_copies directly
            IF v_book.available_copies <= 0 THEN
                RAISE EXCEPTION 'No copies of legacy book "%" are currently available to issue.', v_book.title;
            END IF;

            UPDATE public.books
            SET 
                available_copies = GREATEST(0, available_copies - 1),
                availability_status = CASE 
                    WHEN (available_copies - 1) <= 0 THEN 'borrowed' 
                    ELSE 'available' 
                END,
                updated_at = now()
            WHERE id = p_book_id;
        END IF;
    END IF;

    v_due_date := now() + (INTERVAL '1 day' * GREATEST(1, p_due_days));

    INSERT INTO public.borrowed_books (
        user_id,
        book_id,
        copy_id,
        issued_by,
        borrowed_date,
        due_date,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_student_id,
        p_book_id,
        v_resolved_copy_id,
        v_caller_id,
        now(),
        v_due_date,
        'borrowed',
        now(),
        now()
    )
    RETURNING id INTO v_loan_id;

    -- Complete strictly the matched reservation. Never blanket-update!
    IF v_res_found AND v_matched_res_id IS NOT NULL THEN
        UPDATE public.book_reservations
        SET 
            status = 'collected',
            collected_at = now(),
            processed_by = v_caller_id,
            updated_at = now()
        WHERE id = v_matched_res_id;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        p_student_id,
        'Book Issued Successfully',
        'You have borrowed "' || v_book.title || '". Please return it on or before ' || to_char(v_due_date, 'YYYY-MM-DD') || '.',
        'due_date',
        false,
        now()
    );

    RETURN json_build_object(
        'success', true,
        'loan_id', v_loan_id,
        'due_date', v_due_date,
        'book_title', v_book.title
    );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_book_loan(UUID, UUID, INT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_book_loan(UUID, UUID, INT, UUID, UUID) TO authenticated;

-- ==============================================================================
-- 11. STAFF CIRCULATION RPC: RETURN BOOK LOAN (Atomic Queue Allocation)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.return_book_loan(
    p_loan_id UUID,
    p_condition VARCHAR DEFAULT 'good',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_loan RECORD;
    v_book RECORD;
    v_next_queue RECORD;
    v_queue_deadline TIMESTAMPTZ;
    v_new_res_id UUID;
    v_is_usable BOOLEAN := true;
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        RAISE EXCEPTION 'Access denied. Library staff privileges required.';
    END IF;

    SELECT * INTO v_loan
    FROM public.borrowed_books
    WHERE id = p_loan_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loan record not found.';
    END IF;

    IF v_loan.status = 'returned' THEN
        RAISE EXCEPTION 'This book loan has already been closed.';
    END IF;

    SELECT * INTO v_book FROM public.books WHERE id = v_loan.book_id FOR UPDATE;

    -- Evaluate usability based on physical condition
    IF p_condition IN ('damaged', 'lost') THEN
        v_is_usable := false;
    END IF;

    UPDATE public.borrowed_books
    SET 
        status = 'returned',
        returned_at = now(),
        received_by = v_caller_id,
        notes = p_notes,
        updated_at = now()
    WHERE id = p_loan_id;

    IF v_loan.copy_id IS NOT NULL THEN
        IF NOT v_is_usable THEN
            -- Unusable (damaged / lost): Update copy status accordingly.
            -- NEVER make available, and NEVER allocate to waiting queue.
            UPDATE public.book_copies
            SET 
                status = p_condition, -- 'damaged' or 'lost'
                condition = p_condition,
                notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes || E'\n', '') || p_notes ELSE notes END,
                updated_at = now()
            WHERE id = v_loan.copy_id;
        ELSE
            -- Usable copy: Check if someone in book_queue is waiting
            SELECT * INTO v_next_queue
            FROM public.book_queue
            WHERE book_id = v_loan.book_id AND status = 'waiting'
            ORDER BY queue_position ASC, joined_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED;

            IF v_next_queue.id IS NOT NULL THEN
                -- Atomic Queue Claim: Create formal reservation with a 24h collection window
                v_queue_deadline := now() + INTERVAL '24 hours';

                UPDATE public.book_copies
                SET status = 'reserved', condition = COALESCE(p_condition, condition), updated_at = now()
                WHERE id = v_loan.copy_id;

                INSERT INTO public.book_reservations (
                    user_id,
                    book_id,
                    copy_id,
                    reserved_at,
                    collection_deadline,
                    ready_at,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    v_next_queue.user_id,
                    v_loan.book_id,
                    v_loan.copy_id,
                    now(),
                    v_queue_deadline,
                    now(),
                    'ready_for_pickup',
                    now(),
                    now()
                )
                RETURNING id INTO v_new_res_id;

                UPDATE public.book_queue
                SET status = 'completed', completed_at = now(), updated_at = now()
                WHERE id = v_next_queue.id;

                -- Renumber remaining queue positions fairly
                UPDATE public.book_queue
                SET queue_position = queue_position - 1, updated_at = now()
                WHERE book_id = v_loan.book_id AND status = 'waiting' AND queue_position > v_next_queue.queue_position;

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    type,
                    is_read,
                    created_at
                ) VALUES (
                    v_next_queue.user_id,
                    'Book Available for Reservation',
                    'Good news! A returned copy of "' || v_book.title || '" has been allocated to you. Please collect it within 24 hours.',
                    'book_available',
                    false,
                    now()
                );
            ELSE
                -- No one waiting: mark available
                UPDATE public.book_copies
                SET status = 'available', condition = COALESCE(p_condition, condition), updated_at = now()
                WHERE id = v_loan.copy_id;
            END IF;
        END IF;
    ELSE
        -- Legacy catalog book without physical copy records
        IF NOT v_is_usable THEN
            IF p_condition = 'lost' THEN
                UPDATE public.books
                SET total_copies = GREATEST(0, total_copies - 1), updated_at = now()
                WHERE id = v_loan.book_id;
            END IF;
        ELSE
            SELECT * INTO v_next_queue
            FROM public.book_queue
            WHERE book_id = v_loan.book_id AND status = 'waiting'
            ORDER BY queue_position ASC, joined_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED;

            IF v_next_queue.id IS NOT NULL THEN
                v_queue_deadline := now() + INTERVAL '24 hours';

                INSERT INTO public.book_reservations (
                    user_id,
                    book_id,
                    copy_id,
                    reserved_at,
                    collection_deadline,
                    ready_at,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    v_next_queue.user_id,
                    v_loan.book_id,
                    NULL,
                    now(),
                    v_queue_deadline,
                    now(),
                    'ready_for_pickup',
                    now(),
                    now()
                )
                RETURNING id INTO v_new_res_id;

                UPDATE public.book_queue
                SET status = 'completed', completed_at = now(), updated_at = now()
                WHERE id = v_next_queue.id;

                UPDATE public.book_queue
                SET queue_position = queue_position - 1, updated_at = now()
                WHERE book_id = v_loan.book_id AND status = 'waiting' AND queue_position > v_next_queue.queue_position;

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    type,
                    is_read,
                    created_at
                ) VALUES (
                    v_next_queue.user_id,
                    'Book Available for Reservation',
                    'Good news! A returned copy of "' || v_book.title || '" has been allocated to you. Please collect it within 24 hours.',
                    'book_available',
                    false,
                    now()
                );
            ELSE
                UPDATE public.books
                SET 
                    available_copies = available_copies + 1,
                    availability_status = 'available',
                    updated_at = now()
                WHERE id = v_loan.book_id;
            END IF;
        END IF;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        v_loan.user_id,
        'Book Return Confirmed',
        'Your return of "' || v_book.title || '" has been processed. Thank you!',
        'system',
        false,
        now()
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Book return recorded successfully',
        'condition', p_condition,
        'is_usable', v_is_usable,
        'book_title', v_book.title
    );
END;
$$;

REVOKE ALL ON FUNCTION public.return_book_loan(UUID, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.return_book_loan(UUID, VARCHAR, TEXT) TO authenticated;

-- ==============================================================================
-- 12. ATOMIC RPC: BOOK STUDY / CONFERENCE ROOM (Enforces SLIIT University Rules)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.book_study_room_atomic(
    p_room_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_participants INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_room RECORD;
    v_user RECORD;
    v_booking_id UUID;
    v_sl_now TIMESTAMPTZ := now() AT TIME ZONE 'Asia/Colombo';
    v_sl_date DATE := (now() AT TIME ZONE 'Asia/Colombo')::DATE;
    v_sl_time TIME := (now() AT TIME ZONE 'Asia/Colombo')::TIME;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id AND is_archived = false;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found or has been archived.';
    END IF;

    IF v_room.status != 'available' THEN
        RAISE EXCEPTION 'This room is currently % and unavailable for bookings.', v_room.status;
    END IF;

    SELECT * INTO v_user FROM public.profiles WHERE id = v_caller_id;

    -- SLIIT Rule 1: Conference rooms are strictly for staff (min 10)
    IF v_room.room_type = 'conference_room' THEN
        IF v_user.role NOT IN ('staff', 'admin') THEN
            RAISE EXCEPTION 'Conference rooms are reserved for lecturers and academic staff only.';
        END IF;
        IF p_participants < 10 THEN
            RAISE EXCEPTION 'Conference room bookings require a minimum of 10 staff participants.';
        END IF;
    ELSE
        -- SLIIT Rule 2: Study rooms require min 5 students
        IF p_participants < 5 THEN
            RAISE EXCEPTION 'Study room bookings require a minimum of 5 student participants.';
        END IF;
    END IF;

    -- SLIIT Rule 3: Participants must not exceed room capacity
    IF p_participants > v_room.capacity THEN
        RAISE EXCEPTION 'Participant count (%) exceeds maximum room capacity of %.', p_participants, v_room.capacity;
    END IF;

    -- SLIIT Rule 4: Schedule validation against Sri Lanka Standard Time (Asia/Colombo, UTC+05:30)
    IF p_date < v_sl_date THEN
        RAISE EXCEPTION 'Cannot book a date in the past (Sri Lanka Standard Time).';
    END IF;

    IF p_date = v_sl_date AND p_start_time <= v_sl_time THEN
        RAISE EXCEPTION 'The requested start time has already passed (Sri Lanka Standard Time: % on %).',
            to_char(v_sl_time, 'HH24:MI'), to_char(v_sl_date, 'YYYY-MM-DD');
    END IF;

    IF p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'End time must be after start time.';
    END IF;

    -- Database GiST exclusion constraint guarantees zero overlapping active bookings
    INSERT INTO public.room_bookings (
        user_id,
        room_id,
        booking_date,
        start_time,
        end_time,
        participants,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_caller_id,
        p_room_id,
        p_date,
        p_start_time,
        p_end_time,
        p_participants,
        'active',
        now(),
        now()
    )
    RETURNING id INTO v_booking_id;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        v_caller_id,
        'Study Space Booking Confirmed',
        'Your booking for ' || v_room.name || ' on ' || to_char(p_date, 'YYYY-MM-DD') || ' (' || to_char(p_start_time, 'HH24:MI') || ' - ' || to_char(p_end_time, 'HH24:MI') || ') is confirmed.',
        'room_booking',
        false,
        now()
    );

    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'room_name', v_room.name,
        'booking_date', p_date,
        'start_time', p_start_time,
        'end_time', p_end_time
    );
EXCEPTION
    WHEN exclusion_violation THEN
        RAISE EXCEPTION 'This room is already booked for that time window. Please choose another slot.';
END;
$$;

REVOKE ALL ON FUNCTION public.book_study_room_atomic(UUID, DATE, TIME, TIME, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_study_room_atomic(UUID, DATE, TIME, TIME, INT) TO authenticated;

-- ==============================================================================
-- 13. ATOMIC RPC: CANCEL ROOM BOOKING
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cancel_room_booking_atomic(
    p_booking_id UUID,
    p_reason TEXT DEFAULT 'Cancelled by user'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_booking RECORD;
    v_room RECORD;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_booking
    FROM public.room_bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found.';
    END IF;

    IF v_booking.user_id != v_caller_id AND NOT public.is_staff(v_caller_id) THEN
        RAISE EXCEPTION 'Permission denied. You can only cancel your own bookings.';
    END IF;

    IF v_booking.status != 'active' THEN
        RAISE EXCEPTION 'Booking is already %.', v_booking.status;
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = v_booking.room_id;

    UPDATE public.room_bookings
    SET 
        status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_booking_id;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        v_booking.user_id,
        'Room Booking Cancelled',
        'Your booking for ' || v_room.name || ' on ' || to_char(v_booking.booking_date, 'YYYY-MM-DD') || ' has been cancelled.',
        'room_booking',
        false,
        now()
    );

    RETURN json_build_object('success', true, 'booking_id', p_booking_id);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_room_booking_atomic(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_room_booking_atomic(UUID, TEXT) TO authenticated;

-- ==============================================================================
-- 14. ADMINISTRATIVE RPC: MIGRATE LEGACY BOOKS TO PHYSICAL COPIES (Safe Backfill)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.migrate_legacy_book_copies(
    p_book_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_book RECORD;
    v_created_total INT := 0;
    v_i INT;
    v_copy_num VARCHAR(50);
BEGIN
    IF NOT public.is_staff(v_caller_id) THEN
        RAISE EXCEPTION 'Access denied. Library staff privileges required.';
    END IF;

    FOR v_book IN (
        SELECT * FROM public.books
        WHERE (p_book_id IS NULL OR id = p_book_id)
          AND (has_copy_records = false OR NOT EXISTS (SELECT 1 FROM public.book_copies WHERE book_id = id))
    ) LOOP
        FOR v_i IN 1..GREATEST(1, v_book.total_copies) LOOP
            v_copy_num := 'C-' || lpad(v_i::text, 2, '0');

            INSERT INTO public.book_copies (
                book_id,
                copy_number,
                condition,
                status,
                shelf_location
            ) VALUES (
                v_book.id,
                v_copy_num,
                'good',
                CASE WHEN v_i <= v_book.available_copies THEN 'available' ELSE 'borrowed' END,
                v_book.shelf_location
            ) ON CONFLICT (book_id, copy_number) DO NOTHING;

            v_created_total := v_created_total + 1;
        END LOOP;

        UPDATE public.books SET has_copy_records = true WHERE id = v_book.id;
        PERFORM public.recalculate_book_counts(v_book.id);
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'copies_created', v_created_total
    );
END;
$$;

REVOKE ALL ON FUNCTION public.migrate_legacy_book_copies(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.migrate_legacy_book_copies(UUID) TO authenticated;

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

-- DIRECT STUDENT INSERT/UPDATE IS PROHIBITED.
-- Reservations MUST be created via reserve_book_atomic() and cancelled via cancel_reservation_atomic().
-- Only authorized staff can directly manage reservation rows.
CREATE POLICY "reservations_staff_manage"
ON public.book_reservations FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ==============================================================================
-- 7. POLICIES: BOOK QUEUE (WAITING LIST - ATOMIC OPERATIONS ONLY)
-- ==============================================================================
-- Students must join via join_book_queue_atomic() and leave via leave_book_queue_atomic().
-- DIRECT STUDENT INSERT, UPDATE, AND DELETE ARE STRICTLY PROHIBITED to prevent queue corruption.

-- Students can view their own queue spots, staff can view all
CREATE POLICY "queue_select"
ON public.book_queue FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Direct INSERT restricted to staff (students MUST call join_book_queue_atomic)
CREATE POLICY "queue_staff_insert"
ON public.book_queue FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- Direct UPDATE restricted to staff
CREATE POLICY "queue_staff_update"
ON public.book_queue FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Direct DELETE restricted to staff (students MUST call leave_book_queue_atomic)
CREATE POLICY "queue_staff_delete"
ON public.book_queue FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

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

-- DIRECT STUDENT INSERT/UPDATE IS PROHIBITED.
-- Bookings MUST be created via book_study_room_atomic() and cancelled via cancel_room_booking_atomic().
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
