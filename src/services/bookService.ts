import { supabase } from "./supabase";

import type {
  Book,
  BookReservation,
  BookQueueEntry,
} from "../types";

/**
 * Convert Supabase book data into the application's Book type.
 */
function mapBook(row: any): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    description: row.description ?? undefined,
    edition: row.edition ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    availabilityStatus: row.availability_status,
  };
}

/**
 * Convert Supabase reservation data into BookReservation.
 */
function mapReservation(row: any): BookReservation {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    reservedAt: row.reserved_at,
    collectionDeadline:
      row.collection_deadline ?? undefined,
    status: row.status,
    book: row.book
      ? mapBook(row.book)
      : undefined,
  };
}

/**
 * Convert Supabase queue data into BookQueueEntry.
 */
function mapQueueEntry(row: any): BookQueueEntry {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    queuePosition:
      row.queue_position ?? undefined,
    estimatedWaitDays:
      row.estimated_wait_days ?? undefined,
    joinedAt: row.joined_at,
    status: row.status,
    book: row.book
      ? mapBook(row.book)
      : undefined,
  };
}

/** - Search the catalogue by title or author */
export async function searchBooks(
  query: string
): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .or(
      `title.ilike.%${query}%,author.ilike.%${query}%`
    )
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBook);
}

/** Browse the full catalogue, optionally filtered by category */
export async function getCatalogue(
  category?: string
): Promise<Book[]> {
  let query = supabase
    .from("books")
    .select("*")
    .order("title", { ascending: true });

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBook);
}

/** - Get a single book with current availability */
export async function getBookById(
  bookId: string
): Promise<Book> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (error) {
    throw error;
  }

  return mapBook(data);
}

/**
 * — Reserve an available book.
 *
 * Creates a reservation with a 48-hour collection deadline.
 */
export async function reserveBook(
  bookId: string,
  userId: string
): Promise<BookReservation> {
  const book = await getBookById(bookId);

  if (book.availabilityStatus !== "available") {
    throw new Error(
      "This book is currently unavailable — join the queue instead."
    );
  }

  // 48-hour collection deadline
  const collectionDeadline = new Date(
    Date.now() + 48 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("book_reservations")
    .insert({
      book_id: bookId,
      user_id: userId,
      status: "reserved",
      collection_deadline: collectionDeadline,
    })
    .select("*, book:books(*)")
    .single();

  if (error) {
    throw error;
  }

  // Update book availability
  const { error: updateError } = await supabase
    .from("books")
    .update({
      availability_status: "reserved",
    })
    .eq("id", bookId);

  if (updateError) {
    throw updateError;
  }

  return mapReservation(data);
}

/** — Cancel an active book reservation */
export async function cancelReservation(
  reservationId: string
): Promise<void> {
  // Find the book connected to the reservation
  const { data: reservation, error: fetchError } =
    await supabase
      .from("book_reservations")
      .select("book_id")
      .eq("id", reservationId)
      .single();

  if (fetchError) {
    throw fetchError;
  }

  // Cancel the reservation
  const { error } = await supabase
    .from("book_reservations")
    .update({
      status: "cancelled",
    })
    .eq("id", reservationId);

  if (error) {
    throw error;
  }

  // Make the book available again
  if (reservation?.book_id) {
    const { error: bookError } = await supabase
      .from("books")
      .update({
        availability_status: "available",
      })
      .eq("id", reservation.book_id);

    if (bookError) {
      throw bookError;
    }
  }
}

/** — Join the queue for a borrowed book */
export async function joinQueue(
  bookId: string,
  userId: string
): Promise<BookQueueEntry> {
  // Count current people waiting
  const { count, error: countError } =
    await supabase
      .from("book_queue")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("book_id", bookId)
      .eq("status", "waiting");

  if (countError) {
    throw countError;
  }

  const nextPosition = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("book_queue")
    .insert({
      book_id: bookId,
      user_id: userId,
      queue_position: nextPosition,
      status: "waiting",
    })
    .select("*, book:books(*)")
    .single();

  if (error) {
    throw error;
  }

  return mapQueueEntry(data);
}

/** F— Toggle notification preference */
export async function setQueueNotify(
  queueEntryId: string,
  enabled: boolean
): Promise<void> {
  // current book_queue table does NOT contain
  // a notify_enabled column.
  //
  // Therefore this function cannot update a notification
  // preference until that column is added to the database.

  console.warn(
    "Notification preference is not currently supported by the book_queue schema."
  );
}

/** Fetch a single queue entry */
export async function getQueueEntry(
  queueEntryId: string
): Promise<BookQueueEntry> {
  const { data, error } = await supabase
    .from("book_queue")
    .select("*, book:books(*)")
    .eq("id", queueEntryId)
    .single();

  if (error) {
    throw error;
  }

  return mapQueueEntry(data);
}

/** Fetch a single reservation */
export async function getReservation(
  reservationId: string
): Promise<BookReservation> {
  const { data, error } = await supabase
    .from("book_reservations")
    .select("*, book:books(*)")
    .eq("id", reservationId)
    .single();

  if (error) {
    throw error;
  }

  return mapReservation(data);
}

/** Count total people waiting in a book's queue */
export async function getQueueTotal(
  bookId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("book_queue")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("book_id", bookId)
    .eq("status", "waiting");

  if (error) {
    throw error;
  }

  return count ?? 0;
}