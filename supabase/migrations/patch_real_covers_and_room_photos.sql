/* ==============================================================================
   SLIIT LIBRARY: REAL BOOK COVERS & REALISTIC SPACE PHOTOGRAPHS PATCH
   ==============================================================================
   Run this idempotent script in the Supabase SQL Editor for your dev project.
   1. Updates Study Room A, Study Room B, Collaborative Room, and Conference Room
      with licensed, high-resolution representative space photographs (Pexels CDN).
   2. Updates all 66 textbooks with verified, published Open Library covers.
   ============================================================================== */

/* 1. UPDATE ROOM PHOTOGRAPHS */
UPDATE rooms SET image_url = 'https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE name = 'Study Room A' OR id = '11111111-1111-1111-1111-111111111001';
UPDATE rooms SET image_url = 'https://images.pexels.com/photos/260689/pexels-photo-260689.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE name = 'Study Room B' OR id = '11111111-1111-1111-1111-111111111002';
UPDATE rooms SET image_url = 'https://images.pexels.com/photos/3184328/pexels-photo-3184328.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE name = 'Collaborative Room' OR id = '11111111-1111-1111-1111-111111111003';
UPDATE rooms SET image_url = 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE name = 'Conference Room' OR id = '11111111-1111-1111-1111-111111111004';

