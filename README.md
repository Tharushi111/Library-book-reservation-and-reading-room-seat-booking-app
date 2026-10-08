# SLIIT Library — Book Reservation & Reading Room Booking App

> **IT3060 — Human Computer Interaction | Year 3, Semester 2 (2026)**  
> **Milestone 03: Mobile App Implementation & Final Evaluation**  
> **Group:** WE_49

A mobile application designed to make SLIIT Library services easier to access. Students can discover books, reserve available titles, join waiting lists, and book study spaces. The app also provides a central place to review reservations and bookings. Academic staff can access applicable room-booking options.

The project translates the team's user research and high-fidelity UI/UX prototype into a working cross-platform mobile application.

## Contents

- [Overview](#overview)
- [Features](#features)
- [User roles and booking rules](#user-roles-and-booking-rules)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database and storage](#database-and-storage)
- [How to use](#how-to-use)
- [Quality checks and testing](#quality-checks-and-testing)
- [Troubleshooting](#troubleshooting)
- [Git workflow](#git-workflow)
- [Project team](#project-team)
- [Security and privacy](#security-and-privacy)
- [Future improvements](#future-improvements)
- [Academic context](#academic-context)

## Overview

Traditional library processes can require users to check availability and manage requests through multiple steps. This app brings common library tasks into one mobile experience, with an emphasis on:

- **Usability:** straightforward navigation and task-focused screens.
- **Visibility:** clear availability indicators and reservation/booking status.
- **Feedback:** confirmation screens, validation messages, and loading/error states.
- **Consistency:** shared design elements, typography, and color choices.
- **Efficiency:** convenient access to books, study spaces, and personal activity.

## Features

### 1. Authentication and account

- Email/password sign-in using Supabase Authentication.
- Account-related screens and session handling.
- User profile and account information.

### 2. Book catalogue and reservations

- Browse and search library books.
- View book details and availability.
- Reserve an available book.
- Join a waiting list when a book is unavailable.
- View reservation or queue confirmation and details.
- Review personal book reservations and their statuses.

### 3. Study-space and room bookings

- Explore study rooms and applicable conference rooms.
- View room information, capacity, images, and availability status.
- Choose a booking date and time range.
- Enter the required number of participants.
- Check existing bookings to avoid overlapping reservations.
- View booking confirmation and booking details.

### 4. Personal library activity

- Review book reservations.
- Review study-room bookings.
- View borrowed-book information, where available.
- Access notifications and recent searches through the app's account/activity flows.

> **Implementation note:** This README describes the project's planned and implemented feature areas. Availability of individual actions may depend on the latest merged branch, Supabase policies, and seeded data. Verify each flow on the final submission build.

## User roles and booking rules

The application distinguishes **students** and **academic staff**.

| Space type | Intended users | Minimum participants |
| --- | --- | ---: |
| Study room | Students | 5 |
| Conference room | Academic staff | 10 |

Booking forms validate date/time, room availability, participant count, and role eligibility. Actual booking constraints are enforced through the app's validation/service layer and applicable database policies.

## Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Mobile frontend | React Native | Cross-platform mobile interfaces |
| Development platform | Expo | App tooling and development workflow |
| Language | TypeScript | Type-safe application code |
| Navigation | React Navigation | Stack and tab navigation |
| Authentication | Supabase Auth | User sign-in and sessions |
| Database | Supabase PostgreSQL | Books, bookings, queues, and user data |
| File storage | Supabase Storage | Book covers, room images, profile images |
| Version control | Git + GitHub | Team collaboration and code history |

### UI design

The interface follows a blue-and-orange visual identity:

- **Primary blue:** `#0B4DA2`
- **Accent orange:** `#F58220`
- **Background:** `#FFFFFF`
- **Soft surface:** `#F7F9FC`

Shared UI components help maintain consistent buttons, cards, status indicators, and screen headers.

## Project structure

The app is organized by screens, reusable UI components, services, and shared utilities. A simplified overview is shown below; folder contents may differ slightly on the current branch.

```text
library-app/
├── assets/                    # Local images, icons and other assets
├── src/
│   ├── components/
│   │   └── common/             # Shared UI components
│   ├── constants/              # Shared colors and constants
│   ├── navigation/             # Navigation stacks and tabs
│   ├── screens/
│   │   ├── auth/               # Authentication screens
│   │   ├── home/               # Home/dashboard screens
│   │   ├── books/              # Catalogue, book details, reservations
│   │   └── spaces/             # Room discovery and booking screens
│   ├── services/               # Supabase client and data operations
│   ├── types/                  # TypeScript types
│   └── utils/                  # Helpers and validation
├── .env                        # Local only; DO NOT commit
├── package.json
└── README.md
```

## Getting started

### Prerequisites

Install or obtain:

- [Node.js](https://nodejs.org/) and npm.
- [Git](https://git-scm.com/).
- [Visual Studio Code](https://code.visualstudio.com/) or another editor.
- [Expo Go](https://expo.dev/go) on a compatible Android/iOS device **or** an appropriately configured emulator/simulator.
- Access to the team's **shared Supabase project** and its public project configuration.

### 1. Clone the repository

```bash
git clone https://github.com/Tharushi111/Library-book-reservation-and-reading-room-seat-booking-app.git
cd Library-book-reservation-and-reading-room-seat-booking-app
```

To work from the team's integration branch:

```bash
git checkout develop
git pull origin develop
```

> For the final submitted version, use the branch or release specified by the team (usually `main`).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Supabase

Create a `.env` file in the **project root**:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Replace the placeholders with the values supplied by the project owner. Do not use a database password or a Supabase service-role/secret key in the mobile app.

### 4. Start the app

Recommended team workflow:

```bash
npx expo start --go --tunnel
```

Then:

1. Open **Expo Go** on your phone.
2. Scan the QR code or open the Expo link displayed in the terminal.
3. Wait for Metro to bundle the app.
4. Sign in using an appropriate test account.

If local network connectivity works, you can also try:

```bash
npx expo start
```

To clear Metro's cache:

```bash
npx expo start --go --tunnel --clear
```

**Note:** Expo Go is for development/testing. A separately installed Android/iOS build requires a compatible build configuration and should be tested independently before submission.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Shared Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase public/publishable client key |

`EXPO_PUBLIC_` variables are embedded in the client app and **must not contain secrets**. Supabase Row Level Security (RLS) policies must protect user-specific records.

Recommended `.gitignore` entries:

```gitignore
.env
.env.local
.env.*.local
node_modules/
.expo/
```

You may commit a `.env.example` containing **placeholder values only**.

## Database and storage

The project uses a shared Supabase PostgreSQL backend. The team setup defines these tables:

| Table | Purpose |
| --- | --- |
| `profiles` | User information and roles |
| `books` | Catalogue and availability |
| `book_reservations` | Book reservation records |
| `book_queue` | Waiting-list entries |
| `rooms` | Study/conference room information |
| `room_bookings` | Room booking records |
| `borrowed_books` | Borrowing and return information |
| `notifications` | User notifications |
| `recent_searches` | Search history |

Supabase Storage buckets:

- `book-images` — book covers (`books.cover_url`).
- `room-images` — room photos (`rooms.image_url`).
- `profile-images` — profile pictures (`profiles.avatar_url`).

All contributors should use the **same Supabase project** and the agreed table/field names. Do not create duplicate tables or change the schema without coordinating with the team.

### Important data values

- `profiles.role`: `student`, `staff`
- `rooms.room_type`: `study_room`, `conference_room`, `collaborative_space`
- `rooms.status`: `available`, `unavailable`
- `books.availability_status`: `available`, `borrowed`, `reserved`
- `book_reservations.status`: `reserved`, `collected`, `cancelled`, `expired`
- `book_queue.status`: `waiting`, `notified`, `completed`, `cancelled`
- `room_bookings.status`: `active`, `completed`, `cancelled`

These are the team's agreed values; refer to the latest schema for any subsequent changes.

## How to use

### Reserve a book

1. Sign in.
2. Open **Search Books** or the **Book Catalogue**.
3. Search for a title and open its details.
4. If available, reserve the book and review the confirmation.
5. If unavailable, use the waiting-list option when offered.
6. Check **My Book Reservations** for updates.

### Book a study room

1. Sign in and open **Space Reservation**.
2. Browse available rooms and choose an eligible room.
3. Select a date, start time, and end time.
4. Enter the number of participants.
5. Submit the booking after validation.
6. Review the confirmation and booking details.

### Review activity

Open the relevant **My Library** or activity screen to view your reservations, room bookings, or borrowed books. Available cancellation/status actions depend on the record state and current implementation.

## Quality checks and testing

### Developer checks

Run from the repository root:

```bash
# TypeScript type checking
npx tsc --noEmit

# Expo project health check
npx expo-doctor@latest
```

Also test the main user flows on a real device or emulator with the shared Supabase backend.

### Suggested functional test coverage

| Test ID | Scenario | Expected outcome |
| --- | --- | --- |
| FT-01 | Sign in with valid credentials | User reaches the app's authenticated screens |
| FT-02 | Reserve an available book | Reservation is created and displayed |
| FT-03 | Join a book waiting list | Queue entry is created and confirmed |
| FT-04 | Book an eligible room and free time slot | Booking is created and confirmed |
| FT-05 | Attempt an overlapping room booking | Invalid/conflicting booking is prevented |
| FT-06 | Attempt booking with too few participants | Validation explains the requirement |
| FT-07 | View personal reservations | Only the signed-in user's records appear |
| FT-08 | Update a permitted profile field | Updated value persists and reloads |
| FT-09 | Cancel an eligible reservation/booking | Status changes and the UI refreshes |
| FT-10 | Simulate a connection error | A helpful error or retry state is shown |

> These are **test scenarios, not claims that every test has passed**. Record actual results, screenshots, and defects in the team's test documentation.

### HCI evaluation

For Milestone 03, the assignment requires usability testing with **at least five real or proxy participants**. Test representative tasks, such as searching for a book, joining a queue, and booking a room. Record task completion, issues encountered, participant feedback, and subsequent improvements. The final report should link requirements, prototype screens, implemented features, and functional test cases.

## Troubleshooting

| Issue | Suggested action |
| --- | --- |
| Expo QR code does not connect | Run `npx expo start --go --tunnel` |
| Metro displays stale content | Run `npx expo start --go --tunnel --clear` |
| Dependencies are missing | Run `npm install` |
| TypeScript errors | Run `npx tsc --noEmit` and inspect the reported files |
| Supabase requests fail | Check internet/DNS access, project URL, public key, and `.env` names |
| Supabase data is empty or blocked | Check login, shared project, seeded data, and RLS policies |
| Images do not load | Verify Storage bucket access and the saved image URL |
| Changes do not appear | Restart Metro after editing `.env` or changing dependencies |
| Merge conflicts | Resolve them on the feature branch and retest before opening/merging the PR |

## Git workflow

The team uses feature branches and pull requests:

- `main` — stable/final code.
- `develop` — shared integration branch.
- `feature/it23633940-core-access` — core access, home, profile, notifications.
- `feature/it23617414-books` — catalogue, book reservations, queue.
- `feature/it23609280-study-spaces` — room discovery and bookings.
- `feature/it23605534-activity` — reservations, bookings, borrowed-book activity.

Typical contribution steps:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-change

# Make and test changes...
npx tsc --noEmit

git add .
git status
git commit -m "feat: describe the completed change"
git push -u origin feature/my-change
```

Open a pull request **from the feature branch to `develop`**. After integration and testing, the team can promote the verified code to `main`.

## Project team

**Group WE_49** — four-member HCI assignment team.

| Responsibility | Assigned area |
| --- | --- |
| Member 1 — Core access | Authentication, home, profile, notifications, recent searches |
| Member 2 — Books | Book catalogue, search, details, reservations, waiting list |
| Member 3 — Study spaces | Space discovery, room selection, booking and confirmation |
| Member 4 — Activity | My reservations, room bookings, borrowed books and details |

> Add member names and university registration numbers here if your team wants them displayed publicly. Confirm the final distribution before publishing.

## Security and privacy

- Never commit `.env`, passwords, database credentials, or service-role/secret keys.
- Use the public Supabase client key only in the mobile application.
- Protect personal records with Supabase RLS and authenticated user checks.
- Do not use real student personal data as public demo data.
- Verify authorization for staff-only room booking actions.

## Future improvements

Potential enhancements beyond the current assignment scope:

- Push notifications and reminders for reservations and due dates.
- QR-based room check-in or book collection.
- Improved accessibility and assistive-technology support.
- Personalized book discovery.
- Additional usability testing and iterative design refinements.

## Academic context

This project was created for **IT3060 Human Computer Interaction**, Milestone 03, at SLIIT. It builds on requirements and user research from Milestone 01 and the low-/high-fidelity prototypes from Milestone 02. The assignment emphasizes a working app, implementation fidelity, CRUD operations, functional testing, usability evaluation, and a consolidated final report.

**Repository:** https://github.com/Tharushi111/Library-book-reservation-and-reading-room-seat-booking-app

---

*Developed as a student academic project by Group WE_49.*
