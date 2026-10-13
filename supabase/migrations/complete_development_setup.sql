-- ==============================================================================
-- SLIIT LIBRARY MANAGEMENT SYSTEM — MASTER DEVELOPMENT SETUP SCRIPT
-- Role-Based Student, Staff, and Admin Platform
-- ==============================================================================
-- This script configures a fresh Supabase project for development.
-- It establishes:
-- 1. All core and enhanced database tables
-- 2. PostgreSQL extensions and immutable helper functions
-- 3. Atomic business functions and database security triggers
-- 4. GiST exclusion constraints for overlapping room booking prevention
-- 5. Strict Row-Level Security (RLS) policies
-- 6. Storage buckets and access policies for avatars, book covers, and room images
-- 7. Realistic seed data for development (books, physical copies, rooms, announcements)
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
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
-- 3. CORE TABLES
-- ==============================================================================

-- 3.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(255) UNIQUE,
    student_id VARCHAR(50),
    phone_number VARCHAR(30),
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    department VARCHAR(100),
    academic_year VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
            CHECK (role IN ('student', 'staff', 'admin'));
    END IF;
END $$;

-- 3.2 BOOKS TABLE
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    edition VARCHAR(50),
    cover_url TEXT,
    isbn VARCHAR(50),
    publisher VARCHAR(255),
    publication_year INT,
    shelf_location VARCHAR(100),
    language VARCHAR(50) DEFAULT 'English',
    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    has_copy_records BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_availability_check') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_availability_check 
            CHECK (availability_status IN ('available', 'borrowed', 'reserved', 'maintenance'));
    END IF;
END $$;

-- 3.3 BOOK COPIES TABLE (Physical Inventory)
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
END $$;

-- 3.4 BOOK RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS public.book_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    copy_id UUID REFERENCES public.book_copies(id) ON DELETE SET NULL,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    collection_deadline TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'reserved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_reservations_status_check') THEN
        ALTER TABLE public.book_reservations ADD CONSTRAINT book_reservations_status_check 
            CHECK (status IN ('reserved', 'ready_for_pickup', 'collected', 'cancelled', 'expired'));
    END IF;
END $$;

-- 3.5 BOOK QUEUE (WAITING LIST)
CREATE TABLE IF NOT EXISTS public.book_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    queue_position INT DEFAULT 1,
    estimated_wait_days INT DEFAULT 4,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    notify_enabled BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_queue_status_check') THEN
        ALTER TABLE public.book_queue ADD CONSTRAINT book_queue_status_check 
            CHECK (status IN ('waiting', 'notified', 'completed', 'cancelled'));
    END IF;
END $$;

-- 3.6 BORROWED BOOKS (LOANS & CIRCULATION)
CREATE TABLE IF NOT EXISTS public.borrowed_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    copy_id UUID REFERENCES public.book_copies(id) ON DELETE SET NULL,
    issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    borrowed_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    renewal_count INT NOT NULL DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'borrowed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'borrowed_books_status_check') THEN
        ALTER TABLE public.borrowed_books ADD CONSTRAINT borrowed_books_status_check 
            CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost'));
    END IF;
END $$;

-- 3.7 ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    room_number VARCHAR(50),
    room_type VARCHAR(50) NOT NULL DEFAULT 'study_room',
    capacity INT NOT NULL DEFAULT 6,
    location VARCHAR(255),
    facilities TEXT[] DEFAULT ARRAY[]::TEXT[],
    description TEXT,
    image_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- 3.8 ROOM BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.room_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    participants INT NOT NULL DEFAULT 5,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_bookings_status_check') THEN
        ALTER TABLE public.room_bookings ADD CONSTRAINT room_bookings_status_check 
            CHECK (status IN ('active', 'completed', 'cancelled', 'rejected'));
    END IF;
END $$;

-- Room Booking Overlap Exclusion Constraint (GiST)
DO $$
BEGIN
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

-- 3.9 ANNOUNCEMENTS TABLE
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

-- 3.10 NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.11 RECENT SEARCHES TABLE
CREATE TABLE IF NOT EXISTS public.recent_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    search_term VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. PERFORMANCE INDEXES
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
-- 5. AUTHORIZATION AND SECURITY HELPERS
-- ==============================================================================

-- 5.1 IS_STAFF: checks if user has staff or admin role
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
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated, anon;

