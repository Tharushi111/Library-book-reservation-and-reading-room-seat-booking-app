import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { toISODate } from "../../utils/spaceUtils";
import { theme } from "./spacesTheme";

type Props = {
  selected: string; // YYYY-MM-DD
  minDate: string; // earliest selectable day (today)
  maxDate: string; // latest selectable day
  onSelect: (iso: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthKey = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return y * 12 + (m - 1);
};

/**
 * Month calendar. Days before `minDate` (the past) are greyed out and cannot be
 * selected, and you can't page back to a month that is fully in the past.
 */
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

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const title = new Date(view.y, view.m, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Pressable onPress={() => move(-1)} disabled={!canPrev} hitSlop={10} style={styles.arrow}>
          <Text style={[styles.arrowText, !canPrev && styles.arrowOff]}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={() => move(1)} disabled={!canNext} hitSlop={10} style={styles.arrow}>
          <Text style={[styles.arrowText, !canNext && styles.arrowOff]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.cell}>
            <Text style={styles.weekday}>{w}</Text>
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`b${i}`} style={styles.cell} />;
          const iso = toISODate(new Date(view.y, view.m, day));
          const disabled = iso < minDate || iso > maxDate;
          const isSelected = iso === selected;
          const isToday = iso === minDate;
          return (
            <View key={iso} style={styles.cell}>
              <Pressable
                disabled={disabled}
                onPress={() => onSelect(iso)}
                style={[
                  styles.day,
                  isToday && !isSelected && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    disabled && styles.dayTextDisabled,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  arrow: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 26, color: theme.primary, fontWeight: "700" },
  arrowOff: { color: theme.border },
  title: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.2857%", alignItems: "center", paddingVertical: 2 },
  weekday: { fontSize: 12, color: theme.textSecondary, fontWeight: "600", marginBottom: 4 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dayToday: { borderWidth: 1.5, borderColor: theme.primary },
  daySelected: { backgroundColor: theme.primary },
  dayText: { fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  dayTextDisabled: { color: theme.textSecondary, opacity: 0.35, textDecorationLine: "line-through" },
  dayTextSelected: { color: "#FFFFFF" },
});
