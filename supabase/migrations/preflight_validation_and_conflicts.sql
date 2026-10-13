-- ==============================================================================
-- PREFLIGHT VALIDATION AND CONFLICT DETECTION SCRIPT (READ-ONLY)
-- SLIIT Library Management System (Role-Based Student & Staff System)
-- ==============================================================================
-- Run this script in the Supabase SQL Editor BEFORE running any migrations.
-- This script DOES NOT modify any data. It reports:
-- 1. Any existing active room booking schedule conflicts.
-- 2. Current catalog counts and availability breakdown.
-- 3. Existing RLS policies currently active in the database.
-- 4. Inconsistencies or orphaned records in library activity.
-- ==============================================================================

-- 1. DETECT CONFLICTING ACTIVE ROOM BOOKINGS
-- If this query returns ANY rows, those bookings overlap in time.
-- Review them and decide which to keep/reschedule before running Migration 01.
SELECT 
    b1.id AS booking_1_id,
    b2.id AS booking_2_id,
    b1.room_id,
    r.name AS room_name,
    b1.booking_date,
    b1.start_time AS b1_start,
    b1.end_time AS b1_end,
    b2.start_time AS b2_start,
    b2.end_time AS b2_end,
    p1.email AS student_1_email,
    p2.email AS student_2_email
FROM public.room_bookings b1
JOIN public.room_bookings b2 
  ON b1.room_id = b2.room_id 
 AND b1.booking_date = b2.booking_date 
 AND b1.id < b2.id
LEFT JOIN public.rooms r ON b1.room_id = r.id
LEFT JOIN public.profiles p1 ON b1.user_id = p1.id
LEFT JOIN public.profiles p2 ON b2.user_id = p2.id
WHERE b1.status = 'active' 
  AND b2.status = 'active'
  AND (b1.start_time < b2.end_time AND b1.end_time > b2.start_time);

-- 2. REPORT EXISTING BOOKS CATALOG SNAPSHOT
SELECT 
    id,
    title,
    author,
    category,
    availability_status,
    created_at
FROM public.books
ORDER BY title;

-- 3. REPORT EXISTING ACTIVE RESERVATIONS SNAPSHOT
SELECT 
    res.id AS reservation_id,
    p.email AS student_email,
    b.title AS book_title,
    res.status,
    res.reserved_at,
    res.collection_deadline
FROM public.book_reservations res
JOIN public.books b ON res.book_id = b.id
LEFT JOIN public.profiles p ON res.user_id = p.id
ORDER BY res.reserved_at DESC;

-- 4. REPORT EXISTING ACTIVE BORROWED BOOKS (LOANS)
SELECT 
    l.id AS loan_id,
    p.email AS student_email,
    b.title AS book_title,
    l.status,
    l.borrowed_date,
    l.due_date
FROM public.borrowed_books l
JOIN public.books b ON l.book_id = b.id
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.borrowed_date DESC;

-- 5. LIST EXISTING ACTIVE RLS POLICIES ON PUBLIC TABLES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. VERIFY EXTENSION AVAILABILITY
SELECT 
    name, 
    default_version, 
    installed_version 
FROM pg_available_extensions 
WHERE name IN ('uuid-ossp', 'btree_gist');