/* 2. UPDATE ALL 66 BOOKS WITH REAL PUBLISHED COVERS */
/* [1] Database System Concepts (978-0078022159) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780078022159-L.jpg' WHERE id = '22222222-2222-2222-2222-222222222004' OR isbn = '978-0078022159' OR LOWER(title) = LOWER('Database System Concepts');
/* [2] Introduction to Algorithms (978-0262046305) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780262046305-L.jpg' WHERE id = '22222222-2222-2222-2222-222222222003' OR isbn = '978-0262046305' OR LOWER(title) = LOWER('Introduction to Algorithms');
/* [3] Artificial Intelligence: A Modern Approach (978-0134610993) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780134610993-L.jpg' WHERE id = '22222222-2222-2222-2222-222222222005' OR isbn = '978-0134610993' OR LOWER(title) = LOWER('Artificial Intelligence: A Modern Approach');
/* [4] Design Patterns: Elements of Reusable Object-Oriented Software (978-0201633610) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg' WHERE id = '22222222-2222-2222-2222-222222222002' OR isbn = '978-0201633610' OR LOWER(title) = LOWER('Design Patterns: Elements of Reusable Object-Oriented Software');
/* [5] Clean Code: A Handbook of Agile Software Craftsmanship (978-0132350884) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg' WHERE id = '22222222-2222-2222-2222-222222222001' OR isbn = '978-0132350884' OR LOWER(title) = LOWER('Clean Code: A Handbook of Agile Software Craftsmanship');
/* [6] Refactoring: Improving the Design of Existing Code (9780134757599) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg' WHERE id = '0fb8b097-7ae6-4164-b7f3-99c638fff7dd' OR isbn = '9780134757599' OR LOWER(title) = LOWER('Refactoring: Improving the Design of Existing Code');
/* [7] Java: The Complete Reference (9781260440232) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781260440232-L.jpg' WHERE id = '10764591-13e2-4e16-a654-cfc6e3fb89e3' OR isbn = '9781260440232' OR LOWER(title) = LOWER('Java: The Complete Reference');
/* [8] Fluent Python: Clear, Concise, and Effective Programming (9781492056355) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781492056355-L.jpg' WHERE id = '7f1ae9e6-262b-4cb6-8782-8aed814a0b30' OR isbn = '9781492056355' OR LOWER(title) = LOWER('Fluent Python: Clear, Concise, and Effective Programming');
/* [9] Python Crash Course: A Hands-On, Project-Based Introduction (9781718502703) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781718502703-L.jpg' WHERE id = '113bb9f0-be88-45ca-95ca-59a4bc075281' OR isbn = '9781718502703' OR LOWER(title) = LOWER('Python Crash Course: A Hands-On, Project-Based Introduction');
/* [10] The C++ Programming Language (9780321563842) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780321563842-L.jpg' WHERE id = '939b26e4-e83f-48ab-ac32-64d219ad8d43' OR isbn = '9780321563842' OR LOWER(title) = LOWER('The C++ Programming Language');
/* [11] Accelerated C++: Practical Programming by Example (9780201703535) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780201703535-L.jpg' WHERE id = '661e7b64-1955-4b19-9c58-7e7ab455bb6a' OR isbn = '9780201703535' OR LOWER(title) = LOWER('Accelerated C++: Practical Programming by Example');
/* [12] Eloquent JavaScript: A Modern Introduction to Programming (9781593279509) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781593279509-L.jpg' WHERE id = '263abcd5-6263-4875-be05-f41ffeb448a2' OR isbn = '9781593279509' OR LOWER(title) = LOWER('Eloquent JavaScript: A Modern Introduction to Programming');
/* [13] JavaScript: The Definitive Guide (9781491952023) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781491952023-L.jpg' WHERE id = 'e767c713-006e-4c85-83f2-e16a9e0c6739' OR isbn = '9781491952023' OR LOWER(title) = LOWER('JavaScript: The Definitive Guide');
/* [14] C# 10 in a Nutshell: The Definitive Reference (9781098121136) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781491987650-L.jpg' WHERE id = '94655bdd-471b-4653-b4b0-263f1687f81e' OR isbn = '9781098121136' OR LOWER(title) = LOWER('C# 10 in a Nutshell: The Definitive Reference');
/* [15] C# in Depth (9781617294532) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781617294532-L.jpg' WHERE id = 'c4b3cab0-af01-40a5-ad88-af5ac985c290' OR isbn = '9781617294532' OR LOWER(title) = LOWER('C# in Depth');
/* [16] Database Management Systems (9780072465631) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780072465631-L.jpg' WHERE id = '575f1e05-159a-4b4a-afde-cb196c7855d1' OR isbn = '9780072465631' OR LOWER(title) = LOWER('Database Management Systems');
/* [17] Designing Data-Intensive Applications (9781449373320) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg' WHERE id = '0cdcfb59-9234-4b20-9881-c387b0a1f95e' OR isbn = '9781449373320' OR LOWER(title) = LOWER('Designing Data-Intensive Applications');
/* [18] Fundamentals of Database Systems (9780133970777) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780133970777-L.jpg' WHERE id = '6f164e08-1a0f-47f2-8ec8-fd00f8431b9a' OR isbn = '9780133970777' OR LOWER(title) = LOWER('Fundamentals of Database Systems');
/* [19] High Performance MySQL: Optimization, Backups, and Replication (9781492080510) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781492080510-L.jpg' WHERE id = '1ce1fba4-90bf-43b1-9573-2c2e11c1385a' OR isbn = '9781492080510' OR LOWER(title) = LOWER('High Performance MySQL: Optimization, Backups, and Replication');
/* [20] Pattern Recognition and Machine Learning (9780387310732) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780387310732-L.jpg' WHERE id = '09a8952e-d223-499c-a2c0-ff8ce5d6a015' OR isbn = '9780387310732' OR LOWER(title) = LOWER('Pattern Recognition and Machine Learning');
/* [21] Deep Learning (9780262035613) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780262035613-L.jpg' WHERE id = 'b0ebc984-4be0-475f-bb0f-1c642753eb01' OR isbn = '9780262035613' OR LOWER(title) = LOWER('Deep Learning');
/* [22] Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow (9781098125974) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781098125974-L.jpg' WHERE id = '94301d5e-8f48-41e3-8ef9-e8df06774bd7' OR isbn = '9781098125974' OR LOWER(title) = LOWER('Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow');
/* [23] Reinforcement Learning: An Introduction (9780262039246) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780262039246-L.jpg' WHERE id = '5859c085-455e-40d5-b480-3961c28f6354' OR isbn = '9780262039246' OR LOWER(title) = LOWER('Reinforcement Learning: An Introduction');
/* [24] The Web Application Hacker's Handbook: Finding and Exploiting Security Flaws (9781118026472) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781118026472-L.jpg' WHERE id = 'e99f89a4-8420-4817-a542-e0e77ef6099c' OR isbn = '9781118026472' OR LOWER(title) = LOWER('The Web Application Hacker''s Handbook: Finding and Exploiting Security Flaws');
/* [25] Applied Cryptography: Protocols, Algorithms, and Source Code in C (9781119096726) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781119096726-L.jpg' WHERE id = 'af76d912-5f04-4f09-bf54-3173b384961e' OR isbn = '9781119096726' OR LOWER(title) = LOWER('Applied Cryptography: Protocols, Algorithms, and Source Code in C');
/* [26] Hacking: The Art of Exploitation (9781593271442) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781593271442-L.jpg' WHERE id = 'c5abf174-1f26-498e-bbad-1d7a11e10002' OR isbn = '9781593271442' OR LOWER(title) = LOWER('Hacking: The Art of Exploitation');
/* [27] Security Engineering: A Guide to Building Dependable Distributed Systems (9781119642787) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781119642787-L.jpg' WHERE id = 'e6f94cb9-38b7-4772-b8d9-8a99b88ce37b' OR isbn = '9781119642787' OR LOWER(title) = LOWER('Security Engineering: A Guide to Building Dependable Distributed Systems');
/* [28] Practical Malware Analysis: The Hands-On Guide (9781593272906) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781593272906-L.jpg' WHERE id = '72483ae6-9697-4b04-8553-29095c1ad39d' OR isbn = '9781593272906' OR LOWER(title) = LOWER('Practical Malware Analysis: The Hands-On Guide');
/* [29] Computer Networking: A Top-Down Approach (9780136681557) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780133594140-L.jpg' WHERE id = 'a4b5e9eb-0278-4606-a8db-6d133f4bd77a' OR isbn = '9780136681557' OR LOWER(title) = LOWER('Computer Networking: A Top-Down Approach');
/* [30] Computer Networks (9780137523214) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780132126953-L.jpg' WHERE id = 'be28c6ef-290c-45d0-b242-f6201dead101' OR isbn = '9780137523214' OR LOWER(title) = LOWER('Computer Networks');
/* [31] TCP/IP Illustrated, Volume 1: The Protocols (9780321336316) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780321336316-L.jpg' WHERE id = '330d65d2-802f-49f4-9e38-152fbc4fe6f8' OR isbn = '9780321336316' OR LOWER(title) = LOWER('TCP/IP Illustrated, Volume 1: The Protocols');
/* [32] Network Warrior: Everything You Need to Know (9781449387860) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781449387860-L.jpg' WHERE id = '90d11aa4-bcf5-4ce4-a4be-5551dcef91a0' OR isbn = '9781449387860' OR LOWER(title) = LOWER('Network Warrior: Everything You Need to Know');
/* [33] High Performance Browser Networking (9781449344764) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781449344764-L.jpg' WHERE id = '6ea422f1-f00b-4903-a24d-4b5c58afab35' OR isbn = '9781449344764' OR LOWER(title) = LOWER('High Performance Browser Networking');
/* [34] Algorithms (9780321573513) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780321573513-L.jpg' WHERE id = 'a4402102-0873-40b9-a224-7bcab8cfb5a9' OR isbn = '9780321573513' OR LOWER(title) = LOWER('Algorithms');
/* [35] The Algorithm Design Manual (9783030542559) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9783030542559-L.jpg' WHERE id = '6f546f6c-941c-49d3-92e4-993d2754d245' OR isbn = '9783030542559' OR LOWER(title) = LOWER('The Algorithm Design Manual');
/* [36] Grokking Algorithms: An Illustrated Guide (9781617292231) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781617292231-L.jpg' WHERE id = '7d24123c-b1a6-48f0-9444-01717e335740' OR isbn = '9781617292231' OR LOWER(title) = LOWER('Grokking Algorithms: An Illustrated Guide');
/* [37] Data Structures and Algorithm Analysis in C++ (9780132847377) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780132847377-L.jpg' WHERE id = '85af224c-ff86-474e-a8e8-1bfeaf80ab74' OR isbn = '9780132847377' OR LOWER(title) = LOWER('Data Structures and Algorithm Analysis in C++');
/* [38] Learning React: Modern Patterns for Developing React Apps (9781492051725) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781492051725-L.jpg' WHERE id = '3723c00f-dcfb-4e6c-9563-ab4a0ffba8c2' OR isbn = '9781492051725' OR LOWER(title) = LOWER('Learning React: Modern Patterns for Developing React Apps');
/* [39] React Native in Action: Developing iOS and Android Apps (9781617294471) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781617294471-L.jpg' WHERE id = 'b1d24eec-1a86-43ab-bc48-73f05f7d2bab' OR isbn = '9781617294471' OR LOWER(title) = LOWER('React Native in Action: Developing iOS and Android Apps');
/* [40] Node.js Design Patterns (9781839214110) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781785885587-L.jpg' WHERE id = '02eef3ec-06ec-422d-96b6-12af85d720cd' OR isbn = '9781839214110' OR LOWER(title) = LOWER('Node.js Design Patterns');
/* [41] Full Stack Development with Spring Boot 3 and React (9781805122463) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/id/8507894-L.jpg' WHERE id = '9affc0f6-6314-41fa-81e2-2d911a62da40' OR isbn = '9781805122463' OR LOWER(title) = LOWER('Full Stack Development with Spring Boot 3 and React');
/* [42] Programming TypeScript: Making Your JavaScript Scale (9781491954461) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781491954461-L.jpg' WHERE id = 'f9984c61-94cf-450f-9934-b778b6f9ba7c' OR isbn = '9781491954461' OR LOWER(title) = LOWER('Programming TypeScript: Making Your JavaScript Scale');
/* [43] The Design of Everyday Things (9780465050659) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780465050659-L.jpg' WHERE id = 'b8292558-76de-4096-91e7-c23cea3e9a37' OR isbn = '9780465050659' OR LOWER(title) = LOWER('The Design of Everyday Things');
/* [44] Don't Make Me Think, Revisited (9780321965516) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780321965516-L.jpg' WHERE id = '397b63f7-1b1d-4fee-947b-aaf6ba4c9c86' OR isbn = '9780321965516' OR LOWER(title) = LOWER('Don''t Make Me Think, Revisited');
/* [45] About Face: The Essentials of Interaction Design (9781118766576) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781118766576-L.jpg' WHERE id = '78fe396e-f7f5-44e6-b404-3c6c878ef249' OR isbn = '9781118766576' OR LOWER(title) = LOWER('About Face: The Essentials of Interaction Design');
/* [46] Sprint: How to Solve Big Problems and Test New Ideas in Just Five Days (9781501121746) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781501121746-L.jpg' WHERE id = 'd017b6c0-3101-4f82-a7a8-6a4ccf223095' OR isbn = '9781501121746' OR LOWER(title) = LOWER('Sprint: How to Solve Big Problems and Test New Ideas in Just Five Days');
/* [47] Designing Interfaces: Patterns for Effective Interaction Design (9781492051961) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781492051961-L.jpg' WHERE id = '3708bf74-cb16-4451-a8c0-7523e14992f4' OR isbn = '9781492051961' OR LOWER(title) = LOWER('Designing Interfaces: Patterns for Effective Interaction Design');
/* [48] The Lean Startup (9780307887894) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg' WHERE id = 'e5a1f0fb-bf8c-461b-b8ed-44b4a678b7f7' OR isbn = '9780307887894' OR LOWER(title) = LOWER('The Lean Startup');
/* [49] Good to Great: Why Some Companies Make the Leap (9780066620992) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780066620992-L.jpg' WHERE id = '44d14aa1-5284-445b-827b-788e499f8dfa' OR isbn = '9780066620992' OR LOWER(title) = LOWER('Good to Great: Why Some Companies Make the Leap');
/* [50] Measure What Matters: How Google Rocks the World with OKRs (9780525536222) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780525536222-L.jpg' WHERE id = 'b7797f15-76d3-47e2-b686-aebc495f0b7f' OR isbn = '9780525536222' OR LOWER(title) = LOWER('Measure What Matters: How Google Rocks the World with OKRs');
/* [51] Zero to One: Notes on Startups, or How to Build the Future (9780804139298) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg' WHERE id = 'a3f4bc32-e87d-42b9-9207-5344fb45d9c8' OR isbn = '9780804139298' OR LOWER(title) = LOWER('Zero to One: Notes on Startups, or How to Build the Future');
/* [52] Blue Ocean Strategy: How to Create Uncontested Market Space (9781625274496) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781625274496-L.jpg' WHERE id = '8a3c39fa-3fc7-4e27-93bf-12fe00a52264' OR isbn = '9781625274496' OR LOWER(title) = LOWER('Blue Ocean Strategy: How to Create Uncontested Market Space');
/* [53] Calculus: Early Transcendentals (9781337613927) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781337613927-L.jpg' WHERE id = '96c21c58-23dc-46a2-b3ef-d05ffa065653' OR isbn = '9781337613927' OR LOWER(title) = LOWER('Calculus: Early Transcendentals');
/* [54] Introduction to Linear Algebra (9780980232776) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780980232776-L.jpg' WHERE id = '779deab2-82b9-4982-add5-54bcd1430dfa' OR isbn = '9780980232776' OR LOWER(title) = LOWER('Introduction to Linear Algebra');
/* [55] Probability and Statistics for Engineers and Scientists (9780321629111) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780321629111-L.jpg' WHERE id = '95f94ef6-493d-46ae-9d32-f8cfbc5067d7' OR isbn = '9780321629111' OR LOWER(title) = LOWER('Probability and Statistics for Engineers and Scientists');
/* [56] Discrete Mathematics and Its Applications (9781259676512) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781259676512-L.jpg' WHERE id = 'a273fad6-7dec-4e1f-a0b6-2169b6593704' OR isbn = '9781259676512' OR LOWER(title) = LOWER('Discrete Mathematics and Its Applications');
/* [57] Practical Statistics for Data Scientists: 50+ Essential Concepts (9781492072942) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781492072942-L.jpg' WHERE id = '578b5bdc-1cac-49f1-8569-29fcf494ec73' OR isbn = '9781492072942' OR LOWER(title) = LOWER('Practical Statistics for Data Scientists: 50+ Essential Concepts');
/* [58] A Guide to the Project Management Body of Knowledge (PMBOK Guide) (9781628256642) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781628256642-L.jpg' WHERE id = '68dd1cd5-0f76-4d57-acf7-588b6d919f7d' OR isbn = '9781628256642' OR LOWER(title) = LOWER('A Guide to the Project Management Body of Knowledge (PMBOK Guide)');
/* [59] The Mythical Man-Month: Essays on Software Engineering (9780201835953) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780201835953-L.jpg' WHERE id = '8f72fb68-66ee-4bbd-b813-9fcce2424d27' OR isbn = '9780201835953' OR LOWER(title) = LOWER('The Mythical Man-Month: Essays on Software Engineering');
/* [60] Agile Project Management with Kanban (9780735698956) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780735698956-L.jpg' WHERE id = '55b010d5-9e05-4a4b-8651-e8f7580d3cec' OR isbn = '9780735698956' OR LOWER(title) = LOWER('Agile Project Management with Kanban');
/* [61] Scrum: The Art of Doing Twice the Work in Half the Time (9780385346450) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780385346450-L.jpg' WHERE id = '799ff58d-4b87-4705-b02b-1e55fd065a6b' OR isbn = '9780385346450' OR LOWER(title) = LOWER('Scrum: The Art of Doing Twice the Work in Half the Time');
/* [62] Making Things Happen: Mastering Project Management (9780596517717) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780596517717-L.jpg' WHERE id = 'b0071b32-9fa3-4c58-9041-bfe9c65c1411' OR isbn = '9780596517717' OR LOWER(title) = LOWER('Making Things Happen: Mastering Project Management');
/* [63] Clean Architecture: A Craftsman's Guide to Software Structure and Design (9780134494166) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780134494166-L.jpg' WHERE id = '94e76eb7-71cc-4507-b9a0-acb5d3d69807' OR isbn = '9780134494166' OR LOWER(title) = LOWER('Clean Architecture: A Craftsman''s Guide to Software Structure and Design');
/* [64] Effective Java (9780134685991) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780134685991-L.jpg' WHERE id = '73f8be95-0bf6-4126-b32b-9f1fb2c79548' OR isbn = '9780134685991' OR LOWER(title) = LOWER('Effective Java');
/* [65] Software Engineering (9780133943030) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9780133943030-L.jpg' WHERE id = '796600e2-7ba2-4ed5-b04a-14bca3759597' OR isbn = '9780133943030' OR LOWER(title) = LOWER('Software Engineering');
/* [66] Software Engineering: A Practitioner's Approach (9781260548006) */
UPDATE books SET cover_url = 'https://covers.openlibrary.org/b/isbn/9781260548006-L.jpg' WHERE id = '1667e7f1-062d-4042-ae28-10db9d42f90a' OR isbn = '9781260548006' OR LOWER(title) = LOWER('Software Engineering: A Practitioner''s Approach');

/* 3. VERIFICATION QUERIES */
SELECT count(*) AS total_books_with_real_covers FROM books WHERE cover_url IS NOT NULL AND cover_url != '';
SELECT id, name, room_type, capacity, image_url FROM rooms WHERE is_archived = false ORDER BY name;