-- 5.2 IS_ADMIN: checks if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
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

    RETURN (user_role = 'admin' AND user_active IS TRUE);
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;

-- ==============================================================================
-- 6. AUTH TRIGGERS & INTEGRITY
-- ==============================================================================

-- 6.1 AUTO-CREATE PROFILE ON SIGNUP
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

        -- Role always defaults to student regardless of client metadata
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

-- 6.2 PROTECT PROFILE COLUMNS AGAINST PRIVILEGE ESCALATION
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

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- 6.3 SYNCHRONIZE PHYSICAL COPIES WITH BOOK COUNTS
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
    ELSE
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
-- 7. ATOMIC BUSINESS FUNCTIONS (RPCs)
-- ==============================================================================

-- 7.1 ATOMIC BOOK RESERVATION
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
GRANT EXECUTE ON FUNCTION public.reserve_book_atomic(UUID) TO authenticated;

-- 7.2 ATOMIC RESERVATION CANCELLATION (With Queue Reallocation)
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

    IF v_res.copy_id IS NOT NULL THEN
        SELECT * INTO v_copy FROM public.book_copies WHERE id = v_res.copy_id;
        IF FOUND AND (v_copy.status IN ('damaged', 'lost', 'maintenance') OR v_copy.condition IN ('damaged', 'lost')) THEN
            v_copy_is_usable := false;
        END IF;
    END IF;

    IF v_copy_is_usable THEN
        SELECT * INTO v_next_queue
        FROM public.book_queue
        WHERE book_id = v_res.book_id AND status = 'waiting'
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

            UPDATE public.book_queue
            SET status = 'completed', completed_at = now(), updated_at = now()
            WHERE id = v_next_queue.id;

            UPDATE public.book_queue
            SET queue_position = queue_position - 1, updated_at = now()
            WHERE book_id = v_res.book_id AND status = 'waiting' AND queue_position > v_next_queue.queue_position;

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
GRANT EXECUTE ON FUNCTION public.cancel_reservation_atomic(UUID, TEXT) TO authenticated;

-- 7.3 ATOMIC JOIN WAITING LIST QUEUE
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
GRANT EXECUTE ON FUNCTION public.join_book_queue_atomic(UUID) TO authenticated;

-- 7.4 ATOMIC LEAVE WAITING LIST QUEUE
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

    UPDATE public.book_queue
    SET queue_position = queue_position - 1, updated_at = now()
    WHERE book_id = v_entry.book_id 
      AND status = 'waiting' 
      AND queue_position > v_entry.queue_position;

    RETURN json_build_object('success', true, 'queue_id', p_queue_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.leave_book_queue_atomic(UUID) TO authenticated;

-- 7.5 EXPIRE OVERDUE RESERVATIONS
CREATE OR REPLACE FUNCTION public.expire_overdue_book_reservations()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_res RECORD;
    v_next_queue RECORD;
    v_queue_deadline TIMESTAMPTZ;
    v_has_copies BOOLEAN;
BEGIN
    FOR v_res IN (
        SELECT * FROM public.book_reservations
        WHERE status IN ('reserved', 'ready_for_pickup')
          AND collection_deadline IS NOT NULL
          AND collection_deadline < now()
        FOR UPDATE
    ) LOOP
        UPDATE public.book_reservations
        SET status = 'expired', updated_at = now()
        WHERE id = v_res.id;

        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            is_read,
            created_at
        ) VALUES (
            v_res.user_id,
            'Reservation Expired',
            'Your reservation collection deadline has passed and the reservation has expired.',
            'collection_reminder',
            false,
            now()
        );

        SELECT * INTO v_next_queue
        FROM public.book_queue
        WHERE book_id = v_res.book_id AND status = 'waiting'
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
                v_res.book_id,
                v_res.copy_id,
                now(),
                v_queue_deadline,
                now(),
                'ready_for_pickup',
                now(),
                now()
            );

            UPDATE public.book_queue
            SET status = 'completed', completed_at = now(), updated_at = now()
            WHERE id = v_next_queue.id;

            UPDATE public.book_queue
            SET queue_position = queue_position - 1, updated_at = now()
            WHERE book_id = v_res.book_id AND status = 'waiting' AND queue_position > v_next_queue.queue_position;

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
                'A copy of this book has become available and was reserved for you. Please collect it within 24 hours.',
                'book_available',
                false,
                now()
            );
        ELSE
            IF v_res.copy_id IS NOT NULL THEN
                UPDATE public.book_copies
                SET status = 'available', updated_at = now()
                WHERE id = v_res.copy_id;
            ELSE
                SELECT (has_copy_records OR EXISTS (SELECT 1 FROM public.book_copies WHERE book_id = v_res.book_id)) INTO v_has_copies FROM public.books WHERE id = v_res.book_id;
                IF NOT v_has_copies THEN
                    UPDATE public.books
                    SET available_copies = available_copies + 1,
                        availability_status = 'available',
                        updated_at = now()
                    WHERE id = v_res.book_id;
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.expire_overdue_book_reservations() TO authenticated, anon;

