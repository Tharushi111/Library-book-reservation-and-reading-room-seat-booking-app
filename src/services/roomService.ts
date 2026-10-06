import { supabase } from "./supabase";
import { Room, RoomBooking, RoomType } from "../types";
import { ensureDevSession } from "../utils/devAuth"; // TEMP: remove when real Login is merged
import {
  Interval,
  ROOM_TYPE_LABEL,
  STAFF_ONLY_MESSAGE,
  UserRole,
  canBookRoom,
  findClash,
  hasStarted,
  minParticipants,
  nowHHMM,
  parseRole,
  toHHMM,
  todayISO,
} from "../utils/spaceUtils";

type RoomRow = {
  id: string;
  name: string;
  room_type: RoomType;
  capacity: number;
  description: string | null;
  image_url: string | null;
  status: Room["status"];
};

type BookingRow = {
  id: string;
  user_id: string;
  room_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  participants: number;
  status: RoomBooking["status"];
  created_at: string;
  rooms?: RoomRow | RoomRow[] | null;
};

const mapRoom = (row: RoomRow): Room => ({
  id: row.id,
  name: row.name,
  roomType: row.room_type,
  capacity: row.capacity,
  description: row.description ?? undefined,
  imageUrl: row.image_url ?? undefined,
  status: row.status,
});

const mapBooking = (row: BookingRow): RoomBooking => {
  const roomRow = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
  return {
    id: row.id,
    userId: row.user_id,
    roomId: row.room_id,
    bookingDate: row.booking_date,
    startTime: toHHMM(row.start_time),
    endTime: toHHMM(row.end_time),
    participants: row.participants,
    status: row.status,
    createdAt: row.created_at,
    room: roomRow ? mapRoom(roomRow) : undefined,
  };
};

async function requireUser() {
  await ensureDevSession(); // TEMP: remove when real Login is merged
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to do this.");
  return user;
}

/* ---------- Error messages ---------- */

export function slotTakenMessage(clash?: Interval & { isMine?: boolean }): string {
  if (!clash) {
    return "Sorry, someone has just booked this room for that time. Please choose a different time.";
  }
  if (clash.isMine) {
    return `You already have this room booked from ${clash.startTime} to ${clash.endTime}.`;
  }
  return `Sorry, this room is already booked from ${clash.startTime} to ${clash.endTime}. Please choose a different time.`;
}

type DbError = { message?: string; code?: string };

function toError(error: DbError): Error {
  if (error.code === "23P01") return new Error(slotTakenMessage()); // overlap constraint
  if (error.code === "42501") return new Error("You don't have permission to do this.");
  return new Error(error.message || "Something went wrong. Please try again.");
}

/* ---------- Role ---------- */

export async function getCurrentUserRole(): Promise<UserRole> {
  await ensureDevSession(); // TEMP: remove when real Login is merged
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "student";

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.warn("Could not read profile role, treating as student:", error.message);
    return "student";
  }
  return parseRole(data?.role);
}

/* ---------- Validation (used by the screens and again before saving) ---------- */

export type BookingInput = {
  roomId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  participants: number;
};

export function validateBooking(room: Room, input: BookingInput, role: UserRole): string | null {
  if (room.status !== "available") return "This room is unavailable right now.";
  if (!canBookRoom(room, role)) return STAFF_ONLY_MESSAGE;
  if (!input.date) return "Choose a date.";
  if (input.date < todayISO()) return "You can't book a date in the past. Choose today or a later date.";
  if (!input.startTime) return "Choose a start time.";
  if (!input.endTime) return "Choose an end time.";
  if (input.endTime <= input.startTime) return "End time must be later than start time.";

  const min = minParticipants(room.roomType);
  if (!Number.isFinite(input.participants) || input.participants < min) {
    return `${ROOM_TYPE_LABEL[room.roomType]} bookings need at least ${min} participants.`;
  }
  if (input.participants > room.capacity) {
    return `This room holds up to ${room.capacity} people.`;
  }
  if (input.date === todayISO() && input.startTime <= nowHHMM()) {
    return "That start time has already passed. Pick a later slot.";
  }
  return null;
}

/* ---------- READ ---------- */

export async function getRooms(roomType?: RoomType): Promise<Room[]> {
  await ensureDevSession(); // TEMP: remove when real Login is merged

  let query = supabase.from("rooms").select("*").order("name", { ascending: true });
  if (roomType) query = query.eq("room_type", roomType);

  const { data, error } = await query;
  if (error) throw toError(error);
  return ((data ?? []) as RoomRow[]).map(mapRoom);
}

export async function getRoomById(roomId: string): Promise<Room> {
  await ensureDevSession(); // TEMP: remove when real Login is merged

  const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single();
  if (error) throw toError(error);
  return mapRoom(data as RoomRow);
}

