import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { BusySlot } from "../../services/roomService";
import { TIME_SLOTS, addHour, findClash, nowHHMM, todayISO } from "../../utils/spaceUtils";
import { Chip } from "./SpacesUI";
import { theme } from "./spacesTheme";

type Props = {
  date: string;
  startTime: string;
  endTime: string;
  busy: BusySlot[]; // other bookings for this room and date
  loading?: boolean;
  onChange: (start: string, end: string) => void;
};

/**
 * Start/end time chips. Slots that are already booked (by anyone) or that
 * have passed today are disabled, so a clashing time can't be picked.
 */
export default function TimeSlotPicker({ date, startTime, endTime, busy, loading, onChange }: Props) {
  const isToday = date === todayISO();
  const now = nowHHMM();
  const startSlots = TIME_SLOTS.slice(0, -1);
  const endSlots = TIME_SLOTS.slice(1);

  const startInfo = (t: string) => {
    if (isToday && t <= now) return { disabled: true, sub: undefined };
    if (findClash(t, addHour(t), busy)) return { disabled: true, sub: "Booked" };
    return { disabled: false, sub: undefined };
  };

  const endInfo = (t: string) => {
    if (!startTime || t <= startTime) return { disabled: true, sub: undefined };
    if (findClash(startTime, t, busy)) return { disabled: true, sub: "Booked" };
    return { disabled: false, sub: undefined };
  };

  const pickStart = (t: string) => {
    const keepEnd = endTime && endTime > t && !findClash(t, endTime, busy);
    onChange(t, keepEnd ? endTime : "");
  };

  return (
    <View>
      <Text style={styles.label}>Start time</Text>
      <View style={styles.wrap}>
        {startSlots.map((t) => {
          const info = startInfo(t);
          return (
            <Chip
              key={t}
              label={t}
              sub={info.sub}
              selected={startTime === t}
              disabled={info.disabled}
              onPress={() => pickStart(t)}
            />
          );
        })}
      </View>

      <Text style={styles.label}>End time</Text>
      <View style={styles.wrap}>
        {endSlots.map((t) => {
          const info = endInfo(t);
          return (
            <Chip
              key={t}
              label={t}
              sub={info.sub}
              selected={endTime === t}
              disabled={info.disabled}
              onPress={() => onChange(startTime, t)}
            />
          );
        })}
      </View>

      <Text style={styles.hint}>
        {loading
          ? "Checking which times are free…"
          : "Times marked Booked are taken. Greyed-out times have passed or come before your start time."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginTop: 20, marginBottom: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { color: theme.textSecondary, marginTop: 10, fontSize: 13 },
});