-- 7.6 STAFF RPC: MARK RESERVATION READY FOR PICKUP
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
        'Your reserved book "' || v_book.title || '" is now ready at the SLIIT Library circulation counter.',
        'collection_reminder',
        false,
        now()
    );

    RETURN json_build_object('success', true, 'status', 'ready_for_pickup');
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_reservation_ready_for_pickup(UUID) TO authenticated;

-- 7.7 STAFF RPC: ISSUE BOOK LOAN
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
            IF v_book.available_copies <= 0 THEN
                RAISE EXCEPTION 'No copies of book "%" are currently available to issue.', v_book.title;
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
GRANT EXECUTE ON FUNCTION public.issue_book_loan(UUID, UUID, INT, UUID, UUID) TO authenticated;

-- 7.8 STAFF RPC: RETURN BOOK LOAN
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
            UPDATE public.book_copies
            SET 
                status = p_condition,
                condition = p_condition,
                notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes || E'\n', '') || p_notes ELSE notes END,
                updated_at = now()
            WHERE id = v_loan.copy_id;
        ELSE
            SELECT * INTO v_next_queue
            FROM public.book_queue
            WHERE book_id = v_loan.book_id AND status = 'waiting'
            ORDER BY queue_position ASC, joined_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED;

            IF v_next_queue.id IS NOT NULL THEN
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
                UPDATE public.book_copies
                SET status = 'available', condition = COALESCE(p_condition, condition), updated_at = now()
                WHERE id = v_loan.copy_id;
            END IF;
        END IF;
    ELSE
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
GRANT EXECUTE ON FUNCTION public.return_book_loan(UUID, VARCHAR, TEXT) TO authenticated;

-- 7.9 ATOMIC ROOM BOOKING (SLIIT Rules Enforced)
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

    -- SLIIT Rule 3: Participants cannot exceed room capacity
    IF p_participants > v_room.capacity THEN
        RAISE EXCEPTION 'Participant count (%) exceeds maximum room capacity of %.', p_participants, v_room.capacity;
    END IF;

    -- SLIIT Rule 4: Schedule validation against Sri Lanka Standard Time (Asia/Colombo)
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
GRANT EXECUTE ON FUNCTION public.book_study_room_atomic(UUID, DATE, TIME, TIME, INT) TO authenticated;

-- 7.10 ATOMIC CANCEL ROOM BOOKING
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
GRANT EXECUTE ON FUNCTION public.cancel_room_booking_atomic(UUID, TEXT) TO authenticated;

-- 7.11 GET ROOM BUSY SLOTS (Cross-User Clash Prevention View)
CREATE OR REPLACE FUNCTION public.get_room_busy_slots(
    p_room_id UUID,
    p_date DATE
)
RETURNS TABLE (
    booking_id UUID,
    start_time TIME,
    end_time TIME,
    is_mine BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id AS booking_id,
        b.start_time,
        b.end_time,
        (b.user_id = auth.uid()) AS is_mine
    FROM public.room_bookings b
    WHERE b.room_id = p_room_id
      AND b.booking_date = p_date
      AND b.status = 'active'
    ORDER BY b.start_time ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_room_busy_slots(UUID, DATE) TO authenticated;

-- 7.12 PROVISION FIRST STAFF / ADMIN ACCOUNT
DROP FUNCTION IF EXISTS public.promote_to_staff(TEXT);
DROP FUNCTION IF EXISTS public.promote_to_staff(TEXT, TEXT);

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
REVOKE ALL ON FUNCTION public.promote_to_staff(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_staff(TEXT, TEXT) TO postgres, service_role;

-- 7.13 ADMIN ROLE PROVISIONING FUNCTION
CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id UUID, p_new_role VARCHAR)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF NOT public.is_admin(v_caller_id) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    IF p_new_role NOT IN ('student', 'staff', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %. Permitted roles: student, staff, admin.', p_new_role;
    END IF;

    UPDATE public.profiles
    SET role = p_new_role, updated_at = now()
    WHERE id = p_user_id;

    RETURN json_build_object('success', true, 'user_id', p_user_id, 'new_role', p_new_role);
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, VARCHAR) TO authenticated;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Dynamic drop of any older policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'profiles', 'books', 'book_copies', 'book_reservations',
              'room_bookings', 'borrowed_books', 'book_queue',
              'notifications', 'recent_searches', 'announcements', 'rooms'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 8.1 PROFILES POLICIES
CREATE POLICY "profiles_select_own_or_staff"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_staff(auth.uid()));

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_staff_manage"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.2 BOOKS POLICIES
CREATE POLICY "books_select_public"
ON public.books FOR SELECT
TO authenticated, anon
USING (is_archived = false OR public.is_staff(auth.uid()));

