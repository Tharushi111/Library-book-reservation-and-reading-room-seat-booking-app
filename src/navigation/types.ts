// =========================================================
// ROOT STACK NAVIGATION TYPES
// =========================================================

export type RootStackParamList = {
  // =====================================================
  // AUTHENTICATION
  // =====================================================

  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;

  // =====================================================
  // STUDENT FLOW (MEMBER 1 - CORE ACCESS)
  // =====================================================

  MainTabs: undefined;

  // Search Books screen owned by Member 1
  BookSearch: undefined;

  // Additional CRUD screen
  RecentSearches: undefined;

  // Additional profile CRUD screen
  AccountSettings: undefined;

  // =====================================================
  // MEMBER 2 - BOOKS
  // =====================================================

  BookCatalogue: undefined;

  SearchResults: {
    query?: string;
  };

  BookDetails: {
    bookId: string;
  };

  ReservationConfirmation: {
    reservationId?: string;
  };

  QueueConfirmation: {
    bookId?: string;
  };

  // =====================================================
  // MEMBER 3 - STUDY SPACES
  // =====================================================

  SpaceReservation: undefined;

  StudyRooms: undefined;

  BookStudyRoom: {
    roomId: string;
  };

  BookingConfirmation: {
    bookingId?: string;
  };

  BookingDetails: {
    bookingId: string;
  };

  // =====================================================
  // MEMBER 4 - ACTIVITY
  // =====================================================

  MyBookReservations: undefined;

  MyStudyRoomBookings: undefined;

  BorrowedBooks: undefined;

  ActivityBookingDetails: {
    bookingId: string;
  };

  ReservationDetails: {
    reservationId: string;
  };

  // =====================================================
  // STAFF & ADMIN PORTAL
  // =====================================================

  StaffTabs: undefined;

  StaffBookDetails: {
    bookId: string;
  };

  StaffAddEditBook: {
    bookId?: string;
  };

  StaffLoanManagement:
    | {
        preselectedBookId?: string;
        preselectedStudentId?: string;
        preselectedReservationId?: string;
        preselectedCopyId?: string;
      }
    | undefined;

  StaffIssueLoan:
    | {
        preselectedBookId?: string;
        preselectedStudentId?: string;
        preselectedReservationId?: string;
        preselectedCopyId?: string;
      }
    | undefined;

  StaffReservationManagement: undefined;

  StaffRoomManagement: undefined;

  StaffAddEditRoom: {
    roomId?: string;
  };

  StaffRoomSchedule: {
    roomId?: string;
    roomName?: string;
  };

  StaffAnnouncement: undefined;

  StaffAddEditAnnouncement: {
    announcementId?: string;
  };

  AdminUserManagement: undefined;
};

// =========================================================
// BOTTOM TAB NAVIGATION TYPES (STUDENT)
// =========================================================

export type BottomTabParamList = {
  Home: undefined;

  // Member 2
  Books: undefined;

  // Member 3
  Spaces: undefined;

  // Member 1
  Notifications: undefined;

  // Member 1
  Profile: undefined;
};

// =========================================================
// STAFF BOTTOM TAB NAVIGATION TYPES
// =========================================================

export type StaffTabParamList = {
  StaffDashboard: undefined;
  StaffBooks: undefined;
  StaffReservations: undefined;
  StaffLoans:
    | {
        preselectedBookId?: string;
        preselectedStudentId?: string;
        preselectedReservationId?: string;
        preselectedCopyId?: string;
      }
    | undefined;
  StaffMore: undefined;
};