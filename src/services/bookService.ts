import { supabase } from "./supabase";

import type {
  Book,
  BookAvailabilityStatus,
  BookQueueEntry,
  BookReservation,
} from "../types";

/* ================================================== */
/* MAPPERS                                            */
/* ================================================== */

function mapBook(
  row: any,
  availabilityStatus?: BookAvailabilityStatus
): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,

    description: row.description ?? undefined,
    edition: row.edition ?? undefined,
    coverUrl: row.cover_url ?? undefined,

    availabilityStatus:
      availabilityStatus ??
      row.availability_status ??
      "available",
  };
}

function mapReservation(
  row: any
): BookReservation {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,

    reservedAt:
      row.reserved_at ??
      row.created_at,

    collectionDeadline:
      row.collection_deadline ??
      row.reservation_deadline ??
      undefined,

    status: row.status,

    book: row.book
      ? mapBook(row.book)
      : undefined,
  };
}

function mapQueueEntry(
  row: any
): BookQueueEntry {
  return {
    id: row.id,

    userId: row.user_id,
    bookId: row.book_id,

    queuePosition:
      row.queue_position ??
      undefined,

    estimatedWaitDays:
      row.estimated_wait_days ??
      undefined,

    joinedAt:
      row.joined_at ??
      row.created_at,

    notifyEnabled:
      row.notify_enabled ??
      true,

    status: row.status,

    book: row.book
      ? mapBook(row.book)
      : undefined,
  };
}

/* ================================================== */
/* AUTH                                               */
/* ================================================== */

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
      "You must be logged in."
    );
  }

  return user.id;
}

/* ================================================== */
/* AVAILABILITY                                       */
/* ================================================== */

/*
 * A book is unavailable when:
 *
 * 1. It has an active borrowed_books record
 * OR
 * 2. It has an active reservation.
 *
 * Because your UI only has:
 * available / borrowed
 *
 * both situations display as "borrowed".
 */

async function getBookAvailability(
  bookId: string
): Promise<BookAvailabilityStatus> {
  const [
    borrowedResult,
    reservationResult,
  ] = await Promise.all([
    supabase
      .from("borrowed_books")
      .select("id")
      .eq("book_id", bookId)
      .in("status", [
        "borrowed",
        "overdue",
      ])
      .limit(1),

    supabase
      .from("book_reservations")
      .select("id")
      .eq("book_id", bookId)
      .eq("status", "reserved")
      .limit(1),
  ]);

  if (borrowedResult.error) {
    throw borrowedResult.error;
  }

  if (reservationResult.error) {
    throw reservationResult.error;
  }

  const hasBorrowing =
    (borrowedResult.data?.length ?? 0) > 0;

  const hasReservation =
    (reservationResult.data?.length ?? 0) > 0;

  return hasBorrowing ||
    hasReservation
    ? "borrowed"
    : "available";
}

/* ================================================== */
/* CATALOGUE                                          */
/* ================================================== */

export async function getCatalogue(
  category?: string
): Promise<Book[]> {
  let query = supabase
    .from("books")
    .select("*")
    .order("title", {
      ascending: true,
    });

  if (
    category &&
    category !== "All"
  ) {
    query = query.eq(
      "category",
      category
    );
  }

  const {
    data: books,
    error: booksError,
  } = await query;

  if (booksError) {
    throw booksError;
  }

  if (!books) {
    return [];
  }

  const [
    borrowedResult,
    reservationResult,
  ] = await Promise.all([
    supabase
      .from("borrowed_books")
      .select("book_id")
      .in("status", [
        "borrowed",
        "overdue",
      ]),

    supabase
      .from("book_reservations")
      .select("book_id")
      .eq(
        "status",
        "reserved"
      ),
  ]);

  if (borrowedResult.error) {
    throw borrowedResult.error;
  }

  if (reservationResult.error) {
    throw reservationResult.error;
  }

  const unavailableIds =
    new Set<string>();

  (
    borrowedResult.data ??
    []
  ).forEach((row) => {
    unavailableIds.add(
      row.book_id
    );
  });

  (
    reservationResult.data ??
    []
  ).forEach((row) => {
    unavailableIds.add(
      row.book_id
    );
  });

  return books.map((row) => {
    const availabilityStatus:
      BookAvailabilityStatus =
      unavailableIds.has(row.id)
        ? "borrowed"
        : "available";

    return mapBook(
      row,
      availabilityStatus
    );
  });
}

/* ================================================== */
/* GET BOOK                                           */
/* ================================================== */

export async function getBookById(
  bookId: string
): Promise<Book> {
  const {
    data,
    error,
  } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (error) {
    throw error;
  }

  const availabilityStatus =
    await getBookAvailability(
      bookId
    );

  return mapBook(
    data,
    availabilityStatus
  );
}

/* ================================================== */
/* SEARCH                                             */
/* ================================================== */

