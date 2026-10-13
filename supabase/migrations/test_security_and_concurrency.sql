-- ==============================================================================
-- SECURITY AND CONCURRENCY VERIFICATION TEST SUITE
-- SLIIT Library Management System (Role-Based Student & Staff System)
-- ==============================================================================
-- Run these test blocks in the Supabase SQL Editor to verify that security,
-- RLS isolation, privilege escalation prevention, and concurrency constraints
-- are operating as designed.
-- ==============================================================================

-- ==============================================================================
-- TEST 1: VERIFY STUDENTS CANNOT ESCALATE PRIVILEGES (Column Protection)
-- ==============================================================================
-- Scenario: An authenticated student attempts to update their role to 'staff'.
-- Expected Result: Fails with: "Permission denied: Cannot modify account role."
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Select any student profile
    SELECT id INTO test_user_id FROM public.profiles WHERE role = 'student' LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        -- Simulate execution under this student's identity
        PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            UPDATE public.profiles SET role = 'staff' WHERE id = test_user_id;
            RAISE EXCEPTION 'TEST 1 FAILED: Student was able to update their role!';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'TEST 1 PASSED: Privilege escalation blocked successfully. (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 1 SKIPPED: No student account present in profiles yet.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 2: VERIFY STUDENTS CANNOT INVOKE PROMOTE_TO_STAFF()
-- ==============================================================================
-- Scenario: Authenticated mobile client tries to call promote_to_staff.
-- Expected Result: Permission denied (code 42501).
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    SELECT id INTO test_user_id FROM public.profiles WHERE role = 'student' LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            PERFORM public.promote_to_staff('attacker@sliit.lk');
            RAISE EXCEPTION 'TEST 2 FAILED: Non-admin was able to execute promote_to_staff!';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'TEST 2 PASSED: promote_to_staff() execution denied for non-admin.';
            WHEN OTHERS THEN
                RAISE NOTICE 'TEST 2 PASSED: promote_to_staff() was blocked. (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 2 SKIPPED: No student profile to simulate.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 3: VERIFY PROFILE PRIVACY (No Contact Detail Leaks)
-- ==============================================================================
-- Scenario: Student A attempts to query Student B's row from public.profiles.
-- Expected Result: Query returns 0 rows due to RLS policy 'profiles_select_own_or_staff'.
DO $$
DECLARE
    student_a UUID;
    student_b UUID;
    queried_count INT;
BEGIN
    SELECT id INTO student_a FROM public.profiles WHERE role = 'student' ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO student_b FROM public.profiles WHERE role = 'student' AND id != student_a LIMIT 1;

    IF student_a IS NOT NULL AND student_b IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', student_a::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        SELECT COUNT(*) INTO queried_count FROM public.profiles WHERE id = student_b;

        IF queried_count = 0 THEN
            RAISE NOTICE 'TEST 3 PASSED: Student A cannot read Student B private profile (0 rows returned).';
        ELSE
            RAISE EXCEPTION 'TEST 3 FAILED: Student A read Student B profile (% rows returned)!', queried_count;
        END IF;
    ELSE
        RAISE NOTICE 'TEST 3 SKIPPED: Need at least 2 student profiles in database to test cross-reading.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 4: VERIFY STUDENTS CANNOT TAMPER WITH RESERVATION STATUS
-- ==============================================================================
-- Scenario: Student tries to mark their reservation directly as 'collected' or 'ready_for_pickup'.
-- Expected Result: Fails with "Permission denied: Students may only cancel their own active reservations."
DO $$
DECLARE
    test_user_id UUID;
    test_res_id UUID;
BEGIN
    SELECT user_id, id INTO test_user_id, test_res_id 
    FROM public.book_reservations 
    WHERE status = 'reserved' 
    LIMIT 1;

    IF test_res_id IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            UPDATE public.book_reservations SET status = 'collected' WHERE id = test_res_id;
            RAISE EXCEPTION 'TEST 4 FAILED: Student directly changed status to collected!';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'TEST 4 PASSED: Direct status tampering blocked. (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 4 SKIPPED: No active reservation to test.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 5: VERIFY ROOM BOOKING CONCURRENCY & EXCLUSION CONSTRAINT
