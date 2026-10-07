import { supabase } from "./supabase";

import type {
  Book,
  BookAvailabilityStatus,
  BookQueueEntry,
  BookReservation,
} from "../types";

/* MAPPERS */
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

/* AUTH */
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

/* UPDATE GLOBAL BOOK STATUS */
async function updateBookAvailability(
  bookId: string,
  status: BookAvailabilityStatus
): Promise<void> {
  const {
    error,
  } = await supabase
    .from("books")
    .update({
      availability_status: status,
    })
    .eq("id", bookId);

  if (error) {
    console.error(
      "Book availability update error:",
      error
    );

    throw error;
  }
}

/* AVAILABILITY*/
/*
 * IMPORTANT:
 *
 * Availability is now read from the books table.
 *
 * This means every user sees the same availability
 * instead of depending on whether RLS allows them
 * to see another user's reservation.
 */

async function getBookAvailability(
  bookId: string
): Promise<BookAvailabilityStatus> {
  const {
    data,
    error,
  } = await supabase
    .from("books")
    .select(
      "availability_status"
    )
    .eq("id", bookId)
    .single();

  if (error) {
    throw error;
  }

  return (
    data?.availability_status ??
    "available"
  ) as BookAvailabilityStatus;
}


/* CATALOGUE */
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
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(
    (row) =>
      mapBook(
        row,
        row.availability_status ??
          "available"
      )
  );
}


/* GET BOOK*/
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

  return mapBook(
    data,
    data.availability_status ??
      "available"
  );
}


/* SEARCH*/
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
    data,
    error,
  } = await supabase
    .from("books")
    .select("*")
    .or(
      `title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`
    )
    .order("title", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(
    (row) =>
      mapBook(
        row,
        row.availability_status ??
          "available"
      )
  );
}


/* RESERVE BOOK*/
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

  /* CHECK BOOK*/
  const {
    data: book,
    error: bookError,
  } = await supabase
    .from("books")
    .select(
      "id, availability_status"
    )
    .eq("id", bookId)
    .single();

  if (bookError) {
    throw bookError;
  }

  if (!book) {
    throw new Error(
      "Book not found."
    );
  }

  /* CHECK GLOBAL AVAILABILITY */
  if (
    book.availability_status ===
    "borrowed"
  ) {
    throw new Error(
      "This book is currently unavailable."
    );
  }

  /* CHECK USER'S EXISTING RESERVATION */
  const {
    data: existingReservation,
    error: existingError,
  } = await supabase
    .from("book_reservations")
    .select("id")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .eq("status", "reserved")
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (
    existingReservation &&
    existingReservation.length > 0
  ) {
    throw new Error(
      "You already reserved this book."
    );
  }

  /* CREATE DEADLINE */
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

  /* INSERT RESERVATION */
  const {
    data: reservation,
    error: insertError,
  } = await supabase
    .from("book_reservations")
    .insert({
      book_id: bookId,

      user_id: userId,

      status: "reserved",

      reserved_at:
        reservedAt.toISOString(),

      collection_deadline:
        collectionDeadline.toISOString(),
    })
    .select("*")
    .single();

  if (insertError) {
    console.error(
      "Reservation insert error:",
      insertError
    );

    /*
     * Your unique database index protects
     * against two users reserving at the
     * same time.
     */

    if (
      insertError.code ===
      "23505"
    ) {
      throw new Error(
        "Sorry, another user has already reserved this book."
      );
    }

    throw new Error(
      insertError.message
    );
  }

   /* GLOBAL STATUS -> BORROWED */
  try {
    await updateBookAvailability(
      bookId,
      "borrowed"
    );
  } catch (statusError) {
    /*
     * If changing the global book status fails,
     * cancel the reservation we just created.
     *
     * This avoids inconsistent data.
     */

    await supabase
      .from("book_reservations")
      .update({
        status: "cancelled",
      })
      .eq("id", reservation.id)
      .eq("user_id", userId);

    throw new Error(
      "Unable to update book availability."
    );
  }

  /* RETURN FULL RESERVATION */
  const {
    data: fullReservation,
    error: fetchError,
  } = await supabase
    .from("book_reservations")
    .select(
      "*, book:books(*)"
    )
    .eq(
      "id",
      reservation.id
    )
    .eq(
      "user_id",
      userId
    )
    .single();

  if (fetchError) {
    return mapReservation({
      ...reservation,

      book: {
        ...book,

        availability_status:
          "borrowed",
      },
    });
  }

  return mapReservation(
    fullReservation
  );
}

