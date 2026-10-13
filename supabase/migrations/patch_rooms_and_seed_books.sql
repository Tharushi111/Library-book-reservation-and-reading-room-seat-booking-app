-- ==============================================================================
-- SLIIT LIBRARY — ROOM CORRECTIONS & 50+ TEXTBOOKS SEED SCRIPT
-- ==============================================================================
-- Safe, idempotent script for the NEW Supabase Development project.
-- 1. Corrects the 4 SLIIT Library rooms and booking rules.
-- 2. Seeds 55+ real, verified academic textbooks across 12 disciplines.
-- 3. Creates physical copy records for each book.
-- ==============================================================================

-- ==============================================================================
-- PART 1: CONFIGURE THE 4 OFFICIAL SLIIT LIBRARY ROOMS
-- ==============================================================================

-- 1.1 UPSERT THE 4 OFFICIAL ROOMS
INSERT INTO public.rooms (
    id,
    name,
    room_number,
    room_type,
    capacity,
    location,
    facilities,
    description,
    status,
    is_archived,
    image_url
) VALUES
(
    '11111111-1111-1111-1111-111111111001',
    'Study Room A',
    'SR-A',
    'study_room',
    8,
    'Level 2, Library West Wing',
    ARRAY['Whiteboard', 'High-speed Wi-Fi', 'Power Outlets', 'Ergonomic Group Seating'],
    'Designated quiet space for student group study and collaborative assignments. Requires a minimum of 5 student participants.',
    'available',
    false,
    'https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg?auto=compress&cs=tinysrgb&w=800'
),
(
    '11111111-1111-1111-1111-111111111002',
    'Study Room B',
    'SR-B',
    'study_room',
    8,
    'Level 2, Library West Wing',
    ARRAY['Whiteboard', 'High-speed Wi-Fi', 'Power Outlets', 'LED Presentation Display'],
    'Equipped for interactive student project work and presentation practice. Requires a minimum of 5 student participants.',
    'available',
    false,
    'https://images.pexels.com/photos/260689/pexels-photo-260689.jpeg?auto=compress&cs=tinysrgb&w=800'
),
(
    '11111111-1111-1111-1111-111111111003',
    'Collaborative Room',
    'CR-01',
    'collaborative_space',
    10,
    'Level 3, Innovation Commons',
    ARRAY['Interactive Smart Screen', 'Modular Whiteboards', 'Wi-Fi 6', 'Movable Workstations', 'Power Hubs'],
    'Spacious collaborative environment for multi-disciplinary projects and group brainstorming. Requires a minimum of 5 student participants.',
    'available',
    false,
    'https://images.pexels.com/photos/3184328/pexels-photo-3184328.jpeg?auto=compress&cs=tinysrgb&w=800'
),
(
    '11111111-1111-1111-1111-111111111004',
    'Conference Room',
    'CONF-01',
    'conference_room',
    20,
    'Level 4, Academic & Administration Wing',
    ARRAY['4K Video Conferencing', 'Dual Projector Screens', 'Executive Seating', 'Conference Microphone Array', 'Wi-Fi'],
    'Executive conference boardroom reserved strictly for lecturers, academic faculty, and library staff. Requires a minimum of 10 staff participants.',
    'available',
    false,
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
    is_archived = false,
    image_url = EXCLUDED.image_url,
    updated_at = now();

-- 1.2 ARCHIVE ANY EXTRA DEMO ROOMS (Preserves existing bookings)
UPDATE public.rooms
SET is_archived = true, updated_at = now()
WHERE id NOT IN (
    '11111111-1111-1111-1111-111111111001',
    '11111111-1111-1111-1111-111111111002',
    '11111111-1111-1111-1111-111111111003',
    '11111111-1111-1111-1111-111111111004'
);

-- 1.3 ATOMIC ROOM BOOKING RPC WITH EXACT SLIIT PERMISSIONS
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

    -- SLIIT Rule 1: Conference Room is strictly for authorized staff & admins (min 10)
    IF v_room.room_type = 'conference_room' THEN
        IF v_user.role NOT IN ('staff', 'admin') THEN
            RAISE EXCEPTION 'The Conference Room is reserved exclusively for lecturers, academic staff, and library administration.';
        END IF;
        IF p_participants < 10 THEN
            RAISE EXCEPTION 'Conference Room bookings require a minimum of 10 staff participants.';
        END IF;
    ELSE
        -- SLIIT Rule 2: Study Rooms and Collaborative Room require min 5 participants
        IF p_participants < 5 THEN
            RAISE EXCEPTION 'Bookings for % require a minimum of 5 student participants.', v_room.name;
        END IF;
    END IF;

    -- SLIIT Rule 3: Cannot exceed room maximum capacity
    IF p_participants > v_room.capacity THEN
        RAISE EXCEPTION 'Participant count (%) exceeds maximum room capacity of % for %.', p_participants, v_room.capacity, v_room.name;
    END IF;

    -- SLIIT Rule 4: Asia/Colombo date & time validation
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

    -- Create notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        v_caller_id,
        'Room Booking Confirmed',
        'Your booking for ' || v_room.name || ' on ' || to_char(p_date, 'YYYY-MM-DD') || ' (' || to_char(p_start_time, 'HH24:MI') || ' - ' || to_char(p_end_time, 'HH24:MI') || ') has been confirmed.',
        'room_booking'
    );

    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'room_name', v_room.name,
        'booking_date', p_date,
        'start_time', p_start_time,
        'end_time', p_end_time
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.book_study_room_atomic(UUID, DATE, TIME, TIME, INT) TO authenticated;