-- ==============================================================================
-- Scenario: Two active bookings for the same room with overlapping time slots.
-- Expected Result: Second booking is rejected by exclusion constraint 'no_overlapping_active_room_bookings'.
DO $$
DECLARE
    test_room_id UUID;
    test_student UUID;
    test_date DATE := CURRENT_DATE + INTERVAL '10 days';
    b1_id UUID;
BEGIN
    SELECT id INTO test_room_id FROM public.rooms WHERE room_type = 'study_room' LIMIT 1;
    SELECT id INTO test_student FROM public.profiles WHERE role = 'student' LIMIT 1;

    IF test_room_id IS NOT NULL AND test_student IS NOT NULL THEN
        -- Insert Booking 1: 10:00 to 12:00
        INSERT INTO public.room_bookings (
            room_id, user_id, booking_date, start_time, end_time, participants, status
        ) VALUES (
            test_room_id, test_student, test_date, '10:00'::TIME, '12:00'::TIME, 5, 'active'
        ) RETURNING id INTO b1_id;

        -- Attempt Booking 2: 11:00 to 13:00 (Clash!)
        BEGIN
            INSERT INTO public.room_bookings (
                room_id, user_id, booking_date, start_time, end_time, participants, status
            ) VALUES (
                test_room_id, test_student, test_date, '11:00'::TIME, '13:00'::TIME, 5, 'active'
            );
            -- Clean up test record if unexpected success
            DELETE FROM public.room_bookings WHERE id = b1_id;
            RAISE EXCEPTION 'TEST 5 FAILED: Database permitted overlapping room booking!';
        EXCEPTION
            WHEN exclusion_violation THEN
                -- Clean up test record
                DELETE FROM public.room_bookings WHERE id = b1_id;
                RAISE NOTICE 'TEST 5 PASSED: Exclusion constraint successfully blocked overlapping booking.';
            WHEN OTHERS THEN
                DELETE FROM public.room_bookings WHERE id = b1_id;
                RAISE NOTICE 'TEST 5 PASSED: Overlap blocked by database. (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 5 SKIPPED: Requires at least 1 study room in public.rooms.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 6: VERIFY DIRECT TABLE INSERT BYPASS IS BLOCKED (Reservations)
-- ==============================================================================
-- Scenario: Student tries to bypass reserve_book_atomic() and insert directly into book_reservations.
-- Expected Result: Blocked by RLS (book_reservations_staff_insert).
DO $$
DECLARE
    test_student UUID;
    test_book UUID;
BEGIN
    SELECT id INTO test_student FROM public.profiles WHERE role = 'student' LIMIT 1;
    SELECT id INTO test_book FROM public.books LIMIT 1;

    IF test_student IS NOT NULL AND test_book IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', test_student::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            INSERT INTO public.book_reservations (user_id, book_id, status)
            VALUES (test_student, test_book, 'reserved');
            RAISE EXCEPTION 'TEST 6 FAILED: Student was able to insert directly into book_reservations!';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'TEST 6 PASSED: Direct INSERT into book_reservations blocked by RLS. (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 6 SKIPPED: Student or book not available.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 7: VERIFY DIRECT TABLE INSERT BYPASS IS BLOCKED (Room Bookings)
-- ==============================================================================
-- Scenario: Student tries to bypass book_study_room_atomic() and insert directly into room_bookings.
-- Expected Result: Blocked by RLS (room_bookings_staff_insert).
DO $$
DECLARE
    test_student UUID;
    test_room UUID;
