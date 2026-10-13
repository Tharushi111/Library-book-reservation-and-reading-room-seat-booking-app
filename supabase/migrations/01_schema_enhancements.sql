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
