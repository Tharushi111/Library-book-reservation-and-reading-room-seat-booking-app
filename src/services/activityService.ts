import { supabase } from "./supabase";

export interface ReservationItem {
  id: string;
  bookId: string;
  title: string;
  status: string;
  dateLabel: string;
  date: string;
  image: string;
  collectionDeadline?: string;
  reservedAt?: string;
  isMock?: boolean;
}

export interface RoomBookingItem {
  id: string;
  roomId?: string;
  room: string;
  floor: string;
  seat: string;
  date: string;
  time: string;
  status: string;
  image: string;
  participants?: number;
  isMock?: boolean;
}

export interface BorrowedBookItem {
  id: string;
  bookId?: string;
  title: string;
  dueIn: string;
  dueDate: string;
  image: string;
  status: string;
  isMock?: boolean;
}

// Fallback demo data when database is empty or user is not logged in
const FALLBACK_RESERVATIONS: ReservationItem[] = [
  {
    id: "RES-10245",
    bookId: "BK1024",
    title: "Database Systems",
    status: "Reserved",
    dateLabel: "Collect By",
    date: "12 Sep 2026",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300",
    reservedAt: "10 Sep 2026",
    collectionDeadline: "12 Sep 2026",
    isMock: true,
  },
  {
    id: "RES-20874",
    bookId: "BK2087",
    title: "Software Engineering",
    status: "Ready for Collection",
    dateLabel: "Collect By",
    date: "14 Sep 2026",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300",
    reservedAt: "11 Sep 2026",
    collectionDeadline: "14 Sep 2026",
    isMock: true,
  },
  {
    id: "RES-35678",
    bookId: "BK3567",
    title: "Web Technologies",
    status: "Reserved",
    dateLabel: "Collect By",
    date: "16 Sep 2026",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=300",
    reservedAt: "12 Sep 2026",
    collectionDeadline: "16 Sep 2026",
    isMock: true,
  },
  {
    id: "RES-11311",
    bookId: "BK1131",
    title: "Data Structures",
    status: "Collected",
    dateLabel: "Collected on",
    date: "02 Sep 2026",
    image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300",
    isMock: true,
  },
  {
    id: "RES-33314",
    bookId: "BK3331",
    title: "Human Computer Interaction",
    status: "Cancelled",
    dateLabel: "Cancelled on",
    date: "28 Aug 2026",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=300",
    isMock: true,
  },
];

const FALLBACK_ROOM_BOOKINGS: RoomBookingItem[] = [
  {
    id: "BKG-001",
    room: "Study Room A",
    floor: "Floor 2",
    seat: "A-12",
    date: "13 Sep 2026",
    time: "10:00 AM - 12:00 PM",
    status: "Confirmed",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300",
    isMock: true,
  },
  {
    id: "BKG-002",
    room: "Study Room B",
    floor: "Floor 2",
    seat: "B-04",
    date: "14 Sep 2026",
    time: "01:00 PM - 03:00 PM",
    status: "Confirmed",
    image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300",
    isMock: true,
  },
];

const FALLBACK_BORROWED_BOOKS: BorrowedBookItem[] = [
  {
    id: "BRW-01",
    title: "Database Systems",
    dueIn: "Due in 3 days",
    dueDate: "15 Sep 2026",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300",
    status: "borrowed",
    isMock: true,
  },
  {
    id: "BRW-02",
    title: "Web Technologies",
    dueIn: "Due in 7 days",
    dueDate: "20 Sep 2026",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=300",
    status: "borrowed",
    isMock: true,
  },
  {
    id: "BRW-03",
    title: "Web Development",
    dueIn: "Due in 15 days",
    dueDate: "28 Sep 2026",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300",
    status: "borrowed",
    isMock: true,
  },
  {
    id: "BRW-04",
    title: "Clean Code",
    dueIn: "Due in 20 days",
    dueDate: "05 Oct 2026",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=300",
    status: "borrowed",
    isMock: true,
  },
];

/**
 * Helper to format date strings
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Helper to calculate due days
 */
function calculateDueIn(dueDateStr: string): string {
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  } else if (diffDays === 0) {
    return "Due today";
  } else {
    return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }
}

/**
 * Fetch Book Reservations for current user (READ)
 */
export async function getUserReservations(): Promise<ReservationItem[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from("book_reservations")
      .select("*, books(*)")
      .order("created_at", { ascending: false });

    if (user?.id) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Supabase query error for book_reservations:", error.message);
      return FALLBACK_RESERVATIONS;
    }

    if (!data || data.length === 0) {
      return FALLBACK_RESERVATIONS;
    }

    return data.map((item: any) => {
      const book = item.books || {};
      const statusCapitalized =
        item.status === "reserved"
          ? "Reserved"
          : item.status === "collected"
          ? "Collected"
          : item.status === "cancelled"
          ? "Cancelled"
          : item.status === "expired"
          ? "Expired"
          : item.status || "Reserved";

      return {
        id: item.id,
        bookId: item.book_id || book.id || "N/A",
        title: book.title || "Untitled Book",
        status: statusCapitalized,
        dateLabel: "Collect By",
        date: formatDate(item.collection_deadline || item.reserved_at),
        image:
          book.cover_url ||
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300",
        reservedAt: formatDate(item.reserved_at),
        collectionDeadline: formatDate(item.collection_deadline),
        isMock: false,
      };
    });
  } catch (err) {
    console.warn("Error fetching reservations:", err);
    return FALLBACK_RESERVATIONS;
  }
}

