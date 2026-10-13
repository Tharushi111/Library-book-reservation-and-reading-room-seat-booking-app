-- ==============================================================================
-- OPTIONAL DEMO DATA SCRIPT (FOR TESTING ONLY)
-- SLIIT Library Management System (Role-Based Student & Staff System)
-- ==============================================================================
-- DO NOT RUN THIS IN PRODUCTION UNLESS YOU INTEND TO ADD TEST/DEMO RECORDS.
-- This script adds sample study rooms, template announcements, and physical copies
-- without overwriting existing catalog records.
-- ==============================================================================

-- 1. OPTIONAL: SAMPLE STUDY & CONFERENCE ROOMS (Only inserted if absent)
INSERT INTO public.rooms (
    name,
    room_number,
    room_type,
    capacity,
    location,
    facilities,
    description,
    status
)
SELECT
    'Discussion Room 101',
    'R-101',
    'study_room',
    8,
    'Level 2, North Wing',
    ARRAY['Whiteboard', 'Display Monitor', 'Power Outlets', 'Wi-Fi']::TEXT[],
    'Quiet group study room equipped with high-speed Wi-Fi and interactive presentation screen.',
    'available'
WHERE NOT EXISTS (SELECT 1 FROM public.rooms WHERE name = 'Discussion Room 101');

INSERT INTO public.rooms (
    name,
    room_number,
    room_type,
    capacity,
    location,
    facilities,
    description,
    status
)
SELECT
    'Collaborative Pod 202',
    'R-202',
    'study_room',
    6,
    'Level 2, South Wing',
    ARRAY['Whiteboard', 'Power Outlets', 'Ergonomic Chairs']::TEXT[],
    'Ideal space for collaborative group assignments and sprint discussions.',
    'available'
WHERE NOT EXISTS (SELECT 1 FROM public.rooms WHERE name = 'Collaborative Pod 202');

INSERT INTO public.rooms (
    name,
    room_number,
    room_type,
    capacity,
    location,
    facilities,
    description,
    status
)
SELECT
    'Executive Conference Suite',
    'CONF-A',
    'conference_room',
    16,
    'Level 3, Academic Block',
    ARRAY['Conference Projector', 'Audio System', 'Video Conferencing', 'Whiteboard']::TEXT[],
    'Reserved exclusively for academic faculty, staff committee meetings, and departmental presentations.',
    'available'
WHERE NOT EXISTS (SELECT 1 FROM public.rooms WHERE name = 'Executive Conference Suite');

-- 2. OPTIONAL: SAMPLE PHYSICAL COPIES (Only for available books without copies)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, title FROM public.books WHERE availability_status = 'available' LOOP
        IF NOT EXISTS (SELECT 1 FROM public.book_copies WHERE book_id = r.id) THEN
            INSERT INTO public.book_copies (
                book_id,
                copy_number,
                barcode,
                condition,
                status,
                shelf_location
            ) VALUES (
                r.id,
                'COPY-01',
                'BC-' || UPPER(SUBSTRING(r.id::text, 1, 6)) || '-01',
                'good',
                'available',
                'Main Floor - Stack A'
            );
        END IF;
    END LOOP;
END $$;
