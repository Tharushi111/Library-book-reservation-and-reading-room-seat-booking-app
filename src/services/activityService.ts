import { supabase } from "./supabase";
import {
  cancelReservation as cancelBookReservation,
  expireOverdueReservations,
} from "./bookService";

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

const DEFAULT_BOOK_IMAGE =
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300";

const DEFAULT_ROOM_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time?: string | null): string {
  if (!time) return "N/A";

  const parts = time.split(":");
  if (parts.length < 2) return time;

  const hour24 = Number(parts[0]);
  const minute = parts[1];

  if (Number.isNaN(hour24)) return time;

  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

function calculateDueIn(dueDateStr?: string | null): string {
  if (!dueDateStr) return "Due date unavailable";

  const due = new Date(dueDateStr);
  if (Number.isNaN(due.getTime())) return "Due date unavailable";

  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }

  if (diffDays === 0) return "Due today";

  return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

function reservationStatus(status?: string | null): string {
  switch ((status || "").toLowerCase()) {
    case "reserved":
      return "Reserved";
    case "ready_for_collection":
    case "ready for collection":
      return "Ready for Collection";
    case "collected":
      return "Collected";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    case "returned":
      return "Returned";
    default:
      return status || "Reserved";
  }
}

function bookingStatus(status?: string | null): string {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status || "Confirmed";
  }
}

async function getSignedInUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn("Unable to read current user:", error.message);
    return null;
  }

  return user?.id ?? null;
}

/**
 * READ: Return only the currently logged-in user's book reservations.
 * There is intentionally NO demo/fallback data here.
 */
export async function getUserReservations(): Promise<ReservationItem[]> {
  try {
    const userId = await getSignedInUserId();
    if (!userId) return [];

    try {
      await expireOverdueReservations();
    } catch (expiryError) {
      console.warn("Could not expire overdue reservations:", expiryError);
    }

    const { data, error } = await supabase
      .from("book_reservations")
      .select("*, books(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase query error for book_reservations:", error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((item: any) => {
      const book = item.books || {};
      const status = reservationStatus(item.status);

      let dateLabel = "Collect By";
      if (status === "Collected") dateLabel = "Collected";
      if (status === "Cancelled") dateLabel = "Cancelled";
      if (status === "Expired") dateLabel = "Expired";
      if (status === "Returned") dateLabel = "Returned";

      return {
        id: item.id,
        bookId: item.book_id || book.id || "",
        title: book.title || "Untitled Book",
        status,
        dateLabel,
        date: formatDate(item.collection_deadline || item.reserved_at || item.created_at),
        image: book.cover_url || DEFAULT_BOOK_IMAGE,
        reservedAt: formatDate(item.reserved_at || item.created_at),
        collectionDeadline: formatDate(item.collection_deadline),
        isMock: false,
      };
    });
  } catch (error) {
    console.warn("Error fetching reservations:", error);
    return [];
  }
}

/**
 * UPDATE: Cancel one reservation belonging to the current user.
 */
export async function cancelReservation(
  reservationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getSignedInUserId();

    if (!userId) {
      return {
        success: false,
        message: "Please sign in again before cancelling a reservation.",
      };
    }

    // bookService.cancelReservation already protects the operation by user_id
    // and updates the global book availability correctly.
    await cancelBookReservation(reservationId);

    return {
      success: true,
      message: "Reservation cancelled successfully",
    };
  } catch (error: any) {
    console.error("Error cancelling reservation:", error);

    return {
      success: false,
      message: error?.message || "Failed to cancel reservation",
    };
  }
}

/**
 * READ: Return only the currently logged-in user's room bookings.
 * There is intentionally NO demo/fallback data here.
 */
export async function getUserRoomBookings(): Promise<RoomBookingItem[]> {
  try {
    const userId = await getSignedInUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from("room_bookings")
      .select("*, rooms(*)")
      .eq("user_id", userId)
      .order("booking_date", { ascending: false });

    if (error) {
      console.warn("Supabase query error for room_bookings:", error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((item: any) => {
      const room = item.rooms || {};

      return {
        id: item.id,
        roomId: item.room_id,
        room: room.name || "Study Room",
        floor: room.room_type
          ? String(room.room_type).replace(/_/g, " ").toUpperCase()
          : "Study Space",
        seat: `Capacity: ${room.capacity || item.participants || 4}`,
        date: formatDate(item.booking_date),
        time: `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`,
        status: bookingStatus(item.status),
        image: room.image_url || DEFAULT_ROOM_IMAGE,
        participants: item.participants,
        isMock: false,
      };
    });
  } catch (error) {
    console.warn("Error fetching room bookings:", error);
    return [];
  }
}

/**
 * UPDATE: Cancel one room booking belonging to the current user.
 */
export async function cancelRoomBooking(
  bookingId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getSignedInUserId();

    if (!userId) {
      return {
        success: false,
        message: "Please sign in again before cancelling a booking.",
      };
    }

    const { data, error } = await supabase
      .from("room_bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        success: false,
        message: "Booking not found or it does not belong to this account.",
      };
    }

    return {
      success: true,
      message: "Booking cancelled successfully",
    };
  } catch (error: any) {
    console.error("Error cancelling room booking:", error);

    return {
      success: false,
      message: error?.message || "Failed to cancel booking",
    };
  }
}

/**
 * READ: Return only active borrowed/overdue books for the current user.
 * There is intentionally NO demo/fallback data here.
 */
