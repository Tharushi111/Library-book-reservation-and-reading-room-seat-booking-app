import { supabase } from "./supabase";
import { Room, RoomBooking, RoomType } from "../types";
import { ensureDevSession } from "../utils/devAuth"; // TEMP: remove when real Login is merged
import {
  ROOM_TYPE_LABEL,
  minParticipants,
  nowHHMM,
  toHHMM,
  toISODate,
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

/* ---------- Validation (used by the screen and again before saving) ---------- */

export type BookingInput = {
  roomId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  participants: number;
};

export function validateBooking(room: Room, input: BookingInput): string | null {
  if (room.status !== "available") return "This room is unavailable right now.";
  if (!input.date) return "Choose a date.";
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
  if (input.date === toISODate(new Date()) && input.startTime <= nowHHMM()) {
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
  if (error) throw error;
  return ((data ?? []) as RoomRow[]).map(mapRoom);
}

export async function getRoomById(roomId: string): Promise<Room> {
  await ensureDevSession(); // TEMP: remove when real Login is merged

  const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single();
  if (error) throw error;
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
  if (error) throw error;
  return mapBooking(data as BookingRow);
}

/* ---------- CREATE ---------- */

export async function createRoomBooking(input: BookingInput): Promise<RoomBooking> {
  const user = await requireUser();

  const room = await getRoomById(input.roomId);
  const problem = validateBooking(room, input);
  if (problem) throw new Error(problem);

  // Block clashes with bookings this account can see for the same room/date.
  const { data: existing, error: clashError } = await supabase
    .from("room_bookings")
    .select("id, start_time, end_time")
    .eq("room_id", input.roomId)
    .eq("booking_date", input.date)
    .eq("status", "active");
  if (clashError) throw clashError;

  const clash = (existing ?? []).some(
    (b: { start_time: string; end_time: string }) =>
      toHHMM(b.start_time) < input.endTime && toHHMM(b.end_time) > input.startTime
  );
  if (clash) throw new Error("That room is already booked at that time. Pick another slot.");

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
  if (error) throw error;

  return mapBooking(data as BookingRow);
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
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("This booking can't be cancelled. It may already be cancelled or completed.");
  }
}
