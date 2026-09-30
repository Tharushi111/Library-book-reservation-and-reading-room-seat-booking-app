export type RootStackParamList = {
  // Member 1 - Core Access
  Login: undefined;
  MainTabs: undefined;
  RecentSearches: undefined;
  AccountSettings: undefined;

  // Member 2 - Books
  BookCatalogue: undefined;
  SearchResults: { query?: string };
  BookDetails: { bookId: string };
  BorrowedBookDetails: { bookId: string };
  ReservationConfirmation: {
    reservationId?: string;
  };
  QueueConfirmation: {
    bookId?: string;
  };

  // Member 3 - Study Spaces
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

  // Member 4 - Activity
  MyBookReservations: undefined;
  MyStudyRoomBookings: undefined;
  BorrowedBooks: undefined;
  ReservationDetails: {
    reservationId: string;
  };
};

export type BottomTabParamList = {
  Home: undefined;
  Books: undefined;
  Spaces: undefined;
  Notifications: undefined;
  Profile: undefined;
};