export async function getUserBorrowedBooks(): Promise<BorrowedBookItem[]> {
  try {
    const userId = await getSignedInUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from("borrowed_books")
      .select("*, books(*)")
      .eq("user_id", userId)
      .in("status", ["borrowed", "overdue"])
      .order("due_date", { ascending: true });

    if (error) {
      console.warn("Supabase query error for borrowed_books:", error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((item: any) => {
      const book = item.books || {};

      return {
        id: item.id,
        bookId: item.book_id,
        title: book.title || "Untitled Book",
        dueIn: calculateDueIn(item.due_date),
        dueDate: formatDate(item.due_date),
        image: book.cover_url || DEFAULT_BOOK_IMAGE,
        status: item.status || "borrowed",
        isMock: false,
      };
    });
  } catch (error) {
    console.warn("Error fetching borrowed books:", error);
    return [];
  }
}

/**
 * READ: Return one reservation only if it belongs to the current user.
 */
export async function getReservationDetails(
  reservationId: string
): Promise<ReservationItem | null> {
  try {
    const userId = await getSignedInUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from("book_reservations")
      .select("*, books(*)")
      .eq("id", reservationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Error fetching reservation details:", error.message);
      return null;
    }

    if (!data) return null;

    const book = data.books || {};
    const status = reservationStatus(data.status);

    let dateLabel = "Collect By";
    if (status === "Collected") dateLabel = "Collected";
    if (status === "Cancelled") dateLabel = "Cancelled";
    if (status === "Expired") dateLabel = "Expired";
    if (status === "Returned") dateLabel = "Returned";

    return {
      id: data.id,
      bookId: data.book_id || book.id || "",
      title: book.title || "Untitled Book",
      status,
      dateLabel,
      date: formatDate(data.collection_deadline || data.reserved_at || data.created_at),
      image: book.cover_url || DEFAULT_BOOK_IMAGE,
      reservedAt: formatDate(data.reserved_at || data.created_at),
      collectionDeadline: formatDate(data.collection_deadline),
      isMock: false,
    };
  } catch (error) {
    console.warn("Error fetching reservation details:", error);
    return null;
  }
}

/**
 * READ: Return one room booking only if it belongs to the current user.
 */
export async function getBookingDetails(
  bookingId: string
): Promise<RoomBookingItem | null> {
  try {
    const userId = await getSignedInUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from("room_bookings")
      .select("*, rooms(*)")
      .eq("id", bookingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Error fetching booking details:", error.message);
      return null;
    }

    if (!data) return null;

    const room = data.rooms || {};

    return {
      id: data.id,
      roomId: data.room_id,
      room: room.name || "Study Room",
      floor: room.room_type
        ? String(room.room_type).replace(/_/g, " ").toUpperCase()
        : "Study Space",
      seat: `Capacity: ${room.capacity || data.participants || 4}`,
      date: formatDate(data.booking_date),
      time: `${formatTime(data.start_time)} - ${formatTime(data.end_time)}`,
      status: bookingStatus(data.status),
      image: room.image_url || DEFAULT_ROOM_IMAGE,
      participants: data.participants,
      isMock: false,
    };
  } catch (error) {
    console.warn("Error fetching booking details:", error);
    return null;
  }
}

/**
 * READ: Show active waiting-list entries for the signed-in student.
 * The database trigger is responsible for maintaining queue_position.
 */
export interface WaitingListItem {
  id: string;
  bookId: string;
  title: string;
  image: string;
  status: "waiting" | "notified";
  queuePosition: number | null;
  joinedDate: string;
  notifyEnabled: boolean;
}

export async function getUserWaitingList(): Promise<WaitingListItem[]> {
  const userId = await getSignedInUserId();
  if (!userId) throw new Error("Please sign in to view your waiting list.");

  const { data, error } = await supabase
    .from("book_queue")
    .select(
      "id, book_id, queue_position, joined_at, status, notify_enabled, books(title, cover_url)"
    )
    .eq("user_id", userId)
    .in("status", ["waiting", "notified"])
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const book = Array.isArray(row.books) ? row.books[0] : row.books;
    return {
      id: row.id,
      bookId: row.book_id,
      title: book?.title || "Untitled Book",
      image: book?.cover_url || DEFAULT_BOOK_IMAGE,
      status: row.status === "notified" ? "notified" : "waiting",
      queuePosition:
        typeof row.queue_position === "number" && row.queue_position > 0
          ? row.queue_position
          : null,
      joinedDate: formatDate(row.joined_at),
      notifyEnabled: row.notify_enabled === true,
    };
  });
}

/**
 * DELETE: Leave only the signed-in user's own active queue entry.
 * Supabase RLS and the database queue-position trigger handle authorization
 * and renumbering, respectively.
 */
export async function leaveUserWaitingList(queueEntryId: string): Promise<void> {
  const userId = await getSignedInUserId();
  if (!userId) throw new Error("Please sign in to leave the waiting list.");

  const { data, error } = await supabase
    .from("book_queue")
    .delete()
    .eq("id", queueEntryId)
    .eq("user_id", userId)
    .in("status", ["waiting", "notified"])
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Queue entry not found or already removed.");
}

/**
 * Listen for updates to this user's queue entries, including renumbering
 * caused by another student leaving the same book's queue.
 * Requires book_queue to be enabled in the Supabase Realtime publication.
 */
export async function subscribeToMyWaitingList(
  onChange: () => void
): Promise<() => void> {
  const userId = await getSignedInUserId();
  if (!userId) return () => {};

  const channel = supabase
    .channel(`my-waiting-list-${userId}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "book_queue",
        filter: `user_id=eq.${userId}`,
      },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