CREATE POLICY "books_staff_manage"
ON public.books FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.3 BOOK COPIES POLICIES
CREATE POLICY "book_copies_select"
ON public.book_copies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "book_copies_staff_manage"
ON public.book_copies FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.4 BOOK RESERVATIONS POLICIES
CREATE POLICY "reservations_select_own_or_staff"
ON public.book_reservations FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "reservations_staff_manage"
ON public.book_reservations FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.5 BOOK QUEUE POLICIES
CREATE POLICY "queue_select"
ON public.book_queue FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "queue_staff_manage"
ON public.book_queue FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.6 BORROWED BOOKS POLICIES
CREATE POLICY "loans_select_own_or_staff"
ON public.borrowed_books FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "loans_staff_manage"
ON public.borrowed_books FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.7 ROOMS POLICIES
CREATE POLICY "rooms_select_public"
ON public.rooms FOR SELECT
TO authenticated, anon
USING (is_archived = false OR public.is_staff(auth.uid()));

CREATE POLICY "rooms_staff_manage"
ON public.rooms FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.8 ROOM BOOKINGS POLICIES
CREATE POLICY "room_bookings_select_own_or_staff"
ON public.room_bookings FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "room_bookings_staff_manage"
ON public.room_bookings FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.9 ANNOUNCEMENTS POLICIES
CREATE POLICY "announcements_select_published"
ON public.announcements FOR SELECT
TO authenticated, anon
USING (is_published = true OR public.is_staff(auth.uid()));

CREATE POLICY "announcements_staff_manage"
ON public.announcements FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 8.10 NOTIFICATIONS POLICIES
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
ON public.notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_staff_insert"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- 8.11 RECENT SEARCHES POLICIES
CREATE POLICY "recent_searches_own"
ON public.recent_searches FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 9. STORAGE BUCKETS AND STORAGE POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-images', 'book-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view library images" ON storage.objects;
CREATE POLICY "Public can view library images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('profile-images', 'book-images', 'room-images'));

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-images' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Staff can upload library assets" ON storage.objects;
CREATE POLICY "Staff can upload library assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN ('book-images', 'room-images') 
    AND public.is_staff(auth.uid())
);

-- ==============================================================================
-- 10. REALISTIC DEVELOPMENT SEED DATA
-- ==============================================================================