export async function getBookingById(bookingId: string): Promise<RoomBooking> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("room_bookings")
    .select("*, rooms(*)")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .single();
  if (error) throw toError(error);
  return mapBooking(data as BookingRow);
}

/* ---------- Availability (sees ALL users' active bookings, not just yours) ---------- */

export type BusySlot = Interval & { bookingId: string; isMine: boolean };

type BusyRow = { booking_id: string; start_time: string; end_time: string; is_mine: boolean };

function isMissingFunction(error: DbError): boolean {
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function/i.test(error.message ?? "")
  );
}

export async function getRoomBusySlots(roomId: string, date: string): Promise<BusySlot[]> {
  const user = await requireUser();

  const { data, error } = await supabase.rpc("get_room_busy_slots", {
    p_room_id: roomId,
    p_date: date,
  });
  if (!error) {
    return ((data ?? []) as BusyRow[]).map((r) => ({
      bookingId: r.booking_id,
      startTime: toHHMM(r.start_time),
      endTime: toHHMM(r.end_time),
      isMine: r.is_mine,
    }));
  }

  if (isMissingFunction(error)) {
    // The SQL from study-space-booking-rules.sql hasn't been run yet.
    // Fall back to this user's own bookings so the app still works while testing.
    console.warn(
      "get_room_busy_slots is missing. Run study-space-booking-rules.sql in Supabase so bookings by other users are checked too."
    );
    const { data: own, error: ownError } = await supabase
      .from("room_bookings")
      .select("id, start_time, end_time")
      .eq("room_id", roomId)
      .eq("booking_date", date)
      .eq("status", "active")
      .eq("user_id", user.id);
    if (ownError) throw toError(ownError);
    return (own ?? []).map((r: { id: string; start_time: string; end_time: string }) => ({
      bookingId: r.id,
      startTime: toHHMM(r.start_time),
      endTime: toHHMM(r.end_time),
      isMine: true,
    }));
  }
  throw toError(error);
}

async function assertSlotFree(
  roomId: string,
  date: string,
  start: string,
  end: string,
  excludeBookingId?: string
) {
  const busy = (await getRoomBusySlots(roomId, date)).filter((b) => b.bookingId !== excludeBookingId);
  const clash = findClash(start, end, busy);
  if (clash) throw new Error(slotTakenMessage(clash));
}

/* ---------- CREATE ---------- */

export async function createRoomBooking(input: BookingInput): Promise<RoomBooking> {
  const user = await requireUser();

  const [room, role] = await Promise.all([getRoomById(input.roomId), getCurrentUserRole()]);
  const problem = validateBooking(room, input, role);
  if (problem) throw new Error(problem);

  await assertSlotFree(input.roomId, input.date, input.startTime, input.endTime);

  const { data, error } = await supabase
    .from("room_bookings")
    .insert({
      user_id: user.id,
      room_id: input.roomId,
      booking_date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      participants: input.participants,
      status: "active",
    })
    .select("*, rooms(*)")
    .single();
  if (error) throw toError(error);

  return mapBooking(data as BookingRow);
}

/* ---------- UPDATE (change time) ---------- */

export async function updateRoomBookingTimes(
  bookingId: string,
  startTime: string,
  endTime: string
): Promise<RoomBooking> {
  const user = await requireUser();

  const current = await getBookingById(bookingId);
  if (current.status !== "active") throw new Error("Only active bookings can be changed.");
  if (hasStarted(current.bookingDate, current.startTime)) {
    throw new Error("This booking has already started and can't be changed.");
  }

  const [room, role] = await Promise.all([
    current.room ? Promise.resolve(current.room) : getRoomById(current.roomId),
    getCurrentUserRole(),
  ]);
  const problem = validateBooking(
    room,
    {
      roomId: current.roomId,
      date: current.bookingDate,
      startTime,
      endTime,
      participants: current.participants,
    },
    role
  );
  if (problem) throw new Error(problem);

  // Ignore this booking's own current slot, so moving within it is allowed.
  await assertSlotFree(current.roomId, current.bookingDate, startTime, endTime, bookingId);

  const { data, error } = await supabase
    .from("room_bookings")
    .update({ start_time: startTime, end_time: endTime })
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .select("*, rooms(*)");
  if (error) throw toError(error);
  if (!data || data.length === 0) {
    throw new Error("This booking can't be changed. It may already be cancelled.");
  }
  return mapBooking(data[0] as BookingRow);
}

/* ---------- UPDATE (cancel) ---------- */

export async function cancelRoomBooking(bookingId: string): Promise<void> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("room_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .select();
  if (error) throw toError(error);
  if (!data || data.length === 0) {
    throw new Error("This booking can't be cancelled. It may already be cancelled or completed.");
  }
}
