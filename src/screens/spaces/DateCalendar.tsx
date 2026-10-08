import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toISODate } from "../../utils/spaceUtils";
import { theme } from "./spacesTheme";

type Props = { selected: string; minDate: string; maxDate: string; onSelect: (iso: string) => void };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthKey = (iso: string) => { const [y, m] = iso.split("-").map(Number); return y * 12 + (m - 1); };

export default function DateCalendar({ selected, minDate, maxDate, onSelect }: Props) {
  const [view, setView] = useState(() => {
    const [y, m] = (selected || minDate).split("-").map(Number);
    return { y, m: m - 1 };
  });
  const viewKey = view.y * 12 + view.m;
  const canPrev = viewKey > monthKey(minDate);
  const canNext = viewKey < monthKey(maxDate);
  const move = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const title = new Date(view.y, view.m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.arrowGroup}>
          <Pressable onPress={() => move(-1)} disabled={!canPrev} hitSlop={8} style={[styles.arrow, !canPrev && styles.arrowDisabled]} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={18} color={canPrev ? theme.primary : theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => move(1)} disabled={!canNext} hitSlop={8} style={[styles.arrow, !canNext && styles.arrowDisabled]} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={18} color={canNext ? theme.primary : theme.textSecondary} />
          </Pressable>
        </View>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w) => <View key={w} style={styles.cell}><Text style={styles.weekday}>{w}</Text></View>)}
        {cells.map((day, i) => {
          if (day === null) return <View key={`blank-${i}`} style={styles.cell} />;
          const iso = toISODate(new Date(view.y, view.m, day));
          const disabled = iso < minDate || iso > maxDate;
          const isSelected = iso === selected;
          const isToday = iso === minDate;
          return (
            <View key={iso} style={styles.cell}>
              <Pressable
                disabled={disabled}
                onPress={() => onSelect(iso)}
                accessibilityRole="button"
                accessibilityLabel={iso}
                accessibilityState={{ selected: isSelected, disabled }}
                style={({ pressed }) => [styles.day, isToday && !isSelected && styles.dayToday, isSelected && styles.daySelected, pressed && !disabled && { opacity: 0.75 }]}
              >
                <Text style={[styles.dayText, disabled && styles.dayTextDisabled, isSelected && styles.dayTextSelected]}>{day}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={styles.footer}><View style={styles.todayDot} /><Text style={styles.footerText}>Today</Text><View style={styles.selectedDot} /><Text style={styles.footerText}>Selected</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.border, borderRadius: 17, padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 16, fontWeight: "800", color: theme.navy },
  arrowGroup: { flexDirection: "row", gap: 8 },
  arrow: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" },
  arrowDisabled: { opacity: 0.35 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.2857%", alignItems: "center", justifyContent: "center", paddingVertical: 3 },
  weekday: { fontSize: 11, color: theme.textSecondary, fontWeight: "700", marginBottom: 8 },
  day: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dayToday: { borderWidth: 1.5, borderColor: theme.primary },
  daySelected: { backgroundColor: theme.primary },
  dayText: { fontSize: 13, fontWeight: "700", color: theme.navy },
  dayTextDisabled: { color: theme.textSecondary, opacity: 0.32 },
  dayTextSelected: { color: theme.white },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 7, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 13, marginTop: 12 },
  todayDot: { width: 9, height: 9, borderRadius: 3, borderWidth: 1.5, borderColor: theme.primary },
  selectedDot: { width: 9, height: 9, borderRadius: 3, backgroundColor: theme.primary, marginLeft: 10 },
  footerText: { color: theme.textSecondary, fontSize: 10 },
});