-- 10.1 STUDY, COLLABORATIVE & CONFERENCE ROOMS
INSERT INTO public.rooms (
    id, name, room_number, room_type, capacity, location, facilities, description, status, image_url
) VALUES 
(
    '11111111-1111-1111-1111-111111111001',
    'Study Room A',
    'SR-A',
    'study_room',
    8,
    'Level 2, Library West Wing',
    ARRAY['Whiteboard', 'High-speed Wi-Fi', 'Power Outlets', 'Ergonomic Group Seating']::TEXT[],
    'Designated quiet space for student group study and collaborative assignments. Requires a minimum of 5 student participants.',
    'available',
    'https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg?auto=compress&cs=tinysrgb&w=800'
),
(
    '11111111-1111-1111-1111-111111111002',
    'Study Room B',
    'SR-B',
    'study_room',
    8,
    'Level 2, Library West Wing',
    ARRAY['Whiteboard', 'High-speed Wi-Fi', 'Power Outlets', 'LED Presentation Display']::TEXT[],
    'Equipped for interactive student project work and presentation practice. Requires a minimum of 5 student participants.',
    'available',
    'https://images.pexels.com/photos/260689/pexels-photo-260689.jpeg?auto=compress&cs=tinysrgb&w=800'
),
(
    '11111111-1111-1111-1111-111111111003',
    'Collaborative Room',
    'CR-01',
    'collaborative_space',
    10,
    'Level 3, Innovation Commons',
    ARRAY['Interactive Smart Screen', 'Modular Whiteboards', 'Wi-Fi 6', 'Movable Workstations', 'Power Hubs']::TEXT[],
    'Spacious collaborative environment for multi-disciplinary projects and group brainstorming. Requires a minimum of 5 student participants.',
    'available',
    'https://images.pexels.com/photos/3184328/pexels-photo-3184328.jpeg?auto=compress&cs=tinysrgb&w=800'
),
(
    '11111111-1111-1111-1111-111111111004',
    'Conference Room',
    'CONF-01',
    'conference_room',
    20,
    'Level 4, Academic & Administration Wing',
    ARRAY['4K Video Conferencing', 'Dual Projector Screens', 'Executive Seating', 'Conference Microphone Array', 'Wi-Fi']::TEXT[],
    'Executive conference boardroom reserved strictly for lecturers, academic faculty, and library staff. Requires a minimum of 10 staff participants.',
    'available',
    'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=800'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    room_number = EXCLUDED.room_number,
    room_type = EXCLUDED.room_type,
    capacity = EXCLUDED.capacity,
    location = EXCLUDED.location,
    facilities = EXCLUDED.facilities,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    image_url = EXCLUDED.image_url;

-- 10.2 REALISTIC BOOKS CATALOG
INSERT INTO public.books (
    id, title, author, category, description, edition, isbn, publisher, publication_year, shelf_location, total_copies, available_copies, availability_status, has_copy_records, cover_url
) VALUES
(
    '22222222-2222-2222-2222-222222222001',
    'Clean Code: A Handbook of Agile Software Craftsmanship',
    'Robert C. Martin',
    'Software Engineering',
    'Even bad code can function. But if code isn''t clean, it can bring a development organization to its knees. A timeless guide for every software professional.',
    '1st Edition',
    '978-0132350884',
    'Prentice Hall',
    2008,
    'Stack A - Shelf 01',
    3,
    3,
    'available',
    true,
    'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg'
),
(
    '22222222-2222-2222-2222-222222222002',
    'Design Patterns: Elements of Reusable Object-Oriented Software',
    'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
    'Computer Science',
    'Capturing a wealth of experience about the design of object-oriented software, four top-notch designers present a catalog of simple, concise solutions.',
    '1st Edition',
    '978-0201633610',
    'Addison-Wesley Professional',
    1994,
    'Stack A - Shelf 02',
    2,
    2,
    'available',
    true,
    'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg'
),
(
    '22222222-2222-2222-2222-222222222003',
    'Introduction to Algorithms',
    'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
    'Computer Science',
    'A comprehensive update of the leading algorithms text, with new material on matchings in bipartite graphs, online algorithms, and machine learning.',
    '4th Edition',
    '978-0262046305',
    'MIT Press',
    2022,
    'Stack B - Shelf 01',
    4,
    4,
    'available',
    true,
    'https://covers.openlibrary.org/b/isbn/9780262046305-L.jpg'
),
(
    '22222222-2222-2222-2222-222222222004',
    'Database System Concepts',
    'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
    'Database Systems',
    'The sixth edition of Database System Concepts continues to present a complete and clear understanding of modern database fundamentals and relational design.',
    '7th Edition',
    '978-0078022159',
    'McGraw-Hill',
    2019,
    'Stack B - Shelf 03',
    2,
    2,
    'available',
    true,
    'https://covers.openlibrary.org/b/isbn/9780078022159-L.jpg'
),
(
    '22222222-2222-2222-2222-222222222005',
    'Artificial Intelligence: A Modern Approach',
    'Stuart Russell, Peter Norvig',
    'Artificial Intelligence',
    'The standard textbook in artificial intelligence, covering state-of-the-art search, probabilistic reasoning, machine learning, and neural networks.',
    '4th Edition',
    '978-0134610993',
    'Pearson',
    2020,
    'Stack C - Shelf 01',
    3,
    3,
    'available',
    true,
    'https://covers.openlibrary.org/b/isbn/9780134610993-L.jpg'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    author = EXCLUDED.author,
    cover_url = EXCLUDED.cover_url;

-- 10.3 PHYSICAL BOOK COPIES
INSERT INTO public.book_copies (
    book_id, copy_number, barcode, condition, status, shelf_location
) VALUES
-- Clean Code copies
('22222222-2222-2222-2222-222222222001', 'C-01', 'BC-CC-01', 'new', 'available', 'Stack A - Shelf 01'),
('22222222-2222-2222-2222-222222222001', 'C-02', 'BC-CC-02', 'good', 'available', 'Stack A - Shelf 01'),
('22222222-2222-2222-2222-222222222001', 'C-03', 'BC-CC-03', 'good', 'available', 'Stack A - Shelf 01'),
-- Design Patterns copies
('22222222-2222-2222-2222-222222222002', 'C-01', 'BC-DP-01', 'good', 'available', 'Stack A - Shelf 02'),
('22222222-2222-2222-2222-222222222002', 'C-02', 'BC-DP-02', 'fair', 'available', 'Stack A - Shelf 02'),
-- Introduction to Algorithms copies
('22222222-2222-2222-2222-222222222003', 'C-01', 'BC-CLRS-01', 'new', 'available', 'Stack B - Shelf 01'),
('22222222-2222-2222-2222-222222222003', 'C-02', 'BC-CLRS-02', 'good', 'available', 'Stack B - Shelf 01'),
('22222222-2222-2222-2222-222222222003', 'C-03', 'BC-CLRS-03', 'good', 'available', 'Stack B - Shelf 01'),
('22222222-2222-2222-2222-222222222003', 'C-04', 'BC-CLRS-04', 'good', 'available', 'Stack B - Shelf 01'),
-- Database System Concepts copies
('22222222-2222-2222-2222-222222222004', 'C-01', 'BC-DBC-01', 'good', 'available', 'Stack B - Shelf 03'),
('22222222-2222-2222-2222-222222222004', 'C-02', 'BC-DBC-02', 'good', 'available', 'Stack B - Shelf 03'),
-- AI: A Modern Approach copies
('22222222-2222-2222-2222-222222222005', 'C-01', 'BC-AI-01', 'new', 'available', 'Stack C - Shelf 01'),
('22222222-2222-2222-2222-222222222005', 'C-02', 'BC-AI-02', 'good', 'available', 'Stack C - Shelf 01'),
('22222222-2222-2222-2222-222222222005', 'C-03', 'BC-AI-03', 'good', 'available', 'Stack C - Shelf 01')
ON CONFLICT (book_id, copy_number) DO NOTHING;

-- 10.4 TEMPLATE ANNOUNCEMENTS
INSERT INTO public.announcements (
    id, title, content, category, priority, is_published, published_at
) VALUES 
(
    '33333333-3333-3333-3333-333333333001',
    'SLIIT Library Semester Hours Update',
    'The main library at Malabe campus is open Monday to Friday from 08:00 AM to 08:00 PM, and Saturday from 08:30 AM to 04:30 PM. Group study rooms must be reserved in advance through this application.',
    'general',
    'normal',
    true,
    now()
),
(
    '33333333-3333-3333-3333-333333333002',
    'New Engineering & Computing Volumes Available',
    'We have added new editions of Core Computer Science, Software Architecture, and Distributed Systems texts. Explore the catalog and reserve copies now!',
    'books',
    'normal',
    true,
    now()
),
(
    '33333333-3333-3333-3333-333333333003',
    'Study Room Reservation Guidelines',
    'A reminder for students: Study room reservations require a minimum of 5 participants. Please ensure punctuality. Unclaimed slots will be automatically cancelled after 15 minutes.',
    'general',
    'high',
    true,
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Recalculate book counts
SELECT public.recalculate_book_counts('22222222-2222-2222-2222-222222222001'::UUID);
SELECT public.recalculate_book_counts('22222222-2222-2222-2222-222222222002'::UUID);
SELECT public.recalculate_book_counts('22222222-2222-2222-2222-222222222003'::UUID);
SELECT public.recalculate_book_counts('22222222-2222-2222-2222-222222222004'::UUID);
SELECT public.recalculate_book_counts('22222222-2222-2222-2222-222222222005'::UUID);