export async function searchBooks(
  query: string
): Promise<Book[]> {
  const searchTerm = query
    .trim()
    .replace(/%/g, "")
    .replace(/_/g, "");

  if (!searchTerm) {
    return [];
  }

  const {
    data: books,
    error: booksError,
  } = await supabase
    .from("books")
    .select("*")
    .or(
      `title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`
    )
    .order("title", {
      ascending: true,
    });

  if (booksError) {
    throw booksError;
  }

  if (!books) {
    return [];
  }

  const result = await Promise.all(
    books.map(async (row) => {
      const status =
        await getBookAvailability(
          row.id
        );

      return mapBook(
        row,
        status
      );
    })
  );

  return result;
}

/* ================================================== */
/* RESERVATIONS                                       */
/* ================================================== */

export async function reserveBook(
  bookId: string
): Promise<BookReservation> {
  const userId =
    await getCurrentUserId();

  console.log(
    "Reserving book:",
    bookId
  );

  console.log(
    "Current user:",
    userId
  );

  /*
   * Verify book.
   */

  const {
    data: book,
    error: bookError,
  } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .single();

  if (bookError) {
    console.error(
      "Book error:",
      bookError
    );

    throw bookError;
  }

  if (!book) {
    throw new Error(
      "Book not found."
    );
  }

  /*
   * Check availability.
   */

  const availability =
    await getBookAvailability(
      bookId
    );

  if (
    availability !==
    "available"
  ) {
    throw new Error(
      "This book is currently unavailable."
    );
  }

  /*
   * Prevent duplicate reservation
   * by same user.
   */

  const {
    data: userReservations,
    error:
      userReservationError,
  } = await supabase
    .from("book_reservations")
    .select("id")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .eq("status", "reserved")
    .limit(1);

  if (userReservationError) {
    throw userReservationError;
  }

  if (
    userReservations &&
    userReservations.length > 0
  ) {
    throw new Error(
      "You already reserved this book."
    );
  }

  /*
   * Deadline = 48 hours.
   */

  const reservedAt =
    new Date();

  const collectionDeadline =
    new Date(
      reservedAt.getTime() +
        48 *
          60 *
          60 *
          1000
    );

  const payload = {
    book_id: bookId,
    user_id: userId,

    status:
      "reserved",

    reserved_at:
      reservedAt.toISOString(),

    collection_deadline:
      collectionDeadline.toISOString(),
  };

  console.log(
    "Reservation payload:",
    payload
  );

  /*
   * Insert reservation.
   */

  const {
    data: reservation,
    error: insertError,
  } = await supabase
    .from(
      "book_reservations"
    )
    .insert(payload)
    .select("*")
    .single();

  if (insertError) {
    console.error(
      "Reservation insert error:",
      insertError
    );

    throw new Error(
      insertError.message
    );
  }

  console.log(
    "Reservation created:",
    reservation
  );

  /*
   * Fetch reservation with book.
   */

  const {
    data: fullReservation,
    error: fetchError,
  } = await supabase
    .from(
      "book_reservations"
    )
    .select(
      "*, book:books(*)"
    )
    .eq(
      "id",
      reservation.id
    )
    .single();

  if (fetchError) {
    console.error(
      "Reservation fetch error:",
      fetchError
    );

    return mapReservation(
      reservation
    );
  }

  return mapReservation(
    fullReservation
  );
}

/* -------------------------------------------------- */
/* GET RESERVATION                                    */
/* -------------------------------------------------- */

export async function getReservation(
  reservationId: string
): Promise<BookReservation> {
  const userId =
    await getCurrentUserId();

  const {
    data,
    error,
  } = await supabase
    .from(
      "book_reservations"
    )
    .select(
      "*, book:books(*)"
    )
    .eq(
      "id",
      reservationId
    )
    .eq(
      "user_id",
      userId
    )
    .single();

  if (error) {
    throw error;
  }

  return mapReservation(
    data
  );
}

/* -------------------------------------------------- */
/* CANCEL RESERVATION                                 */
/* -------------------------------------------------- */

/* -------------------------------------------------- */
/* CANCEL RESERVATION                                 */
/* -------------------------------------------------- */

