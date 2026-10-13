export type BookAvailabilityStatus =
  | "available"
  | "borrowed"
  | "reserved"
  | "maintenance";

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description?: string;
  edition?: string;
  coverUrl?: string;
  availabilityStatus: BookAvailabilityStatus;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  shelfLocation?: string;
  language?: string;
  totalCopies?: number;
  availableCopies?: number;
  isArchived?: boolean;
  hasCopyRecords?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type BookCopyCondition =
  | "new"
  | "excellent"
  | "good"
  | "fair"
  | "damaged"
  | "lost";

export type BookCopyStatus =
  | "available"
  | "reserved"
  | "borrowed"
  | "damaged"
  | "lost"
  | "maintenance";

export interface BookCopy {
  id: string;
  bookId: string;
  copyNumber: string;
  barcode?: string;
  condition: BookCopyCondition;
  status: BookCopyStatus;
  shelfLocation?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  studentId?: string;
  phoneNumber?: string;
  role: "student" | "staff" | "admin";
  department?: string;
  academicYear?: string;
  avatarUrl?: string;
  isActive?: boolean;
  createdAt?: string;
}

/* BOOK RESERVATIONS */
export type BookReservationStatus =
  | "reserved"
  | "ready_for_pickup"
  | "collected"
  | "cancelled"
  | "expired";

export interface BookReservation {
  id: string;
  userId: string;
  bookId: string;
  copyId?: string;
  reservedAt: string;
  collectionDeadline?: string;
  readyAt?: string;
  collectedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  status: BookReservationStatus;
  book?: Book;
  copy?: BookCopy;
  user?: UserProfile;
}

/* BOOK QUEUE */
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
  notifiedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  notifyEnabled?: boolean;
  status: BookQueueStatus;
  book?: Book;
  user?: UserProfile;
}

/* ROOMS */
export type RoomType =
  | "study_room"
  | "conference_room"
  | "collaborative_space";

export type RoomStatus =
  | "available"
  | "unavailable"
  | "maintenance";

export interface Room {
  id: string;
  name: string;
  roomNumber?: string;
  roomType: RoomType;
  capacity: number;
  location?: string;
  facilities?: string[];
  description?: string;
  imageUrl?: string;
  status: RoomStatus;
  isArchived?: boolean;
}

/* ROOM BOOKINGS */
export type RoomBookingStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "rejected";

export interface RoomBooking {
  id: string;
  userId: string;
  roomId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  participants: number;
  status: RoomBookingStatus;
  cancellationReason?: string;
  cancelledAt?: string;
  approvedBy?: string;
  createdAt: string;
  room?: Room;
  user?: UserProfile;
}

/* BORROWED BOOKS / LOANS */
export interface BorrowedBook {
  id: string;
  userId: string;
  bookId: string;
  copyId?: string;
  issuedBy?: string;
  receivedBy?: string;
  borrowedDate: string;
  dueDate: string;
  returnedAt?: string;
  renewalCount?: number;
  notes?: string;
  status: "borrowed" | "returned" | "overdue" | "lost";
  book?: Book;
  copy?: BookCopy;
  user?: UserProfile;
}

/* NOTIFICATIONS */
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
  announcementId?: string;
}

/* ANNOUNCEMENTS */
export type AnnouncementCategory =
  | "general"
  | "holiday"
  | "events"
  | "maintenance"
  | "books";

export type AnnouncementPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  isPublished: boolean;
  publishedAt: string;
  expiresAt?: string;
  authorId?: string;
  createdAt: string;
  authorName?: string;
}

/* STAFF DASHBOARD STATS */
export interface StaffDashboardStats {
  totalBooks: number;
  availableBooks: number;
  activeReservations: number;
  activeLoans: number;
  overdueLoans: number;
  pendingPickups: number;
  todayRoomBookings: number;
}