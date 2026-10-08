export type BookAvailabilityStatus =
  | "available"
  | "borrowed";

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description?: string;
  edition?: string;
  coverUrl?: string;
  availabilityStatus: BookAvailabilityStatus;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId?: string;
  phoneNumber?: string;
  role: "student" | "staff";
}


/* BOOK RESERVATIONS                                  */
export type BookReservationStatus =
  | "reserved"
  | "collected"
  | "cancelled"
  | "expired";

export interface BookReservation {
  id: string;
  userId: string;
  bookId: string;

  reservedAt: string;
  collectionDeadline?: string;

  status: BookReservationStatus;

  book?: Book;
}

/* BOOK QUEUE                                         */
export type BookQueueStatus =
  | "waiting"
  | "notified"
  | "completed"
  | "cancelled";

export interface BookQueueEntry {
  id: string;
  userId: string;
  bookId: string;

  queuePosition?: number;
  estimatedWaitDays?: number;

  joinedAt: string;

  notifyEnabled?: boolean;

  status: BookQueueStatus;

  book?: Book;
}


/* ROOMS                                              */
export type RoomType =
  | "study_room"
  | "conference_room"
  | "collaborative_space";

export type RoomStatus =
  | "available"
  | "unavailable";

export interface Room {
  id: string;
  name: string;
  roomType: RoomType;
  capacity: number;
  description?: string;
  imageUrl?: string;
  status: RoomStatus;
}

/* ROOM BOOKINGS                                      */
export type RoomBookingStatus =
  | "active"
  | "completed"
  | "cancelled";

export interface RoomBooking {
  id: string;
  userId: string;
  roomId: string;

  bookingDate: string;
  startTime: string;
  endTime: string;

  participants: number;

  status: RoomBookingStatus;
  createdAt: string;

  room?: Room;
}

/* BORROWED BOOKS                                     */
export interface BorrowedBook {
  id: string;
  userId: string;
  bookId: string;

  borrowedDate: string;
  dueDate: string;
  returnedAt?: string;

  status:
    | "borrowed"
    | "returned"
    | "overdue";

  book?: Book;
}

/* NOTIFICATIONS                                      */
export type NotificationType =
  | "book_available"
  | "collection_reminder"
  | "due_date"
  | "room_booking"
  | "system";

export interface Notification {
  id: string;
  userId: string;

  title: string;
  message: string;

  type: NotificationType;

  isRead: boolean;
  createdAt: string;
}