export async function cancelReservation(
  reservationId: string
): Promise<BookReservation> {
  const userId =
    await getCurrentUserId();

  /*
   * First verify that the reservation exists
   * and belongs to the current user.
   */
  const {
    data: existingReservation,
    error: fetchError,
  } = await supabase
    .from("book_reservations")
    .select(
      "*, book:books(*)"
    )
    .eq(
      "id",
      reservationId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (fetchError) {
    console.error(
      "Reservation fetch error:",
      fetchError
    );

    throw fetchError;
  }

  if (!existingReservation) {
    throw new Error(
      "Reservation not found."
    );
  }

  /*
   * Only active reservations can be cancelled.
   */
  if (
    existingReservation.status !==
    "reserved"
  ) {
    if (
      existingReservation.status ===
      "cancelled"
    ) {
      throw new Error(
        "This reservation has already been cancelled."
      );
    }

    throw new Error(
      "This reservation cannot be cancelled."
    );
  }

  /*
   * Update reservation status.
   */
  const {
    data: cancelledReservation,
    error: updateError,
  } = await supabase
    .from("book_reservations")
    .update({
      status: "cancelled",
    })
    .eq(
      "id",
      reservationId
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "status",
      "reserved"
    )
    .select(
      "*, book:books(*)"
    )
    .maybeSingle();

  if (updateError) {
    console.error(
      "Cancel reservation error:",
      updateError
    );

    throw updateError;
  }

  if (!cancelledReservation) {
    throw new Error(
      "Unable to cancel this reservation."
    );
  }

  console.log(
    "Reservation cancelled:",
    cancelledReservation
  );

  return mapReservation(
    cancelledReservation
  );
}

/* ================================================== */
/* QUEUE                                              */
/* ================================================== */

export async function joinQueue(
  bookId: string,
  userId?: string
): Promise<BookQueueEntry> {
  const currentUserId =
    userId ?? (await getCurrentUserId());

  const availability =
    await getBookAvailability(bookId);

  if (availability !== "borrowed") {
    throw new Error(
      "This book is currently available. You do not need to join the queue."
    );
  }

  /*
   * Check whether this user is already waiting.
   */
  const {
    data: existingEntry,
    error: existingError,
  } = await supabase
    .from("book_queue")
    .select("*")
    .eq("book_id", bookId)
    .eq("user_id", currentUserId)
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

  /*
   * Get current waiting count.
   */
  const {
    count,
    error: countError,
  } = await supabase
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

  /*
   * Example estimate:
   * around 4 days per queue position.
   *
   * Change this depending on your actual
   * library borrowing period.
   */
  const estimatedWaitDays =
    Math.max(1, nextPosition) * 4;

  const {
    data,
    error,
  } = await supabase
    .from("book_queue")
    .insert({
      book_id: bookId,
      user_id: currentUserId,

      queue_position: nextPosition,

      estimated_wait_days:
        estimatedWaitDays,

      notify_enabled: true,

      status: "waiting",
    })
    .select("*, book:books(*)")
    .single();

  if (error) {
    throw error;
  }

  /*
   * Get it again so position is calculated
   * from the live queue.
   */
  const entry =
    await getQueueEntry(bookId);

  if (!entry) {
    throw new Error(
      "Unable to load queue information."
    );
  }

  return entry;
}

/* -------------------------------------------------- */
/* GET USER QUEUE ENTRY - LIVE POSITION               */
/* -------------------------------------------------- */

export async function getQueueEntry(
  bookId: string
): Promise<BookQueueEntry | null> {
  const userId =
    await getCurrentUserId();

  /*
   * Get all active queue members in their
   * actual queue order.
   *
   * joined_at is the real source of queue order.
   */
  const {
    data: queueRows,
    error: queueError,
  } = await supabase
    .from("book_queue")
    .select("*, book:books(*)")
    .eq("book_id", bookId)
    .eq("status", "waiting")
    .order("joined_at", {
      ascending: true,
    })
    .order("id", {
      ascending: true,
    });

  if (queueError) {
    throw queueError;
  }

  if (!queueRows) {
    return null;
  }

  const index =
    queueRows.findIndex(
      (row) =>
        row.user_id === userId
    );

  if (index === -1) {
    return null;
  }

  const currentPosition =
    index + 1;

  const row =
    queueRows[index];

  /*
   * Position is calculated live instead of
   * trusting an old DB queue_position value.
   */
  return mapQueueEntry({
    ...row,

    queue_position:
      currentPosition,

    estimated_wait_days:
      Math.max(
        1,
        currentPosition
      ) * 4,
  });
}

/* -------------------------------------------------- */
/* QUEUE TOTAL                                        */
/* -------------------------------------------------- */

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

/* -------------------------------------------------- */
/* NOTIFICATION                                       */
/* -------------------------------------------------- */

export async function setQueueNotify(
  queueEntryId: string,
  enabled: boolean
): Promise<void> {
  const userId =
    await getCurrentUserId();

  const {
    error,
  } = await supabase
    .from("book_queue")
    .update({
      notify_enabled: enabled,
    })
    .eq("id", queueEntryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

/* -------------------------------------------------- */
/* REALTIME QUEUE LISTENER                            */
/* -------------------------------------------------- */

export function subscribeToBookQueue(
  bookId: string,
  callback: () => void
) {
  const channel =
    supabase
      .channel(
        `book-queue-${bookId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "book_queue",
          filter: `book_id=eq.${bookId}`,
        },
        () => {
          callback();
        }
      )
      .subscribe();

  return () => {
    supabase.removeChannel(
      channel
    );
  };
}