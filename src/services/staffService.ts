import { supabase } from "./supabase";
import { createNotification } from "./notificationService";
import {
  Book,
  BookCopy,
  BookReservation,
  BorrowedBook,
  Room,
  RoomBooking,
  Announcement,
  StaffDashboardStats,
  UserProfile,
} from "../types";

// ==============================================================================
// 1. DASHBOARD & ANALYTICS
// ==============================================================================

export async function getStaffDashboardStats(): Promise<StaffDashboardStats> {
  const today = new Date().toISOString().split("T")[0];

  const [
    booksResult,
    availableBooksResult,
    reservationsResult,
    loansResult,
    overdueLoansResult,
    pendingPickupsResult,
    todayBookingsResult,
  ] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }).eq("is_archived", false),
    supabase.from("books").select("*", { count: "exact", head: true }).eq("is_archived", false).eq("availability_status", "available"),
    supabase.from("book_reservations").select("*", { count: "exact", head: true }).in("status", ["reserved", "ready_for_pickup"]),
    supabase.from("borrowed_books").select("*", { count: "exact", head: true }).eq("status", "borrowed"),
    supabase.from("borrowed_books").select("*", { count: "exact", head: true }).eq("status", "borrowed").lt("due_date", new Date().toISOString()),
    supabase.from("book_reservations").select("*", { count: "exact", head: true }).eq("status", "ready_for_pickup"),
    supabase.from("room_bookings").select("*", { count: "exact", head: true }).eq("booking_date", today).eq("status", "active"),
  ]);

  return {
    totalBooks: booksResult.count ?? 0,
    availableBooks: availableBooksResult.count ?? 0,
    activeReservations: reservationsResult.count ?? 0,
    activeLoans: loansResult.count ?? 0,
    overdueLoans: overdueLoansResult.count ?? 0,
    pendingPickups: pendingPickupsResult.count ?? 0,
    todayRoomBookings: todayBookingsResult.count ?? 0,
  };
}

export interface RecentActivityItem {
  id: string;
  type: "reservation" | "loan" | "return" | "room_booking";
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
}

