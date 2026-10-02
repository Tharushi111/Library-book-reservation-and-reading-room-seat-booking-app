import { RoomType } from "../types";

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  study_room: "Study room",
  conference_room: "Conference room",
  collaborative_space: "Collaborative space",
};

// Business rules: students need 5+, staff conference rooms need 10+.
export function minParticipants(type: RoomType): number {
  return type === "conference_room" ? 10 : 5;
}

// Hourly slots from 08:00 to 20:00
export const TIME_SLOTS: string[] = Array.from({ length: 13 }, (_, i) =>
  `${String(8 + i).padStart(2, "0")}:00`
);

export function toHHMM(time: string): string {
  return time.slice(0, 5);
}

// Local date as YYYY-MM-DD (avoids the UTC shift of toISOString)
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function nextDays(count = 7): { iso: string; weekday: string; label: string }[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return {
      iso: toISODate(d),
      weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    };
  });
}

export function formatDisplayDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
