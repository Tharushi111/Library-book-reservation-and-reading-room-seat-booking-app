import { Room, RoomType } from "../types";

export type UserRole = "student" | "staff";

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  study_room: "Study room",
  conference_room: "Conference room",
  collaborative_space: "Collaborative space",
};

export const STAFF_ONLY_MESSAGE = "Only lecturers and staff can book conference rooms.";
export const MAX_DAYS_AHEAD = 60;

/* ---------- Roles and rules ---------- */

export function parseRole(raw: unknown): UserRole {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return v === "staff" || v === "lecturer" ? "staff" : "student";
}

// Conference rooms are for lecturers/staff only. Students cannot book them.
export function canBookRoom(room: Pick<Room, "roomType">, role: UserRole): boolean {
  return room.roomType !== "conference_room" || role === "staff";
}

// Study rooms need 5+ people, conference rooms need 10+.
export function minParticipants(type: RoomType): number {
  return type === "conference_room" ? 10 : 5;
}

/* ---------- Dates and times ---------- */

// Hourly slots from 08:00 to 20:00
export const TIME_SLOTS: string[] = Array.from({ length: 13 }, (_, i) =>
  `${String(8 + i).padStart(2, "0")}:00`
);

export function toHHMM(time: string): string {
  return time.slice(0, 5);
}

export function addHour(time: string): string {
  const h = parseInt(time.slice(0, 2), 10) + 1;
  return `${String(h).padStart(2, "0")}:00`;
}

// Local date as YYYY-MM-DD (avoids the UTC shift of toISOString)
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function maxBookingISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DAYS_AHEAD);
  return toISODate(d);
}

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function hasStarted(dateISO: string, startTime: string): boolean {
  const today = todayISO();
  return dateISO < today || (dateISO === today && startTime <= nowHHMM());
}

/* ---------- Clash checking ---------- */

export interface Interval {
  startTime: string;
  endTime: string;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function findClash<T extends Interval>(start: string, end: string, list: T[]): T | undefined {
  return list.find((b) => overlaps(start, end, b.startTime, b.endTime));
}

/* ---------- Errors ---------- */

// Supabase errors are not always `Error` instances, so read .message safely.
export function getErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return fallback;
}
