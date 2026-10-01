import { supabase } from "./supabase";
import { Room, RoomType } from "../types";

type RoomRow = {
  id: string;
  name: string;
  room_type: RoomType;
  capacity: number;
  description: string | null;
  image_url: string | null;
  status: Room["status"];
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

export async function getRooms(roomType?: RoomType): Promise<Room[]> {
  let query = supabase.from("rooms").select("*").order("name", { ascending: true });

  if (roomType) {
    query = query.eq("room_type", roomType);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as RoomRow[]).map(mapRoom);
}