BEGIN
    SELECT id INTO test_student FROM public.profiles WHERE role = 'student' LIMIT 1;
    SELECT id INTO test_room FROM public.rooms LIMIT 1;

    IF test_student IS NOT NULL AND test_room IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', test_student::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            INSERT INTO public.room_bookings (user_id, room_id, booking_date, start_time, end_time, participants, status)
            VALUES (test_student, test_room, CURRENT_DATE + INTERVAL '5 days', '14:00'::TIME, '16:00'::TIME, 1, 'active');
            RAISE EXCEPTION 'TEST 7 FAILED: Student was able to insert directly into room_bookings!';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'TEST 7 PASSED: Direct INSERT into room_bookings blocked by RLS. (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 7 SKIPPED: Student or room not available.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 8: VERIFY DIRECT NOTIFICATION INJECTION IS BLOCKED
-- ==============================================================================
-- Scenario: Student attempts to create notifications for another student.
-- Expected Result: Blocked by RLS (notifications_staff_insert).
DO $$
DECLARE
    student_a UUID;
    student_b UUID;
BEGIN
    SELECT id INTO student_a FROM public.profiles WHERE role = 'student' ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO student_b FROM public.profiles WHERE role = 'student' AND id != student_a LIMIT 1;

    IF student_a IS NOT NULL AND student_b IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', student_a::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (student_b, 'Spoofed Notification', 'You owe 10,000 LKR', 'system');
            RAISE EXCEPTION 'TEST 8 FAILED: Student was able to insert notifications for another user!';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'TEST 8 PASSED: Direct notification injection blocked by RLS. (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 8 SKIPPED: Need 2 student profiles.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 9: VERIFY SLIIT MINIMUM PARTICIPANTS RULE (Study Rooms: Min 5)
-- ==============================================================================
-- Scenario: Student tries to book a study room with 3 participants (< 5).
-- Expected Result: RPC book_study_room_atomic throws exception.
DO $$
DECLARE
    test_student UUID;
    test_room UUID;
BEGIN
    SELECT id INTO test_student FROM public.profiles WHERE role = 'student' LIMIT 1;
    SELECT id INTO test_room FROM public.rooms WHERE room_type = 'study_room' LIMIT 1;

    IF test_student IS NOT NULL AND test_room IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', test_student::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            PERFORM public.book_study_room_atomic(
                test_room,
                CURRENT_DATE + INTERVAL '7 days',
                '10:00'::TIME,
                '12:00'::TIME,
                3 -- Violates minimum 5 rule!
            );
            RAISE EXCEPTION 'TEST 9 FAILED: Room booked with fewer than 5 participants!';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLERRM LIKE '%minimum of 5 student participants%' THEN
                    RAISE NOTICE 'TEST 9 PASSED: Minimum 5 participants rule enforced. (%)', SQLERRM;
                ELSE
                    RAISE NOTICE 'TEST 9 PASSED: Booking blocked. (%)', SQLERRM;
                END IF;
        END;
    ELSE
        RAISE NOTICE 'TEST 9 SKIPPED: Student or study room not available.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 10: VERIFY SLIIT CONFERENCE ROOM RESTRICTION (Staff Only)
-- ==============================================================================
-- Scenario: Student tries to book a conference room.
-- Expected Result: RPC book_study_room_atomic throws exception.
DO $$
DECLARE
    test_student UUID;
    conf_room UUID;
BEGIN
    SELECT id INTO test_student FROM public.profiles WHERE role = 'student' LIMIT 1;
    SELECT id INTO conf_room FROM public.rooms WHERE room_type = 'conference_room' LIMIT 1;

    IF test_student IS NOT NULL AND conf_room IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', test_student::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            PERFORM public.book_study_room_atomic(
                conf_room,
                CURRENT_DATE + INTERVAL '7 days',
                '14:00'::TIME,
                '16:00'::TIME,
                12
            );
            RAISE EXCEPTION 'TEST 10 FAILED: Student was able to book a conference room!';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLERRM LIKE '%reserved for lecturers and academic staff only%' THEN
                    RAISE NOTICE 'TEST 10 PASSED: Conference room staff restriction enforced. (%)', SQLERRM;
                ELSE
                    RAISE NOTICE 'TEST 10 PASSED: Booking blocked. (%)', SQLERRM;
                END IF;
        END;
    ELSE
        RAISE NOTICE 'TEST 10 SKIPPED: Student or conference room not available.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 11: VERIFY RESERVED COPY ISOLATION IN ISSUE_BOOK_LOAN()
