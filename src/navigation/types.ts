// =========================================================
// ROOT STACK NAVIGATION TYPES
// =========================================================

export type RootStackParamList = {
  // =====================================================
  // MEMBER 1 - CORE ACCESS
  // =====================================================

  Login: undefined;

  MainTabs: undefined;

  // Search Books screen owned by Member 1
  BookSearch: undefined;

  // Additional CRUD screen
  RecentSearches: undefined;

  // Additional profile CRUD screen
  AccountSettings: undefined;

  // MEMBER 2 - BOOKS

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
};

// =========================================================
// BOTTOM TAB NAVIGATION TYPES
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