/* GET RESERVATION */
export async function getReservation(
  reservationId: string
): Promise<BookReservation> {
  const userId =
    await getCurrentUserId();

  const {
    data,
    error,
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
    .single();

  if (error) {
    throw error;
  }

  return mapReservation(
    data
  );
}

/* CANCEL RESERVATION */
export async function cancelReservation(
  reservationId: string
): Promise<BookReservation> {
  const userId =
    await getCurrentUserId();

  /* GET RESERVATION */
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
    throw fetchError;
  }

  if (!existingReservation) {
    throw new Error(
      "Reservation not found."
    );
  }

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

  /* CANCEL RESERVATION */
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
    throw updateError;
  }

  if (!cancelledReservation) {
    throw new Error(
      "Unable to cancel this reservation."
    );
  }

  /* CHECK ACTIVE BORROW */
  const {
    data: activeBorrow,
    error: borrowError,
  } = await supabase
    .from("borrowed_books")
    .select("id")
    .eq(
      "book_id",
      existingReservation.book_id
    )
    .in("status", [
      "borrowed",
      "overdue",
    ])
    .limit(1);

  if (borrowError) {
    console.error(
      "Borrow check error:",
      borrowError
    );
  }

  /*
   * If no physical borrowing exists,
   * the book becomes available again.
   */

  if (
    !activeBorrow ||
    activeBorrow.length === 0
  ) {
    await updateBookAvailability(
      existingReservation.book_id,
      "available"
    );
  }

  return mapReservation({
    ...cancelledReservation,

    book:
      cancelledReservation.book
        ? {
            ...cancelledReservation.book,

            availability_status:
              activeBorrow &&
              activeBorrow.length > 0
                ? "borrowed"
                : "available",
          }
        : undefined,
  });
}

/* QUEUE */
export async function joinQueue(
  bookId: string,
  userId?: string
): Promise<BookQueueEntry> {
  const currentUserId =
    userId ??
    (await getCurrentUserId());

  const availability =
    await getBookAvailability(
      bookId
    );

  if (
    availability !==
    "borrowed"
  ) {
    throw new Error(
      "This book is currently available. You do not need to join the queue."
    );
  }

  const {
    data: existingEntry,
    error: existingError,
  } = await supabase
    .from("book_queue")
    .select("*")
    .eq(
      "book_id",
      bookId
    )
    .eq(
      "user_id",
      currentUserId
    )
    .eq(
      "status",
      "waiting"
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingEntry) {
    throw new Error(
      "You are already in the queue for this book."
    );
  }

  const {
    count,
    error: countError,
  } = await supabase
    .from("book_queue")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "book_id",
      bookId
    )
    .eq(
      "status",
      "waiting"
    );

  if (countError) {
    throw countError;
  }

  const nextPosition =
    (count ?? 0) + 1;

  const estimatedWaitDays =
    Math.max(
      1,
      nextPosition
    ) * 4;

  const {
    error,
  } = await supabase
    .from("book_queue")
    .insert({
      book_id:
        bookId,

      user_id:
        currentUserId,

      queue_position:
        nextPosition,

      estimated_wait_days:
        estimatedWaitDays,

      notify_enabled:
        true,

      status:
        "waiting",
    });

  if (error) {
    throw error;
  }

  const entry =
    await getQueueEntry(
      bookId
    );

  if (!entry) {
    throw new Error(
      "Unable to load queue information."
    );
  }

  return entry;
}

/* GET QUEUE ENTRY */
export async function getQueueEntry(
  bookId: string
): Promise<BookQueueEntry | null> {
  const userId =
    await getCurrentUserId();

  const {
    data: queueRows,
    error: queueError,
  } = await supabase
    .from("book_queue")
    .select(
      "*, book:books(*)"
    )
    .eq(
      "book_id",
      bookId
    )
    .eq(
      "status",
      "waiting"
    )
    .order(
      "joined_at",
      {
        ascending: true,
      }
    )
    .order(
      "id",
      {
        ascending: true,
      }
    );

  if (queueError) {
    throw queueError;
  }

  if (!queueRows) {
    return null;
  }

  const index =
    queueRows.findIndex(
      (row) =>
        row.user_id ===
        userId
    );

  if (index === -1) {
    return null;
  }

  const currentPosition =
    index + 1;

  const row =
    queueRows[index];

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

/* QUEUE TOTAL */
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
    .eq(
      "book_id",
      bookId
    )
    .eq(
      "status",
      "waiting"
    );

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/* QUEUE NOTIFICATION */
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
      notify_enabled:
        enabled,
    })
    .eq(
      "id",
      queueEntryId
    )
    .eq(
      "user_id",
      userId
    );

  if (error) {
    throw error;
  }
}

/* REALTIME QUEUE */
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

          schema:
            "public",

          table:
            "book_queue",

          filter:
            `book_id=eq.${bookId}`,
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

/* REALTIME BOOK AVAILABILITY */
/*
 * Catalogue can use this listener so if User 1
 * reserves a book while User 2's catalogue is open,
 * User 2 automatically sees Borrowed.
 */

export function subscribeToBookAvailability(
  callback: () => void
) {
  const channel =
    supabase
      .channel(
        "global-book-availability"
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",

          schema:
            "public",

          table:
            "books",
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