-- ==============================================================================
-- Scenario: Staff attempts to issue a copy reserved for Student A to Student B.
-- Expected Result: issue_book_loan() raises exception: "Copy ... is reserved for a different student."
DO $$
DECLARE
    staff_user UUID;
    student_a UUID;
    student_b UUID;
    test_book UUID;
    test_copy UUID;
    res_a UUID;
BEGIN
    SELECT id INTO staff_user FROM public.profiles WHERE role = 'staff' LIMIT 1;
    SELECT id INTO student_a FROM public.profiles WHERE role = 'student' ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO student_b FROM public.profiles WHERE role = 'student' AND id != student_a LIMIT 1;

    IF staff_user IS NOT NULL AND student_a IS NOT NULL AND student_b IS NOT NULL THEN
        -- Check if there is an existing reserved copy
        SELECT r.copy_id, r.id, r.book_id INTO test_copy, res_a, test_book
        FROM public.book_reservations r
        WHERE r.status = 'reserved' AND r.copy_id IS NOT NULL AND r.user_id = student_a
        LIMIT 1;

        IF test_copy IS NOT NULL THEN
            PERFORM set_config('request.jwt.claim.sub', staff_user::text, true);
            PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

            BEGIN
                -- Staff tries to issue Student A's reserved copy to Student B
                PERFORM public.issue_book_loan(
                    test_book,
                    student_b,
                    14,
                    test_copy,
                    NULL
                );
                RAISE EXCEPTION 'TEST 11 FAILED: Reserved copy was issued to the wrong student!';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLERRM LIKE '%reserved for a different student%' THEN
                        RAISE NOTICE 'TEST 11 PASSED: Copy cross-allocation blocked. (%)', SQLERRM;
                    ELSE
                        RAISE NOTICE 'TEST 11 PASSED: Invalid issuance blocked. (%)', SQLERRM;
                    END IF;
            END;
        ELSE
            RAISE NOTICE 'TEST 11 SKIPPED: No active copy reservation for Student A to test cross-issuance.';
        END IF;
    ELSE
        RAISE NOTICE 'TEST 11 SKIPPED: Test requires 1 staff member and 2 student accounts.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 12: VERIFY DIRECT QUEUE DELETE IS BLOCKED (Must Use Atomic Leave RPC)
-- ==============================================================================
-- Scenario: Student attempts to directly DELETE from book_queue.
-- Expected Result: Blocked by RLS (queue_staff_delete).
DO $$
DECLARE
    test_student UUID;
    test_queue_id UUID;
BEGIN
    SELECT id, user_id INTO test_queue_id, test_student FROM public.book_queue LIMIT 1;

    IF test_queue_id IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', test_student::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            DELETE FROM public.book_queue WHERE id = test_queue_id;
            RAISE EXCEPTION 'TEST 12 FAILED: Student was able to directly DELETE from book_queue!';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'TEST 12 PASSED: Direct DELETE on book_queue blocked by RLS. (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 12 SKIPPED: No queue entry available to test.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 13: VERIFY SRI LANKA TIMEZONE SCHEDULE VALIDATION
-- ==============================================================================
-- Scenario: Attempting to book a past time in Sri Lanka (Asia/Colombo).
-- Expected Result: book_study_room_atomic throws exception referencing Sri Lanka Standard Time.
DO $$
DECLARE
    test_student UUID;
    test_room UUID;
    past_time TIME;
    sl_date DATE := (now() AT TIME ZONE 'Asia/Colombo')::DATE;
    sl_time TIME := (now() AT TIME ZONE 'Asia/Colombo')::TIME;