/**
 * Cancel a Book Reservation (UPDATE)
 */
export async function cancelReservation(reservationId: string): Promise<{ success: boolean; message: string }> {
  try {
    // If it's a mock reservation
    if (reservationId.startsWith("RES-")) {
      // Find in fallback and update
      const target = FALLBACK_RESERVATIONS.find((r) => r.id === reservationId);
      if (target) {
        target.status = "Cancelled";
      }
      return { success: true, message: "Reservation cancelled successfully" };
    }

    const { error } = await supabase
      .from("book_reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId);

    if (error) {
      throw error;
    }

    return { success: true, message: "Reservation cancelled successfully" };
  } catch (err: any) {
    console.error("Error cancelling reservation:", err);
    return {
      success: false,
      message: err.message || "Failed to cancel reservation",
    };
  }
}

/**
 * Fetch Room Bookings for current user (READ)
 */
export async function getUserRoomBookings(): Promise<RoomBookingItem[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from("room_bookings")
      .select("*, rooms(*)")
      .order("booking_date", { ascending: false });

    if (user?.id) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Supabase query error for room_bookings:", error.message);
      return FALLBACK_ROOM_BOOKINGS;
    }

    if (!data || data.length === 0) {
      return FALLBACK_ROOM_BOOKINGS;
    }

    return data.map((item: any) => {
      const room = item.rooms || {};
      const statusText =
        item.status === "active"
          ? "Confirmed"
          : item.status === "completed"
          ? "Completed"
          : item.status === "cancelled"
          ? "Cancelled"
          : item.status || "Confirmed";

      return {
        id: item.id,
        roomId: item.room_id,
        room: room.name || "Study Room",
        floor: room.room_type ? room.room_type.replace("_", " ").toUpperCase() : "Study Space",
        seat: `Capacity: ${room.capacity || item.participants || 4}`,
        date: formatDate(item.booking_date),
        time: `${item.start_time || "10:00 AM"} - ${item.end_time || "12:00 PM"}`,
        status: statusText,
        image:
          room.image_url ||
          "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300",
        participants: item.participants,
        isMock: false,
      };
    });
  } catch (err) {
    console.warn("Error fetching room bookings:", err);
    return FALLBACK_ROOM_BOOKINGS;
  }
}

/**
 * Cancel a Room Booking (UPDATE)
 */
export async function cancelRoomBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (bookingId.startsWith("BKG-")) {
      const target = FALLBACK_ROOM_BOOKINGS.find((b) => b.id === bookingId);
      if (target) {
        target.status = "Cancelled";
      }
      return { success: true, message: "Booking cancelled successfully" };
    }

    const { error } = await supabase
      .from("room_bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      throw error;
    }

    return { success: true, message: "Booking cancelled successfully" };
  } catch (err: any) {
    console.error("Error cancelling room booking:", err);
    return {
      success: false,
      message: err.message || "Failed to cancel booking",
    };
  }
}

/**
 * Fetch Borrowed Books for current user (READ)
 */
export async function getUserBorrowedBooks(): Promise<BorrowedBookItem[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from("borrowed_books")
      .select("*, books(*)")
      .order("due_date", { ascending: true });

    if (user?.id) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Supabase query error for borrowed_books:", error.message);
      return FALLBACK_BORROWED_BOOKS;
    }

    if (!data || data.length === 0) {
      return FALLBACK_BORROWED_BOOKS;
    }

    return data.map((item: any) => {
      const book = item.books || {};
      return {
        id: item.id,
        bookId: item.book_id,
        title: book.title || "Untitled Book",
        dueIn: calculateDueIn(item.due_date),
        dueDate: formatDate(item.due_date),
        image:
          book.cover_url ||
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300",
        status: item.status || "borrowed",
        isMock: false,
      };
    });
  } catch (err) {
    console.warn("Error fetching borrowed books:", err);
    return FALLBACK_BORROWED_BOOKS;
  }
}

/**
 * Fetch Single Reservation Details (READ)
 */
export async function getReservationDetails(reservationId: string): Promise<ReservationItem | null> {
  try {
    if (reservationId.startsWith("RES-")) {
      const fallback = FALLBACK_RESERVATIONS.find((r) => r.id === reservationId);
      return fallback || null;
    }

    const { data, error } = await supabase
      .from("book_reservations")
      .select("*, books(*)")
      .eq("id", reservationId)
      .single();

    if (error || !data) {
      return null;
    }

    const book = data.books || {};
    const statusCapitalized =
      data.status === "reserved"
        ? "Reserved"
        : data.status === "collected"
        ? "Collected"
        : data.status === "cancelled"
        ? "Cancelled"
        : data.status === "expired"
        ? "Expired"
        : data.status || "Reserved";

    return {
      id: data.id,
      bookId: data.book_id || book.id || "N/A",
      title: book.title || "Untitled Book",
      status: statusCapitalized,
      dateLabel: "Collect By",
      date: formatDate(data.collection_deadline || data.reserved_at),
      image:
        book.cover_url ||
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300",
      reservedAt: formatDate(data.reserved_at),
      collectionDeadline: formatDate(data.collection_deadline),
      isMock: false,
    };
  } catch (err) {
    console.warn("Error fetching reservation details:", err);
    return null;
  }
}