export async function getRecentActivities(): Promise<RecentActivityItem[]> {
  const [resResult, loanResult, roomResult] = await Promise.all([
    supabase
      .from("book_reservations")
      .select("id, reserved_at, status, books(title), profiles:profiles!user_id(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("borrowed_books")
      .select("id, borrowed_date, returned_at, status, books(title), profiles:profiles!user_id(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("room_bookings")
      .select("id, created_at, status, rooms(name), profiles:profiles!user_id(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const activities: RecentActivityItem[] = [];

  (resResult.data ?? []).forEach((r: any) => {
    const bookTitle = r.books?.title || "Book";
    const student = `${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}`.trim() || "Student";
    activities.push({
      id: `res-${r.id}`,
      type: "reservation",
      title: `${student} reserved "${bookTitle}"`,
      subtitle: `Status: ${r.status}`,
      timestamp: r.reserved_at || new Date().toISOString(),
      status: r.status,
    });
  });

  (loanResult.data ?? []).forEach((l: any) => {
    const bookTitle = l.books?.title || "Book";
    const student = `${l.profiles?.first_name || ""} ${l.profiles?.last_name || ""}`.trim() || "Student";
    const isReturned = l.status === "returned";
    activities.push({
      id: `loan-${l.id}`,
      type: isReturned ? "return" : "loan",
      title: isReturned ? `${student} returned "${bookTitle}"` : `${student} borrowed "${bookTitle}"`,
      subtitle: `Status: ${l.status}`,
      timestamp: isReturned ? l.returned_at || l.borrowed_date : l.borrowed_date,
      status: l.status,
    });
  });

  (roomResult.data ?? []).forEach((b: any) => {
    const roomName = b.rooms?.name || "Study Room";
    const student = `${b.profiles?.first_name || ""} ${b.profiles?.last_name || ""}`.trim() || "Student";
    activities.push({
      id: `room-${b.id}`,
      type: "room_booking",
      title: `${student} booked ${roomName}`,
      subtitle: `Status: ${b.status}`,
      timestamp: b.created_at,
      status: b.status,
    });
  });

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return activities.slice(0, 10);
}

// ==============================================================================
// 2. BOOK MANAGEMENT CRUD
// ==============================================================================

export async function getStaffBooks(filters?: {
  search?: string;
  category?: string;
  availability?: string;
}): Promise<Book[]> {
  let query = supabase.from("books").select("*").order("created_at", { ascending: false });

  if (filters?.search) {
    const term = filters.search.trim().replace(/%/g, "");
    if (term) {
      query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%,isbn.ilike.%${term}%`);
    }
  }

  if (filters?.category && filters.category !== "All") {
    query = query.eq("category", filters.category);
  }

  if (filters?.availability && filters.availability !== "All") {
    query = query.eq("availability_status", filters.availability.toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    description: row.description ?? undefined,
    edition: row.edition ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    isbn: row.isbn ?? undefined,
    publisher: row.publisher ?? undefined,
    publicationYear: row.publication_year ?? undefined,
    shelfLocation: row.shelf_location ?? undefined,
    language: row.language ?? "English",
    totalCopies: row.total_copies ?? 1,
    availableCopies: row.available_copies ?? 1,
    availabilityStatus: row.availability_status ?? "available",
    isArchived: row.is_archived ?? false,
    hasCopyRecords: row.has_copy_records ?? false,
    createdAt: row.created_at,
  }));
}

export async function getStaffBookById(bookId: string): Promise<Book> {
  const { data, error } = await supabase.from("books").select("*").eq("id", bookId).single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    author: data.author,
    category: data.category,
    description: data.description ?? undefined,
    edition: data.edition ?? undefined,
    coverUrl: data.cover_url ?? undefined,
    isbn: data.isbn ?? undefined,
    publisher: data.publisher ?? undefined,
    publicationYear: data.publication_year ?? undefined,
    shelfLocation: data.shelf_location ?? undefined,
    language: data.language ?? "English",
    totalCopies: data.total_copies ?? 1,
    availableCopies: data.available_copies ?? 1,
    availabilityStatus: data.availability_status ?? "available",
    isArchived: data.is_archived ?? false,
    hasCopyRecords: data.has_copy_records ?? false,
    createdAt: data.created_at,
  };
}

export async function uploadBookCover(imageUri: string, bookId?: string): Promise<string> {
  try {
    const filename = `${bookId || Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from("book-images")
      .upload(filename, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("book-images").getPublicUrl(filename);
    return data.publicUrl;
  } catch (error: any) {
    console.warn("Could not upload book cover to storage, using original image URI:", error?.message);
    return imageUri;
  }
}

export async function createBook(bookData: {
  title: string;
  author: string;
  category: string;
  description?: string;
  edition?: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  shelfLocation?: string;
  totalCopies: number;
  coverImageUri?: string;
}): Promise<Book> {
  let coverUrl = undefined;
  if (bookData.coverImageUri) {
    coverUrl = await uploadBookCover(bookData.coverImageUri);
  }

  const { data, error } = await supabase
    .from("books")
    .insert({
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      category: bookData.category.trim(),
      description: bookData.description?.trim() || null,
      edition: bookData.edition?.trim() || null,
      isbn: bookData.isbn?.trim() || null,
      publisher: bookData.publisher?.trim() || null,
      publication_year: bookData.publicationYear || null,
      shelf_location: bookData.shelfLocation?.trim() || null,
      total_copies: Math.max(1, bookData.totalCopies),
      available_copies: Math.max(1, bookData.totalCopies),
      availability_status: "available",
      cover_url: coverUrl || null,
      has_copy_records: true,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Auto-generate physical copies
  const copiesCount = Math.max(1, bookData.totalCopies);
  for (let i = 1; i <= copiesCount; i++) {
    const copyNum = `C-${String(i).padStart(2, "0")}`;
    const barcode = `BC-${data.id.substring(0, 6).toUpperCase()}-${String(i).padStart(2, "0")}`;
    await supabase.from("book_copies").insert({
      book_id: data.id,
      copy_number: copyNum,
      barcode,
      condition: "new",
      status: "available",
      shelf_location: bookData.shelfLocation?.trim() || null,
    });
  }

  return getStaffBookById(data.id);
}

export async function updateBook(
  bookId: string,
  bookData: {
    title: string;
    author: string;
    category: string;
    description?: string;
    edition?: string;
    isbn?: string;
    publisher?: string;
    publicationYear?: number;
    shelfLocation?: string;
    coverImageUri?: string;
    availabilityStatus?: Book["availabilityStatus"];
  }
): Promise<Book> {
  let updatePayload: any = {
    title: bookData.title.trim(),
    author: bookData.author.trim(),
    category: bookData.category.trim(),
    description: bookData.description?.trim() || null,
    edition: bookData.edition?.trim() || null,
    isbn: bookData.isbn?.trim() || null,
    publisher: bookData.publisher?.trim() || null,
    publication_year: bookData.publicationYear || null,
    shelf_location: bookData.shelfLocation?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (bookData.availabilityStatus) {
    updatePayload.availability_status = bookData.availabilityStatus;
  }

  if (bookData.coverImageUri && !bookData.coverImageUri.startsWith("http")) {
    const coverUrl = await uploadBookCover(bookData.coverImageUri, bookId);
    updatePayload.cover_url = coverUrl;
  }

  const { error } = await supabase.from("books").update(updatePayload).eq("id", bookId);
  if (error) throw error;

  return getStaffBookById(bookId);
}

export async function deleteOrArchiveBook(
  bookId: string
): Promise<{ action: "deleted" | "archived"; message: string }> {
  // Check for active loans
  const { count: activeLoans, error: loanErr } = await supabase
    .from("borrowed_books")
    .select("*", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("status", "borrowed");

  if (loanErr) throw loanErr;

  if (activeLoans && activeLoans > 0) {
    throw new Error(
      `Cannot delete this book. There are currently ${activeLoans} active loan(s). You may archive it instead.`
    );
  }

  // Check for active reservations
  const { count: activeRes, error: resErr } = await supabase
    .from("book_reservations")
    .select("*", { count: "exact", head: true })
    .eq("book_id", bookId)
    .in("status", ["reserved", "ready_for_pickup"]);

  if (resErr) throw resErr;

  if (activeRes && activeRes > 0) {
    throw new Error(
      `Cannot delete this book. There are currently ${activeRes} active reservation(s).`
    );
  }

  // Safe delete
  const { error: delError } = await supabase.from("books").delete().eq("id", bookId);
  if (!delError) {
    return { action: "deleted", message: "Book successfully deleted." };
  }

  // If foreign key constraint prevents delete, archive it safely
  const { error: archiveError } = await supabase
    .from("books")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", bookId);

  if (archiveError) throw archiveError;

  return { action: "archived", message: "Book archived safely because historical loan records exist." };
}

// 2.2 PHYSICAL COPIES MANAGEMENT
export async function getBookCopies(bookId: string): Promise<BookCopy[]> {
  const { data, error } = await supabase
    .from("book_copies")
    .select("*")
    .eq("book_id", bookId)
    .order("copy_number", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    bookId: row.book_id,
    copyNumber: row.copy_number,
    barcode: row.barcode ?? undefined,
    condition: row.condition,
    status: row.status,
    shelfLocation: row.shelf_location ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createBookCopy(
  bookId: string,
  copyData: {
    copyNumber: string;
    barcode?: string;
    condition: string;
    status: string;
    shelfLocation?: string;
  }
): Promise<void> {
  const { error } = await supabase.from("book_copies").insert({
    book_id: bookId,
    copy_number: copyData.copyNumber.trim(),
    barcode: copyData.barcode?.trim() || null,
    condition: copyData.condition,
    status: copyData.status,
    shelf_location: copyData.shelfLocation?.trim() || null,
  });
  if (error) throw error;
}

export async function updateBookCopy(
  copyId: string,
  copyData: {
    condition?: string;
    status?: string;
    shelfLocation?: string;
    notes?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from("book_copies")
    .update({
      ...(copyData.condition ? { condition: copyData.condition } : {}),
      ...(copyData.status ? { status: copyData.status } : {}),
      ...(copyData.shelfLocation !== undefined ? { shelf_location: copyData.shelfLocation } : {}),
      ...(copyData.notes !== undefined ? { notes: copyData.notes } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", copyId);

  if (error) throw error;
}

export async function deleteBookCopy(copyId: string): Promise<void> {
  // Check if copy has active loan
  const { count: activeLoans } = await supabase
    .from("borrowed_books")
    .select("*", { count: "exact", head: true })
    .eq("copy_id", copyId)
    .eq("status", "borrowed");

  if (activeLoans && activeLoans > 0) {
    throw new Error("Cannot delete a copy that is currently on loan.");
  }

  const { error } = await supabase.from("book_copies").delete().eq("id", copyId);
  if (error) throw error;
}

// ==============================================================================
// 3. RESERVATION MANAGEMENT — STAFF
// ==============================================================================

export async function getAllReservations(filter?: {
  status?: string;
  search?: string;
}): Promise<BookReservation[]> {
  let query = supabase
    .from("book_reservations")
    .select("*, book:books(*), copy:book_copies(*), user:profiles!user_id(*)")
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== "All") {
    query = query.eq("status", filter.status.toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw error;

  let results: BookReservation[] = (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    copyId: row.copy_id ?? undefined,
    reservedAt: row.reserved_at,
    collectionDeadline: row.collection_deadline ?? undefined,
    readyAt: row.ready_at ?? undefined,
    collectedAt: row.collected_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    status: row.status,
    book: row.book
      ? {
          id: row.book.id,
          title: row.book.title,
          author: row.book.author,
          category: row.book.category,
          coverUrl: row.book.cover_url,
          availabilityStatus: row.book.availability_status,
        }
      : undefined,
    copy: row.copy
      ? {
          id: row.copy.id,
          bookId: row.copy.book_id,
          copyNumber: row.copy.copy_number,
          condition: row.copy.condition,
          status: row.copy.status,
        }
      : undefined,
    user: row.user
      ? {
          id: row.user.id,
          firstName: row.user.first_name,
          lastName: row.user.last_name,
          email: row.user.email,
          studentId: row.user.student_id,
          role: row.user.role,
        }
      : undefined,
  }));

  if (filter?.search) {
    const s = filter.search.toLowerCase();
    results = results.filter(
      (r) =>
        r.book?.title.toLowerCase().includes(s) ||
        r.user?.firstName.toLowerCase().includes(s) ||
        r.user?.lastName.toLowerCase().includes(s) ||
        r.user?.studentId?.toLowerCase().includes(s) ||
        r.user?.email.toLowerCase().includes(s)
    );
  }

  return results;
}

export async function markReservationReady(reservationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_reservation_ready_for_pickup", {
    p_reservation_id: reservationId,
  });

  if (error) {
    // Fallback if RPC is not present
    if (error.code === "PGRST202" || error.code === "42883") {
      const { error: updateError } = await supabase
        .from("book_reservations")
        .update({
          status: "ready_for_pickup",
          ready_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId);
      if (updateError) throw updateError;
    } else {
      throw error;
    }
  }

  // Send notification to the student
  try {
    const { data: resRow } = await supabase
      .from("book_reservations")
      .select("user_id, books(title)")
      .eq("id", reservationId)
      .maybeSingle();

    if (resRow?.user_id) {
      const bookTitle = (resRow as any).books?.title || "Book";
      await createNotification({
        userId: resRow.user_id,
        title: "Book Ready for Pickup",
        message: `"${bookTitle}" is ready for pickup at the SLIIT Library circulation counter!`,
        type: "book_available",
      });
    }
  } catch (notifErr) {
    console.warn("Could not dispatch ready notification:", notifErr);
  }
}

export async function cancelReservationStaff(
  reservationId: string,
  reason: string = "Cancelled by staff"
): Promise<void> {
  const { error } = await supabase.rpc("cancel_reservation_atomic", {
    p_reservation_id: reservationId,
    p_reason: reason,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      const { error: updateError } = await supabase
        .from("book_reservations")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId);
      if (updateError) throw updateError;
      return;
    }
    throw error;
  }
}

export async function getAllWaitingQueues(): Promise<any[]> {
  const { data, error } = await supabase
    .from("book_queue")
    .select("*, book:books(title, cover_url), user:profiles!user_id(first_name, last_name, student_id, email)")
    .eq("status", "waiting")
    .order("book_id", { ascending: true })
    .order("queue_position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ==============================================================================
// 4. LOAN MANAGEMENT — STAFF
// ==============================================================================

export async function getActiveLoans(search?: string): Promise<BorrowedBook[]> {
  const { data, error } = await supabase
    .from("borrowed_books")
    .select("*, book:books(*), copy:book_copies(*), user:profiles!user_id(*)")
    .eq("status", "borrowed")
    .order("due_date", { ascending: true });

  if (error) throw error;

  let results: BorrowedBook[] = (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    copyId: row.copy_id ?? undefined,
    issuedBy: row.issued_by ?? undefined,
    borrowedDate: row.borrowed_date,
    dueDate: row.due_date,
    returnedAt: row.returned_at ?? undefined,
    renewalCount: row.renewal_count ?? 0,
    notes: row.notes ?? undefined,
    status:
      new Date(row.due_date).getTime() < Date.now() ? "overdue" : "borrowed",
    book: row.book
      ? {
          id: row.book.id,
          title: row.book.title,
          author: row.book.author,
          category: row.book.category,
          coverUrl: row.book.cover_url,
          availabilityStatus: row.book.availability_status,
        }
      : undefined,
    copy: row.copy
      ? {
          id: row.copy.id,
          bookId: row.copy.book_id,
          copyNumber: row.copy.copy_number,
          barcode: row.copy.barcode,
          condition: row.copy.condition,
          status: row.copy.status,
        }
      : undefined,
    user: row.user
      ? {
          id: row.user.id,
          firstName: row.user.first_name,
          lastName: row.user.last_name,
          email: row.user.email,
          studentId: row.user.student_id,
          role: row.user.role,
        }
      : undefined,
  }));

  if (search) {
    const s = search.toLowerCase();
    results = results.filter(
      (l) =>
        l.book?.title.toLowerCase().includes(s) ||
        l.user?.firstName.toLowerCase().includes(s) ||
        l.user?.lastName.toLowerCase().includes(s) ||
        l.user?.studentId?.toLowerCase().includes(s)
    );
  }

  return results;
}

export async function getLoanHistory(search?: string): Promise<BorrowedBook[]> {
  const { data, error } = await supabase
    .from("borrowed_books")
    .select("*, book:books(*), copy:book_copies(*), user:profiles!user_id(*)")
    .eq("status", "returned")
    .order("returned_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  let results: BorrowedBook[] = (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    copyId: row.copy_id ?? undefined,
    issuedBy: row.issued_by ?? undefined,
    borrowedDate: row.borrowed_date,
    dueDate: row.due_date,
    returnedAt: row.returned_at ?? undefined,
    notes: row.notes ?? undefined,
    status: "returned",
    book: row.book
      ? {
          id: row.book.id,
          title: row.book.title,
          author: row.book.author,
          category: row.book.category,
          coverUrl: row.book.cover_url,
          availabilityStatus: row.book.availability_status,
        }
      : undefined,
    copy: row.copy
      ? {
          id: row.copy.id,
          bookId: row.copy.book_id,
          copyNumber: row.copy.copy_number,
          condition: row.copy.condition,
          status: row.copy.status,
        }
      : undefined,
    user: row.user
      ? {
          id: row.user.id,
          firstName: row.user.first_name,
          lastName: row.user.last_name,
          email: row.user.email,
          studentId: row.user.student_id,
          role: row.user.role,
        }
      : undefined,
  }));

  if (search) {
    const s = search.toLowerCase();
    results = results.filter(
      (l) =>
        l.book?.title.toLowerCase().includes(s) ||
        l.user?.firstName.toLowerCase().includes(s) ||
        l.user?.lastName.toLowerCase().includes(s) ||
        l.user?.studentId?.toLowerCase().includes(s)
    );
  }

  return results;
}

export async function issueLoan(
  bookId: string,
  studentId: string,
  dueDays: number = 14,
  copyId?: string,
  reservationId?: string
): Promise<any> {
  const { data, error } = await supabase.rpc("issue_book_loan", {
    p_book_id: bookId,
    p_student_id: studentId,
    p_due_days: dueDays,
    p_copy_id: copyId || null,
    p_reservation_id: reservationId || null,
  });

  if (error) throw error;
  return data;
}

export async function returnLoan(
  loanId: string,
  condition: string = "good",
  notes?: string
): Promise<any> {
  const { data, error } = await supabase.rpc("return_book_loan", {
    p_loan_id: loanId,
    p_condition: condition,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data;
}

export async function searchStudents(query: string): Promise<UserProfile[]> {
  const clean = query.trim().replace(/%/g, "");
  if (!clean) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .or(
      `first_name.ilike.%${clean}%,last_name.ilike.%${clean}%,student_id.ilike.%${clean}%,email.ilike.%${clean}%`
    )
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    studentId: row.student_id ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    role: row.role,
  }));
}

// ==============================================================================
// 5. ROOM MANAGEMENT — STAFF
// ==============================================================================

export async function getAllRooms(filters?: {
  roomType?: string;
  status?: string;
}): Promise<Room[]> {
  let query = supabase.from("rooms").select("*").order("name", { ascending: true });

  if (filters?.roomType && filters.roomType !== "All") {
    query = query.eq("room_type", filters.roomType);
  }

  if (filters?.status && filters.status !== "All") {
    query = query.eq("status", filters.status.toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    roomNumber: row.room_number ?? undefined,
    roomType: row.room_type,
    capacity: row.capacity,
    location: row.location ?? undefined,
    facilities: row.facilities ?? [],
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    status: row.status,
    isArchived: row.is_archived ?? false,
  }));
}

export async function createRoom(roomData: {
  name: string;
  roomNumber?: string;
  roomType: Room["roomType"];
  capacity: number;
  location?: string;
  facilities?: string[];
  description?: string;
  imageUri?: string;
}): Promise<Room> {
  let imageUrl = undefined;
  if (roomData.imageUri) {
    try {
      const filename = `room_${Date.now()}.jpg`;
      const response = await fetch(roomData.imageUri);
      const blob = await response.blob();
      await supabase.storage.from("room-images").upload(filename, blob, { contentType: "image/jpeg" });
      const { data } = supabase.storage.from("room-images").getPublicUrl(filename);
      imageUrl = data.publicUrl;
    } catch (e) {
      imageUrl = roomData.imageUri;
    }
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      name: roomData.name.trim(),
      room_number: roomData.roomNumber?.trim() || null,
      room_type: roomData.roomType,
      capacity: Math.max(roomData.roomType === "conference_room" ? 10 : 5, roomData.capacity),
      location: roomData.location?.trim() || null,
      facilities: roomData.facilities || [],
      description: roomData.description?.trim() || null,
      image_url: imageUrl || null,
      status: "available",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRoom(
  roomId: string,
  roomData: {
    name: string;
    roomNumber?: string;
    roomType: Room["roomType"];
    capacity: number;
    location?: string;
    facilities?: string[];
    description?: string;
    status: Room["status"];
    imageUri?: string;
  }
): Promise<void> {
  let updatePayload: any = {
    name: roomData.name.trim(),
    room_number: roomData.roomNumber?.trim() || null,
    room_type: roomData.roomType,
    capacity: Math.max(roomData.roomType === "conference_room" ? 10 : 5, roomData.capacity),
    location: roomData.location?.trim() || null,
    facilities: roomData.facilities || [],
    description: roomData.description?.trim() || null,
    status: roomData.status,
    updated_at: new Date().toISOString(),
  };

  if (roomData.imageUri && !roomData.imageUri.startsWith("http")) {
    try {
      const filename = `room_${Date.now()}.jpg`;
      const response = await fetch(roomData.imageUri);
      const blob = await response.blob();
      await supabase.storage.from("room-images").upload(filename, blob, { contentType: "image/jpeg" });
      const { data } = supabase.storage.from("room-images").getPublicUrl(filename);
      updatePayload.image_url = data.publicUrl;
    } catch (e) {
      updatePayload.image_url = roomData.imageUri;
    }
  }

  const { error } = await supabase.from("rooms").update(updatePayload).eq("id", roomId);
  if (error) throw error;
}

export async function toggleRoomStatus(roomId: string, newStatus: Room["status"]): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", roomId);
  if (error) throw error;
}

export async function deleteRoom(roomId: string): Promise<void> {
  // Check if there are active bookings
  const { data: activeBookings, error: checkError } = await supabase
    .from("room_bookings")
    .select("id")
    .eq("room_id", roomId)
    .eq("status", "active")
    .limit(1);

  if (checkError) throw checkError;

  if (activeBookings && activeBookings.length > 0) {
    throw new Error(
      "Cannot delete room: active bookings exist for this room. Please cancel or complete them first."
    );
  }

  // Attempt hard delete first
  const { error: hardDeleteErr } = await supabase.from("rooms").delete().eq("id", roomId);

  if (hardDeleteErr) {
    // If foreign key constraint prevents hard delete (e.g. historical bookings), soft-delete / archive it
    const { error: archiveErr } = await supabase
      .from("rooms")
      .update({ is_archived: true, status: "maintenance", updated_at: new Date().toISOString() })
      .eq("id", roomId);
    if (archiveErr) throw archiveErr;
  }
}

export async function getRoomBookingsForDate(roomId: string, date: string): Promise<RoomBooking[]> {
  const { data, error } = await supabase
    .from("room_bookings")
    .select("*, room:rooms(*), user:profiles!user_id(*)")
    .eq("room_id", roomId)
    .eq("booking_date", date)
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    roomId: row.room_id,
    bookingDate: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    participants: row.participants,
    status: row.status,
    cancellationReason: row.cancellation_reason ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    createdAt: row.created_at,
    room: row.room,
    user: row.user
      ? {
          id: row.user.id,
          firstName: row.user.first_name,
          lastName: row.user.last_name,
          email: row.user.email,
          studentId: row.user.student_id,
          role: row.user.role,
        }
      : undefined,
  }));
}

export async function approveRoomBookingStaff(bookingId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Staff authentication required to approve bookings.");
  }

  const { data, error } = await supabase
    .from("room_bookings")
    .update({
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select("*, room:rooms(name), user:profiles!user_id(id, first_name, last_name)")
    .single();

  if (error) throw error;

  // Dispatch notification to student
  if (data?.user_id) {
    try {
      const roomName = (data as any)?.room?.name || "Study Room";
      await createNotification({
        userId: data.user_id,
        title: "Room Booking Approved",
        message: `Your booking for ${roomName} on ${data.booking_date} (${data.start_time?.slice(0, 5)} - ${data.end_time?.slice(0, 5)}) has been approved by library staff.`,
        type: "room_booking",
      });
    } catch (notifErr) {
      console.warn("Could not dispatch approval notification:", notifErr);
    }
  }
}

export async function cancelRoomBookingStaff(
  bookingId: string,
  reason: string = "Cancelled by library staff"
): Promise<void> {
  // Fetch booking details before cancellation for notification
  const { data: bookingData } = await supabase
    .from("room_bookings")
    .select("user_id, booking_date, rooms(name)")
    .eq("id", bookingId)
    .maybeSingle();

  const { error } = await supabase.rpc("cancel_room_booking_atomic", {
    p_booking_id: bookingId,
    p_reason: reason,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      const { error: updateError } = await supabase
        .from("room_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      if (updateError) throw updateError;
    } else {
      throw error;
    }
  }

  // Dispatch cancellation notification to student
  if (bookingData?.user_id) {
    try {
      const roomName = (bookingData as any)?.rooms?.name || "Study Room";
      await createNotification({
        userId: bookingData.user_id,
        title: "Room Booking Cancelled",
        message: `Your booking for ${roomName} on ${bookingData.booking_date} was cancelled by library staff. Reason: ${reason}`,
        type: "room_booking",
      });
    } catch (notifErr) {
      console.warn("Could not dispatch cancellation notification:", notifErr);
    }
  }
}

// ==============================================================================
// 6. ANNOUNCEMENT MANAGEMENT — STAFF & ADMIN
// ==============================================================================

export async function getAnnouncements(onlyPublished: boolean = false): Promise<Announcement[]> {
  let query = supabase
    .from("announcements")
    .select("*, author:profiles!author_id(first_name, last_name)")
    .order("published_at", { ascending: false });

  if (onlyPublished) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    priority: row.priority,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    expiresAt: row.expires_at ?? undefined,
    authorId: row.author_id ?? undefined,
    createdAt: row.created_at,
    authorName: row.author
      ? `${row.author.first_name || ""} ${row.author.last_name || ""}`.trim()
      : undefined,
  }));
}

export async function createAnnouncement(announcementData: {
  title: string;
  content: string;
  category: Announcement["category"];
  priority: Announcement["priority"];
  isPublished: boolean;
  expiresAt?: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: newRows, error } = await supabase
    .from("announcements")
    .insert({
      title: announcementData.title.trim(),
      content: announcementData.content.trim(),
      category: announcementData.category,
      priority: announcementData.priority,
      is_published: announcementData.isPublished,
      expires_at: announcementData.expiresAt || null,
      author_id: user?.id || null,
    })
    .select("id");

  if (error) throw error;

  const newId = newRows?.[0]?.id;

  // If published, sync to notifications table for all users
  if (announcementData.isPublished && newId) {
    try {
      const { data: profiles } = await supabase.from("profiles").select("id");
      if (profiles && profiles.length > 0) {
        const notifPayload = profiles.map((p) => ({
          user_id: p.id,
          title: announcementData.title.trim(),
          message: announcementData.content.trim(),
          type: "system",
          is_read: false,
          announcement_id: newId,
        }));

        const { error: notifErr } = await supabase
          .from("notifications")
          .upsert(notifPayload, { onConflict: "user_id,announcement_id", ignoreDuplicates: true });

        // If announcement_id column doesn't exist yet in DB, fall back to inserting without announcement_id
        if (notifErr && (notifErr.code === "42703" || notifErr.message?.includes("announcement_id"))) {
          const fallbackPayload = profiles.map((p) => ({
            user_id: p.id,
            title: announcementData.title.trim(),
            message: announcementData.content.trim(),
            type: "system",
            is_read: false,
          }));
          await supabase.from("notifications").insert(fallbackPayload);
        }
      }
    } catch (syncErr) {
      console.warn("Client-side announcement notification sync note:", syncErr);
    }
  }
}

export async function updateAnnouncement(
  id: string,
  announcementData: {
    title: string;
    content: string;
    category: Announcement["category"];
    priority: Announcement["priority"];
    isPublished: boolean;
  }
): Promise<void> {
  const { error } = await supabase
    .from("announcements")
    .update({
      title: announcementData.title.trim(),
      content: announcementData.content.trim(),
      category: announcementData.category,
      priority: announcementData.priority,
      is_published: announcementData.isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  // Synchronize user notifications
  try {
    if (!announcementData.isPublished) {
      // If toggled to unpublished, delete all notifications for this announcement
      await supabase.from("notifications").delete().eq("announcement_id", id);
    } else {
      // If published, update all existing notifications linked to this announcement
      const { data: updatedRows, error: updateErr } = await supabase
        .from("notifications")
        .update({
          title: announcementData.title.trim(),
          message: announcementData.content.trim(),
        })
        .eq("announcement_id", id)
        .select("id");

      // If no notifications were updated (e.g. was previously unpublished), insert for all users
      if (!updateErr && (!updatedRows || updatedRows.length === 0)) {
        const { data: profiles } = await supabase.from("profiles").select("id");
        if (profiles && profiles.length > 0) {
          const notifPayload = profiles.map((p) => ({
            user_id: p.id,
            title: announcementData.title.trim(),
            message: announcementData.content.trim(),
            type: "system",
            is_read: false,
            announcement_id: id,
          }));
          await supabase
            .from("notifications")
            .upsert(notifPayload, { onConflict: "user_id,announcement_id", ignoreDuplicates: true });
        }
      }
    }
  } catch (syncErr) {
    console.warn("Client-side announcement update notification sync note:", syncErr);
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  // First clean up corresponding notifications
  try {
    await supabase.from("notifications").delete().eq("announcement_id", id);
  } catch (syncErr) {
    console.warn("Client-side announcement delete notification sync note:", syncErr);
  }

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

// ==============================================================================
// 7. USER MANAGEMENT — ADMIN
// ==============================================================================

export async function getAllUsers(filters?: {
  role?: string;
  search?: string;
  status?: string;
}): Promise<UserProfile[]> {
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

  if (filters?.role && filters.role !== "All") {
    query = query.eq("role", filters.role.toLowerCase());
  }

  if (filters?.status === "Active") {
    query = query.eq("is_active", true);
  } else if (filters?.status === "Inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;
  if (error) throw error;

  let results: UserProfile[] = (data ?? []).map((row: any) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? "",
    studentId: row.student_id ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    role: row.role,
    department: row.department ?? undefined,
    academicYear: row.academic_year ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  }));

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (u) =>
        u.firstName.toLowerCase().includes(s) ||
        u.lastName.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.studentId?.toLowerCase().includes(s)
    );
  }

  return results;
}

export async function updateUserRole(
  userId: string,
  newRole: "student" | "staff" | "admin"
): Promise<void> {
  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: userId,
    p_new_role: newRole,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (updateError) throw updateError;
      return;
    }
    throw error;
  }
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}