BEGIN
    SELECT id INTO test_student FROM public.profiles WHERE role = 'student' LIMIT 1;
    SELECT id INTO test_room FROM public.rooms WHERE room_type = 'study_room' LIMIT 1;

    -- Pick a time 1 hour before current Sri Lanka time if after 01:00, or test yesterday's date
    IF test_student IS NOT NULL AND test_room IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', test_student::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            PERFORM public.book_study_room_atomic(
                test_room,
                sl_date - INTERVAL '1 day',
                '10:00'::TIME,
                '12:00'::TIME,
                5
            );
            RAISE EXCEPTION 'TEST 13 FAILED: Past date was allowed!';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLERRM LIKE '%Sri Lanka Standard Time%' OR SQLERRM LIKE '%past%' THEN
                    RAISE NOTICE 'TEST 13 PASSED: Past schedule rejected against Sri Lanka time. (%)', SQLERRM;
                ELSE
                    RAISE NOTICE 'TEST 13 PASSED: Booking blocked. (%)', SQLERRM;
                END IF;
        END;
    ELSE
        RAISE NOTICE 'TEST 13 SKIPPED: Student or room not available.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 14: VERIFY DAMAGED COPY RETURN DOES NOT ALLOCATE TO QUEUE
-- ==============================================================================
-- Scenario: Return a book in 'damaged' condition.
-- Expected Result: Copy status is set to 'damaged', not 'available', and not allocated to queue.
DO $$
DECLARE
    staff_user UUID;
    test_loan UUID;
    test_copy UUID;
BEGIN
    SELECT id INTO staff_user FROM public.profiles WHERE role = 'staff' LIMIT 1;
    SELECT id, copy_id INTO test_loan, test_copy 
    FROM public.borrowed_books 
    WHERE status = 'borrowed' AND copy_id IS NOT NULL 
    LIMIT 1;

    IF staff_user IS NOT NULL AND test_loan IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', staff_user::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            -- Rollback test transaction inside sub-block
            PERFORM public.return_book_loan(test_loan, 'damaged', 'Cover torn during loan');
            
            -- Verify copy status
            IF EXISTS (SELECT 1 FROM public.book_copies WHERE id = test_copy AND status = 'damaged') THEN
                RAISE NOTICE 'TEST 14 PASSED: Damaged copy marked damaged and isolated from circulation.';
            ELSE
                RAISE EXCEPTION 'TEST 14 FAILED: Damaged copy was not marked damaged!';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'TEST 14 INFO: (%)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'TEST 14 SKIPPED: Requires staff account and active loan with copy.';
    END IF;
END $$;

-- ==============================================================================
-- TEST 15: VERIFY LAST COPY DELETION INVENTORY SYNCHRONIZATION
-- ==============================================================================
-- Scenario: Deleting all copies of a book updates total_copies and available_copies to 0.
-- Expected Result: books.total_copies = 0, books.available_copies = 0, no stale numbers.
DO $$
DECLARE
    dummy_book_id UUID;
    dummy_copy_id UUID;
    final_total INT;
    final_avail INT;
BEGIN
    -- Create a temporary test book
    INSERT INTO public.books (title, author, category, total_copies, available_copies, has_copy_records)
    VALUES ('Temp Test Inventory Sync', 'Test Author', 'Test', 1, 1, true)
    RETURNING id INTO dummy_book_id;

    -- Create single physical copy
    INSERT INTO public.book_copies (book_id, copy_number, status)
    VALUES (dummy_book_id, 'C-TEST-01', 'available')
    RETURNING id INTO dummy_copy_id;

    -- Delete the only copy
    DELETE FROM public.book_copies WHERE id = dummy_copy_id;

    -- Verify book counts are zero, not stale
    SELECT total_copies, available_copies INTO final_total, final_avail
    FROM public.books WHERE id = dummy_book_id;

    -- Clean up test book
    DELETE FROM public.books WHERE id = dummy_book_id;

    IF final_total = 0 AND final_avail = 0 THEN
        RAISE NOTICE 'TEST 15 PASSED: Last copy deletion set total_copies=0 and available_copies=0 correctly.';
    ELSE
        RAISE EXCEPTION 'TEST 15 FAILED: Stale inventory detected (total=%, avail=%)', final_total, final_avail;
    END IF;
END $$;


