import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BusySlot } from "../../services/roomService";
import { TIME_SLOTS, addHour, findClash, nowHHMM, todayISO } from "../../utils/spaceUtils";
import { Chip } from "./SpacesUI";
import { theme } from "./spacesTheme";

type Props = {
  date: string;
  startTime: string;
  endTime: string;
  busy: BusySlot[];
  loading?: boolean;
  onChange: (start: string, end: string) => void;
};

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
    <View style={styles.wrap}>
      <View style={styles.heading}><Ionicons name="time-outline" size={19} color={theme.primary} /><Text style={styles.headingText}>Select your time</Text></View>
      <View style={styles.line} />
      <View style={styles.labelRow}><Text style={styles.label}>Start time</Text>{loading ? <ActivityIndicator size="small" color={theme.primary} /> : null}</View>
      <View style={styles.chips}>{startSlots.map((t) => {
        const info = startInfo(t);
        return <Chip key={t} label={t} sub={info.sub} selected={startTime === t} disabled={loading || info.disabled} onPress={() => pickStart(t)} />;
      })}</View>
      <Text style={styles.label}>End time</Text>
      <View style={styles.chips}>{endSlots.map((t) => {
        const info = endInfo(t);
        return <Chip key={t} label={t} sub={info.sub} selected={endTime === t} disabled={loading || info.disabled} onPress={() => onChange(startTime, t)} />;
      })}</View>
      <View style={styles.hintRow}><Ionicons name="information-circle-outline" size={16} color={theme.primary} /><Text style={styles.hint}>{loading ? "Checking which times are free..." : "Booked slots cannot be selected. Grey slots are unavailable or outside your selected time range."}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.border, borderRadius: 17, padding: 15, marginTop: 18 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  headingText: { fontSize: 15, fontWeight: "800", color: theme.navy },
  line: { height: 1, backgroundColor: theme.border, marginTop: 13 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, fontWeight: "800", color: theme.textPrimary, marginTop: 18, marginBottom: 11 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hintRow: { flexDirection: "row", gap: 7, alignItems: "flex-start", backgroundColor: theme.paleBlue, padding: 11, borderRadius: 11, marginTop: 18 },
  hint: { color: theme.textSecondary, fontSize: 11, lineHeight: 17, flex: 1 },
});
