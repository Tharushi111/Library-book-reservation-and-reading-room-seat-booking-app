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
 * Convert Supabase reservation data into the application's
 * BookReservation type.
 */
function mapReservation(row: any): BookReservation {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    reservedAt: row.reserved_at,
    collectionDeadline: row.collection_deadline ?? undefined,
    status: row.status,
    book: row.book ? mapBook(row.book) : undefined,
  };
}

/**
 * Convert Supabase queue data into the application's
 * BookQueueEntry type.
 */
function mapQueueEntry(row: any): BookQueueEntry {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    queuePosition: row.queue_position ?? undefined,
    estimatedWaitDays: row.estimated_wait_days ?? undefined,
    joinedAt: row.joined_at,
    status: row.status,
    book: row.book ? mapBook(row.book) : undefined,
  };
}

/**
 * Get the currently authenticated Supabase user.
 *
 * IMPORTANT:
 * This depends on the User Management member's login
 * creating a Supabase Auth session.
 */
async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error(
      "You must be logged in to reserve or manage a book."
    );
  }

  return user.id;
}

/**
 * Prevent special characters from breaking the search pattern.
 */
function sanitizeSearchTerm(input: string): string {
  return input
    .trim()
    .replace(/[%_]/g, "")
    .replace(/,/g, " ");
}

/**
 * Search books by title, author, or category.
 */
export async function searchBooks(query: string): Promise<Book[]> {
  const searchTerm = sanitizeSearchTerm(query);

  if (!searchTerm) {
    return getCatalogue();
  }

  const { data, error } = await supabase
    .from("books")
    .select("*")
    .or(
      `title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`
    )
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBook);
}

/**
 * Get all books in the catalogue.
 *
 * Optional category filter.
 */
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

/**
 * Get a single book by ID.
 */
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
 * Reserve a book.
 *
 * This requires a real Supabase Auth session.
 *
 * The database RLS policy checks:
 *
 * auth.uid() = user_id
 *
 * Therefore we must use the authenticated user's
 * Supabase Auth ID.
 */
export async function reserveBook(
  bookId: string
): Promise<BookReservation> {
  // Get the logged-in Supabase user.
  const userId = await getCurrentUserId();

  // Get the book and verify availability.
  const book = await getBookById(bookId);

  if (book.availabilityStatus !== "available") {
    throw new Error(
      "This book is currently unavailable. Please join the queue instead."
    );
  }

  // Reservation collection deadline = 48 hours.
  const collectionDeadline = new Date(
    Date.now() + 48 * 60 * 60 * 1000
  ).toISOString();

  // Insert reservation.
  const { data, error } = await supabase
    .from("book_reservations")
    .insert({
      book_id: bookId,
      user_id: userId,
      status: "reserved",
      collection_deadline: collectionDeadline,
    })
    .select(`
      *,
      book:books(*)
    `)
    .single();

  if (error) {
    throw error;
  }

  return mapReservation(data);
}

/**
 * Cancel a reservation belonging to the current user.
 */
export async function cancelReservation(
  reservationId: string
): Promise<void> {
  const userId = await getCurrentUserId();

  // Find the reservation first so we know which book to release.
  const {
    data: reservation,
    error: fetchError,
  } = await supabase
    .from("book_reservations")
    .select("book_id")
    .eq("id", reservationId)
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // Cancel reservation.
  const { error } = await supabase
    .from("book_reservations")
    .update({
      status: "cancelled",
    })
    .eq("id", reservationId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  // Make the book available again.
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

/**
 * Join the waiting queue for a book.
 */
/** Join the queue for a borrowed book */
export async function joinQueue(
  bookId: string,
  userId: string
): Promise<BookQueueEntry> {
  // Check that the book currently exists and is borrowed
  const book = await getBookById(bookId);

  if (book.availabilityStatus !== "borrowed") {
    throw new Error(
      "This book is not currently borrowed, so you cannot join its queue."
    );
  }

  // Check whether this user is already waiting for this book
  const { data: existingEntry, error: existingError } =
    await supabase
      .from("book_queue")
      .select("*")
      .eq("book_id", bookId)
      .eq("user_id", userId)
      .eq("status", "waiting")
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingEntry) {
    throw new Error(
      "You are already in the queue for this book."
    );
  }

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

  // New user goes to the end of the queue
  const nextPosition = (count ?? 0) + 1;

  // Simple estimated wait:
  // approximately 7 days per person ahead
  const estimatedWaitDays =
    Math.max(0, nextPosition - 1) * 7;

  const { data, error } = await supabase
    .from("book_queue")
    .insert({
      book_id: bookId,
      user_id: userId,
      queue_position: nextPosition,
      estimated_wait_days: estimatedWaitDays,
      status: "waiting",
    })
    .select("*, book:books(*)")
    .single();

  if (error) {
    throw error;
  }

  return mapQueueEntry(data);
}

/**
 * Notification preference.
 *
 * The current book_queue table does not have a notification
 * preference column, so we do not modify the database here.
 */
export async function setQueueNotify(
  queueEntryId: string,
  enabled: boolean
): Promise<void> {
  console.warn(
    "Notification preference is not currently supported by the book_queue schema.",
    {
      queueEntryId,
      enabled,
    }
  );
}

/**
 * Get one queue entry belonging to the current user.
 */
export async function getQueueEntry(
  queueEntryId: string
): Promise<BookQueueEntry> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("book_queue")
    .select(`
      *,
      book:books(*)
    `)
    .eq("id", queueEntryId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return mapQueueEntry(data);
}

/**
 * Get one reservation belonging to the current user.
 */
export async function getReservation(
  reservationId: string
): Promise<BookReservation> {
  if (!reservationId) {
    throw new Error("Reservation ID is missing.");
  }

  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("book_reservations")
    .select(`
      *,
      book:books(*)
    `)
    .eq("id", reservationId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return mapReservation(data);
}

/**
 * Get the number of users waiting for a book.
 */
export async function getQueueTotal(
  bookId: string
): Promise<number> {
  const {
    count,
    error,
  } = await supabase
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