-- ==============================================================================
-- PART 2: SEED 55+ REAL, VERIFIED ACADEMIC TEXTBOOKS (WITH COPIES)
-- ==============================================================================

DO $$
DECLARE
    v_b_id UUID;
    v_copies INT;
    v_i INT;
    v_isbn TEXT;
    
    -- Helper record table for seeding
    rec RECORD;
BEGIN
    -- Temporary table for structured textbook definitions
    CREATE TEMP TABLE tmp_seed_books (
        title TEXT,
        author TEXT,
        category TEXT,
        description TEXT,
        edition TEXT,
        isbn TEXT,
        publisher TEXT,
        publication_year INT,
        shelf_location TEXT,
        total_copies INT
    ) ON COMMIT DROP;

    -- 1. SOFTWARE ENGINEERING
    INSERT INTO tmp_seed_books VALUES
    ('Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Software Engineering', 'A handbook of agile craftsmanship providing actionable rules and principles for writing clean, readable, and maintainable software.', '1st Edition', '9780132350884', 'Prentice Hall', 2008, 'Level 2 - Shelf SE-01', 4),
    ('Clean Architecture: A Craftsman''s Guide to Software Structure and Design', 'Robert C. Martin', 'Software Engineering', 'Essential rules of software architecture, boundaries, components, and high-level structure from the author of Clean Code.', '1st Edition', '9780134494166', 'Prentice Hall', 2017, 'Level 2 - Shelf SE-01', 3),
    ('Software Engineering', 'Ian Sommerville', 'Software Engineering', 'The authoritative comprehensive textbook covering modern software processes, agile methods, systems engineering, and safety-critical architectures.', '10th Edition', '9780133943030', 'Pearson', 2015, 'Level 2 - Shelf SE-02', 5),
    ('Software Engineering: A Practitioner''s Approach', 'Roger S. Pressman & Bruce R. Maxim', 'Software Engineering', 'A comprehensive industry guide bridging academic software engineering fundamentals with enterprise practices and DevOps.', '9th Edition', '9781260548006', 'McGraw-Hill', 2019, 'Level 2 - Shelf SE-02', 4),
    ('Refactoring: Improving the Design of Existing Code', 'Martin Fowler', 'Software Engineering', 'The definitive guide to refactoring patterns and principles with modern JavaScript examples and test-driven development methodologies.', '2nd Edition', '9780134757599', 'Addison-Wesley', 2018, 'Level 2 - Shelf SE-03', 3),

    -- 2. PROGRAMMING (Java, Python, C++, JavaScript, C#)
    ('Effective Java', 'Joshua Bloch', 'Programming', 'Best practices and idioms for the Java programming language written by the former chief Java architect at Sun Microsystems.', '3rd Edition', '9780134685991', 'Addison-Wesley', 2017, 'Level 2 - Shelf PR-01', 4),
    ('Java: The Complete Reference', 'Herbert Schildt', 'Programming', 'Comprehensive reference explaining the syntax, keywords, and core Java APIs including lambdas, streams, and modules.', '12th Edition', '9781260440232', 'McGraw-Hill', 2021, 'Level 2 - Shelf PR-01', 4),
    ('Fluent Python: Clear, Concise, and Effective Programming', 'Luciano Ramalho', 'Programming', 'Deep dive into Python''s core features, generators, coroutines, type hinting, and metaprogramming.', '2nd Edition', '9781492056355', 'O''Reilly Media', 2022, 'Level 2 - Shelf PR-02', 3),
    ('Python Crash Course: A Hands-On, Project-Based Introduction', 'Eric Matthes', 'Programming', 'Fast-paced, thorough introduction to Python programming covering syntax, data visualization, web apps, and game development.', '3rd Edition', '9781718502703', 'No Starch Press', 2023, 'Level 2 - Shelf PR-02', 4),
    ('The C++ Programming Language', 'Bjarne Stroustrup', 'Programming', 'The definitive reference on modern C++ from its creator, covering standard libraries, concurrency, and object-oriented abstractions.', '4th Edition', '9780321563842', 'Addison-Wesley', 2013, 'Level 2 - Shelf PR-03', 3),
    ('Accelerated C++: Practical Programming by Example', 'Andrew Koenig & Barbara E. Moo', 'Programming', 'Fast-track introduction teaching idiomatic C++ from high-level standard abstractions down to system mechanics.', '1st Edition', '9780201703535', 'Addison-Wesley', 2000, 'Level 2 - Shelf PR-03', 3),
    ('Eloquent JavaScript: A Modern Introduction to Programming', 'Marijn Haverbeke', 'Programming', 'A modern and thorough introduction to JavaScript, functional programming, DOM manipulation, and asynchronous architecture.', '3rd Edition', '9781593279509', 'No Starch Press', 2018, 'Level 2 - Shelf PR-04', 4),
    ('JavaScript: The Definitive Guide', 'David Flanagan', 'Programming', 'The master guide to ECMAScript, web APIs, Node.js, and client-side web development.', '7th Edition', '9781491952023', 'O''Reilly Media', 2020, 'Level 2 - Shelf PR-04', 3),
    ('C# 10 in a Nutshell: The Definitive Reference', 'Joseph Albahari', 'Programming', 'Comprehensive reference for C# 10 and .NET 6, covering CLR fundamentals, asynchronous streams, and pattern matching.', '1st Edition', '9781098121136', 'O''Reilly Media', 2022, 'Level 2 - Shelf PR-05', 3),
    ('C# in Depth', 'Jon Skeet', 'Programming', 'Deep exploration of modern C# language evolutions, generics, async/await, and expressive functional idioms.', '4th Edition', '9781617294532', 'Manning', 2019, 'Level 2 - Shelf PR-05', 3),

    -- 3. DATABASE MANAGEMENT
    ('Database System Concepts', 'Abraham Silberschatz, Henry F. Korth & S. Sudarshan', 'Database Management', 'The classic university textbook covering relational algebra, SQL, transactions, concurrency, and distributed query engines.', '7th Edition', '9780078022159', 'McGraw-Hill', 2019, 'Level 3 - Shelf DB-01', 5),
    ('Database Management Systems', 'Raghu Ramakrishnan & Johannes Gehrke', 'Database Management', 'Comprehensive coverage of relational database implementation, B-trees, hash indices, query optimization, and storage management.', '3rd Edition', '9780072465631', 'McGraw-Hill', 2002, 'Level 3 - Shelf DB-01', 4),
    ('Designing Data-Intensive Applications', 'Martin Kleppmann', 'Database Management', 'The architectural bible for modern data systems: replication, partitioning, consensus, batch processing, and event streams.', '1st Edition', '9781449373320', 'O''Reilly Media', 2017, 'Level 3 - Shelf DB-02', 5),
    ('Fundamentals of Database Systems', 'Ramez Elmasri & Shamkant B. Navathe', 'Database Management', 'Clear and comprehensive conceptual modeling, ER diagrams, normalization, object-relational mapping, and database security.', '7th Edition', '9780133970777', 'Pearson', 2015, 'Level 3 - Shelf DB-02', 4),
    ('High Performance MySQL: Optimization, Backups, and Replication', 'Silvia Botros & Jeremy Tinley', 'Database Management', 'Advanced architectural strategies for tuning InnoDB, index design, query analysis, high availability, and horizontal scaling.', '4th Edition', '9781492080510', 'O''Reilly Media', 2021, 'Level 3 - Shelf DB-03', 3),

    -- 4. ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING
    ('Artificial Intelligence: A Modern Approach', 'Stuart Russell & Peter Norvig', 'Artificial Intelligence and Machine Learning', 'The standard global university textbook for artificial intelligence, search agents, probabilistic reasoning, and deep reinforcement learning.', '4th Edition', '9780134610993', 'Pearson', 2020, 'Level 3 - Shelf AI-01', 5),
    ('Pattern Recognition and Machine Learning', 'Christopher M. Bishop', 'Artificial Intelligence and Machine Learning', 'Rigorous mathematical treatment of Bayesian probability, graphical models, kernel methods, and neural networks.', '1st Edition', '9780387310732', 'Springer', 2006, 'Level 3 - Shelf AI-01', 3),
    ('Deep Learning', 'Ian Goodfellow, Yoshua Bengio & Aaron Courville', 'Artificial Intelligence and Machine Learning', 'The foundational MIT Press textbook on deep neural networks, backpropagation, convolutional networks, and generative models.', '1st Edition', '9780262035613', 'MIT Press', 2016, 'Level 3 - Shelf AI-02', 4),
    ('Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', 'Aurélien Géron', 'Artificial Intelligence and Machine Learning', 'Practical machine learning engineering from linear models to modern transformers and diffusion pipelines.', '3rd Edition', '9781098125974', 'O''Reilly Media', 2022, 'Level 3 - Shelf AI-02', 4),
    ('Reinforcement Learning: An Introduction', 'Richard S. Sutton & Andrew G. Barto', 'Artificial Intelligence and Machine Learning', 'Foundations of dynamic programming, Monte Carlo methods, temporal-difference learning, and policy gradients.', '2nd Edition', '9780262039246', 'MIT Press', 2018, 'Level 3 - Shelf AI-03', 3),

    -- 5. CYBERSECURITY
    ('The Web Application Hacker''s Handbook: Finding and Exploiting Security Flaws', 'Dafydd Stuttard & Marcus Pinto', 'Cybersecurity', 'The premier guide to discovering and mitigating web application vulnerabilities including SQL injection, XSS, CSRF, and authentication flaws.', '2nd Edition', '9781118026472', 'Wiley', 2011, 'Level 3 - Shelf SEC-01', 4),
    ('Applied Cryptography: Protocols, Algorithms, and Source Code in C', 'Bruce Schneier', 'Cybersecurity', 'The definitive cryptographic engineering classic covering symmetric ciphers, public-key infrastructure, digital signatures, and key exchange.', '20th Anniversary Edition', '9781119096726', 'Wiley', 2015, 'Level 3 - Shelf SEC-01', 3),
    ('Hacking: The Art of Exploitation', 'Jon Erickson', 'Cybersecurity', 'Hands-on exploration of assembly, buffer overflows, format string exploits, network sniffers, and cryptographic cryptanalysis.', '2nd Edition', '9781593271442', 'No Starch Press', 2008, 'Level 3 - Shelf SEC-02', 3),
    ('Security Engineering: A Guide to Building Dependable Distributed Systems', 'Ross Anderson', 'Cybersecurity', 'A masterwork on designing secure systems, human factors, biometrics, access control protocols, and threat modeling.', '3rd Edition', '9781119642787', 'Wiley', 2020, 'Level 3 - Shelf SEC-02', 4),
    ('Practical Malware Analysis: The Hands-On Guide', 'Michael Sikorski & Andrew Honig', 'Cybersecurity', 'Step-by-step instruction on static and dynamic reverse engineering of malicious software using x86 assembly and debuggers.', '1st Edition', '9781593272906', 'No Starch Press', 2012, 'Level 3 - Shelf SEC-03', 3),

    -- 6. COMPUTER NETWORKS
    ('Computer Networking: A Top-Down Approach', 'James F. Kurose & Keith W. Ross', 'Computer Networks', 'The world-standard networking textbook organized from the application layer down to the physical transport layer.', '8th Edition', '9780136681557', 'Pearson', 2020, 'Level 2 - Shelf NET-01', 5),
    ('Computer Networks', 'Andrew S. Tanenbaum, David J. Wetherall & Nick Feamster', 'Computer Networks', 'Comprehensive principles of networking protocols, routing algorithms, wireless transmission, and Internet architecture.', '6th Edition', '9780137523214', 'Pearson', 2021, 'Level 2 - Shelf NET-01', 4),
    ('TCP/IP Illustrated, Volume 1: The Protocols', 'Kevin R. Fall & W. Richard Stevens', 'Computer Networks', 'In-depth protocol analysis of TCP, IP, ICMP, ARP, and UDP with packet traces and socket interactions.', '2nd Edition', '9780321336316', 'Addison-Wesley', 2011, 'Level 2 - Shelf NET-02', 3),
    ('Network Warrior: Everything You Need to Know', 'Gary A. Donahue', 'Computer Networks', 'Practical enterprise networking guide covering Cisco switches, routers, VLANs, firewalls, and BGP routing topologies.', '2nd Edition', '9781449387860', 'O''Reilly Media', 2011, 'Level 2 - Shelf NET-02', 3),
    ('High Performance Browser Networking', 'Ilya Grigorik', 'Computer Networks', 'Performance tuning for TCP, TLS, HTTP/2, WebSockets, and WebRTC in modern distributed browser architectures.', '1st Edition', '9781449344764', 'O''Reilly Media', 2013, 'Level 2 - Shelf NET-03', 3),

    -- 7. DATA STRUCTURES AND ALGORITHMS
    ('Introduction to Algorithms', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest & Clifford Stein', 'Data Structures and Algorithms', 'The comprehensive global algorithms reference (CLRS) covering graph theory, divide-and-conquer, dynamic programming, and complexity classes.', '4th Edition', '9780262046305', 'MIT Press', 2022, 'Level 2 - Shelf DSA-01', 5),
    ('Algorithms', 'Robert Sedgewick & Kevin Wayne', 'Data Structures and Algorithms', 'Rigorous, code-rich university textbook on elementary data structures, sorting, searching, graphs, and string processing in Java.', '4th Edition', '9780321573513', 'Addison-Wesley', 2011, 'Level 2 - Shelf DSA-01', 4),
    ('The Algorithm Design Manual', 'Steven S. Skiena', 'Data Structures and Algorithms', 'Practical algorithm engineering, algorithmic war stories, and a comprehensive catalog of 75 fundamental algorithmic problems.', '3rd Edition', '9783030542559', 'Springer', 2020, 'Level 2 - Shelf DSA-02', 4),
    ('Grokking Algorithms: An Illustrated Guide', 'Aditya Y. Bhargava', 'Data Structures and Algorithms', 'An intuitive, fully illustrated introduction to search, sorting, greedy algorithms, and dynamic programming.', '1st Edition', '9781617292231', 'Manning', 2016, 'Level 2 - Shelf DSA-02', 4),
    ('Data Structures and Algorithm Analysis in C++', 'Mark Allen Weiss', 'Data Structures and Algorithms', 'Mathematical analysis of algorithms, balanced trees, priority queues, hashing, and amortized complexity in modern C++.', '4th Edition', '9780132847377', 'Pearson', 2013, 'Level 2 - Shelf DSA-03', 3),

    -- 8. WEB AND MOBILE DEVELOPMENT
    ('Learning React: Modern Patterns for Developing React Apps', 'Alex Banks & Eve Porcello', 'Web and Mobile Development', 'Practical guide to functional React, custom hooks, state management, and modern component composition.', '2nd Edition', '9781492051725', 'O''Reilly Media', 2020, 'Level 2 - Shelf WMD-01', 4),
    ('React Native in Action: Developing iOS and Android Apps', 'Nader Dabit', 'Web and Mobile Development', 'Guide to building native cross-platform mobile applications with React Native, animations, and native device APIs.', '1st Edition', '9781617294471', 'Manning', 2019, 'Level 2 - Shelf WMD-01', 3),
    ('Node.js Design Patterns', 'Mario Casciaro & Luciano Mammino', 'Web and Mobile Development', 'Master asynchronous architecture, streams, event emitters, microservices, and design patterns in enterprise Node.js.', '3rd Edition', '9781839214110', 'Packt Publishing', 2020, 'Level 2 - Shelf WMD-02', 3),
    ('Full Stack Development with Spring Boot 3 and React', 'Juha Hinkula', 'Web and Mobile Development', 'Building secure end-to-end applications with Spring Boot REST APIs, Spring Security JWT, and modern React frontends.', '4th Edition', '9781805122463', 'Packt Publishing', 2023, 'Level 2 - Shelf WMD-02', 3),
    ('Programming TypeScript: Making Your JavaScript Scale', 'Boris Cherny', 'Web and Mobile Development', 'Advanced type systems, generics, structural subtyping, and error handling for production TypeScript engineering.', '1st Edition', '9781491954461', 'O''Reilly Media', 2019, 'Level 2 - Shelf WMD-03', 4),

    -- 9. UI/UX AND HUMAN-COMPUTER INTERACTION
    ('The Design of Everyday Things', 'Don Norman', 'UI/UX and Human-Computer Interaction', 'The classic primer on cognitive ergonomics, affordances, signifiers, conceptual models, and user-centered design thinking.', 'Revised Edition', '9780465050659', 'Basic Books', 2013, 'Level 3 - Shelf UX-01', 4),
    ('Don''t Make Me Think, Revisited', 'Steve Krug', 'UI/UX and Human-Computer Interaction', 'The universal usability guide for intuitive navigation, visual hierarchy, mobile usability, and web accessibility.', '3rd Edition', '9780321965516', 'New Riders', 2014, 'Level 3 - Shelf UX-01', 4),
    ('About Face: The Essentials of Interaction Design', 'Alan Cooper, Robert Reimann & David Cronin', 'UI/UX and Human-Computer Interaction', 'Comprehensive methodology for goal-directed design, personas, user flows, and desktop/mobile interface patterns.', '4th Edition', '9781118766576', 'Wiley', 2014, 'Level 3 - Shelf UX-02', 3),
    ('Sprint: How to Solve Big Problems and Test New Ideas in Just Five Days', 'Jake Knapp, John Zeratsky & Braden Kowitz', 'UI/UX and Human-Computer Interaction', 'The Google Ventures five-day design sprint process for rapid prototyping and real user testing.', '1st Edition', '9781501121746', 'Simon & Schuster', 2016, 'Level 3 - Shelf UX-02', 3),
    ('Designing Interfaces: Patterns for Effective Interaction Design', 'Jenifer Tidwell, Charles Brewer & Aynne Valencia', 'UI/UX and Human-Computer Interaction', 'Visual guide to UI patterns, responsive layouts, data presentation, navigation, and mobile touch interactions.', '3rd Edition', '9781492051961', 'O''Reilly Media', 2020, 'Level 3 - Shelf UX-03', 3),

    -- 10. BUSINESS MANAGEMENT
    ('The Lean Startup', 'Eric Ries', 'Business Management', 'Continuous innovation, minimum viable products, validated learning, and agile business hypothesis testing.', '1st Edition', '9780307887894', 'Crown Business', 2011, 'Level 4 - Shelf BM-01', 4),
    ('Good to Great: Why Some Companies Make the Leap', 'Jim Collins', 'Business Management', 'Research-backed management principles, Level 5 leadership, and the hedgehog concept in building enduring institutions.', '1st Edition', '9780066620992', 'HarperBusiness', 2001, 'Level 4 - Shelf BM-01', 3),
    ('Measure What Matters: How Google Rocks the World with OKRs', 'John Doerr', 'Business Management', 'The goal-setting framework of Objectives and Key Results (OKRs) used by Google, Intel, and global technology innovators.', '1st Edition', '9780525536222', 'Portfolio', 2018, 'Level 4 - Shelf BM-02', 4),
    ('Zero to One: Notes on Startups, or How to Build the Future', 'Peter Thiel with Blake Masters', 'Business Management', 'Principles on technology monopolies, breakthrough vertical progress, and contrarian thinking in high-tech ventures.', '1st Edition', '9780804139298', 'Crown Business', 2014, 'Level 4 - Shelf BM-02', 4),
    ('Blue Ocean Strategy: How to Create Uncontested Market Space', 'W. Chan Kim & Renée Mauborgne', 'Business Management', 'Framework for value innovation, creating new market spaces, and rendering existing competition irrelevant.', 'Expanded Edition', '9781625274496', 'Harvard Business Review Press', 2015, 'Level 4 - Shelf BM-03', 3),

    -- 11. MATHEMATICS AND STATISTICS
    ('Calculus: Early Transcendentals', 'James Stewart', 'Mathematics and Statistics', 'The authoritative university textbook on single and multivariable differential calculus, integrals, and vector analysis.', '9th Edition', '9781337613927', 'Cengage Learning', 2020, 'Level 1 - Shelf MAT-01', 5),
    ('Introduction to Linear Algebra', 'Gilbert Strang', 'Mathematics and Statistics', 'Fundamental text on vector spaces, eigenvalues, singular value decomposition, and transformations foundational to computer science.', '5th Edition', '9780980232776', 'Wellesley-Cambridge Press', 2016, 'Level 1 - Shelf MAT-01', 4),
    ('Probability and Statistics for Engineers and Scientists', 'Ronald E. Walpole & Raymond H. Myers', 'Mathematics and Statistics', 'Engineering probability, distributions, hypothesis testing, regression analysis, and statistical quality control.', '9th Edition', '9780321629111', 'Pearson', 2012, 'Level 1 - Shelf MAT-02', 4),
    ('Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', 'Mathematics and Statistics', 'The fundamental computer science mathematics curriculum: logic, proofs, set theory, graph theory, and combinatorics.', '8th Edition', '9781259676512', 'McGraw-Hill', 2018, 'Level 1 - Shelf MAT-02', 5),
    ('Practical Statistics for Data Scientists: 50+ Essential Concepts', 'Peter Bruce, Andrew Bruce & Peter Gedeck', 'Mathematics and Statistics', 'Core statistics concepts explained for data science and machine learning applications in Python and R.', '2nd Edition', '9781492072942', 'O''Reilly Media', 2020, 'Level 1 - Shelf MAT-03', 4),

    -- 12. PROJECT MANAGEMENT
    ('A Guide to the Project Management Body of Knowledge (PMBOK Guide)', 'Project Management Institute', 'Project Management', 'The global standard for project management principles, performance domains, risk mitigation, and tailoring.', '7th Edition', '9781628256642', 'Project Management Institute', 2021, 'Level 4 - Shelf PM-01', 5),
    ('The Mythical Man-Month: Essays on Software Engineering', 'Frederick P. Brooks Jr.', 'Project Management', 'Iconic essays on software engineering management, Brook''s Law, architectural integrity, and the second-system effect.', 'Anniversary Edition', '9780201835953', 'Addison-Wesley', 1995, 'Level 4 - Shelf PM-01', 4),
    ('Agile Project Management with Kanban', 'Eric Brechner', 'Project Management', 'Practical guide to implementing Kanban boards, managing work-in-progress limits, and team velocity in software development.', '1st Edition', '9780735698956', 'Microsoft Press', 2015, 'Level 4 - Shelf PM-02', 3),
    ('Scrum: The Art of Doing Twice the Work in Half the Time', 'Jeff Sutherland', 'Project Management', 'The foundational framework of Scrum, sprint planning, daily standups, and retrospective continuous improvement.', '1st Edition', '9780385346450', 'Currency', 2014, 'Level 4 - Shelf PM-02', 4),
    ('Making Things Happen: Mastering Project Management', 'Scott Berkun', 'Project Management', 'Real-world strategies for project planning, leading team decisions, crisis management, and delivering complex software on time.', '1st Edition', '9780596517717', 'O''Reilly Media', 2008, 'Level 4 - Shelf PM-03', 3);

    -- ITERATE AND UPSERT INTO public.books & public.book_copies
    FOR rec IN SELECT * FROM tmp_seed_books LOOP
        -- Check if book already exists by ISBN or title
        SELECT id INTO v_b_id FROM public.books WHERE isbn = rec.isbn LIMIT 1;
        
        IF v_b_id IS NULL THEN
            SELECT id INTO v_b_id FROM public.books WHERE LOWER(title) = LOWER(rec.title) LIMIT 1;
        END IF;

        IF v_b_id IS NULL THEN
            -- Insert new book
            INSERT INTO public.books (
                title,
                author,
                category,
                description,
                edition,
                isbn,
                publisher,
                publication_year,
                shelf_location,
                total_copies,
                available_copies,
                availability_status,
                is_archived,
                has_copy_records,
                created_at,
                updated_at
            ) VALUES (
                rec.title,
                rec.author,
                rec.category,
                rec.description,
                rec.edition,
                rec.isbn,
                rec.publisher,
                rec.publication_year,
                rec.shelf_location,
                rec.total_copies,
                rec.total_copies,
                'available',
                false,
                true,
                now(),
                now()
            )
            RETURNING id INTO v_b_id;
        ELSE
            -- Update existing book details
            UPDATE public.books
            SET
                author = rec.author,
                category = rec.category,
                description = rec.description,
                edition = rec.edition,
                publisher = rec.publisher,
                publication_year = rec.publication_year,
                shelf_location = rec.shelf_location,
                has_copy_records = true,
                is_archived = false,
                updated_at = now()
            WHERE id = v_b_id;
        END IF;

        -- Ensure physical copies exist in public.book_copies
        SELECT COUNT(*) INTO v_copies FROM public.book_copies WHERE book_id = v_b_id;

        IF v_copies < rec.total_copies THEN
            FOR v_i IN (v_copies + 1)..rec.total_copies LOOP
                INSERT INTO public.book_copies (
                    book_id,
                    copy_number,
                    barcode,
                    condition,
                    status,
                    shelf_location
                ) VALUES (
                    v_b_id,
                    'C-' || LPAD(v_i::TEXT, 2, '0'),
                    'BC-' || SUBSTRING(rec.isbn FROM 10 FOR 4) || '-' || LPAD(v_i::TEXT, 2, '0'),
                    'excellent',
                    'available',
                    rec.shelf_location
                )
                ON CONFLICT (book_id, copy_number) DO NOTHING;
            END LOOP;

            -- Recalculate book totals
            PERFORM public.recalculate_book_counts(v_b_id);
        END IF;
    END LOOP;
END $$;
