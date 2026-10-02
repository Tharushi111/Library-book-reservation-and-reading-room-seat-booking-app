import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import { createRoomBooking, getRoomById, validateBooking } from "../../services/roomService";
import { Room } from "../../types";
import {
  ROOM_TYPE_LABEL,
  TIME_SLOTS,
  minParticipants,
  nextDays,
  nowHHMM,
  toISODate,
} from "../../utils/spaceUtils";
import { ErrorView, LoadingView, PrimaryButton, ScreenHeader } from "./SpacesUI";
import { theme } from "./spacesTheme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "BookStudyRoom">;

function Chip({
  label,
  sub,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {sub ? <Text style={[styles.chipSub, selected && styles.chipTextSelected]}>{sub}</Text> : null}
    </Pressable>
  );
}

export default function BookStudyRoomScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const days = useMemo(() => nextDays(7), []);
  const today = toISODate(new Date());

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [date, setDate] = useState(days[0].iso);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [participants, setParticipants] = useState(5);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRoom = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const r = await getRoomById(params.roomId);
      setRoom(r);
      setParticipants(minParticipants(r.roomType));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load this room.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId]);

  if (loading) return <LoadingView />;
  if (loadError || !room) {
    return <ErrorView message={loadError ?? "Room not found."} onRetry={loadRoom} />;
  }

  const min = minParticipants(room.roomType);
  const startSlots = TIME_SLOTS.slice(0, -1);
  const endSlots = TIME_SLOTS.slice(1);

  const changeParticipants = (delta: number) => {
    setFormError(null);
    setParticipants((p) => Math.max(1, Math.min(room.capacity, p + delta)));
  };

  const onSubmit = async () => {
    const input = { roomId: room.id, date, startTime, endTime, participants };
    const problem = validateBooking(room, input);
    if (problem) {
      setFormError(problem);
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      const booking = await createRoomBooking(input);
      navigation.replace("BookingConfirmation", { bookingId: booking.id });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create the booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Book Study Room" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.roomCard}>
          <Text style={styles.roomName}>{room.name}</Text>
          <Text style={styles.roomMeta}>
            {ROOM_TYPE_LABEL[room.roomType]} · fits up to {room.capacity} people
          </Text>
        </View>

        <Text style={styles.label}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {days.map((d) => (
            <Chip
              key={d.iso}
              label={d.weekday}
              sub={d.label}
              selected={date === d.iso}
              onPress={() => {
                setDate(d.iso);
                setFormError(null);
              }}
            />
          ))}
        </ScrollView>

        <Text style={styles.label}>Start time</Text>
        <View style={styles.chipWrap}>
          {startSlots.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={startTime === t}
              disabled={date === today && t <= nowHHMM()}
              onPress={() => {
                setStartTime(t);
                setFormError(null);
              }}
            />
          ))}
        </View>

        <Text style={styles.label}>End time</Text>
        <View style={styles.chipWrap}>
          {endSlots.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={endTime === t}
              onPress={() => {
                setEndTime(t);
                setFormError(null);
              }}
            />
          ))}
        </View>

        <Text style={styles.label}>Participants</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => changeParticipants(-1)}>
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <Text style={styles.stepValue}>{participants}</Text>
          <Pressable style={styles.stepBtn} onPress={() => changeParticipants(1)}>
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Minimum {min} participants for this room.</Text>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <View style={{ height: 8 }} />
        <PrimaryButton label="Confirm booking" onPress={onSubmit} loading={submitting} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, paddingBottom: 40 },
  roomCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
  },
  roomName: { fontSize: 20, fontWeight: "800", color: theme.textPrimary },
  roomMeta: { color: theme.textSecondary, marginTop: 4 },
  label: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginTop: 20, marginBottom: 8 },
  chipRow: { gap: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    minWidth: 66,
  },
  chipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipDisabled: { opacity: 0.35 },
  chipText: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  chipSub: { fontSize: 12, color: theme.textSecondary },
  chipTextSelected: { color: "#FFFFFF" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 18 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontSize: 22, color: theme.primary, fontWeight: "700" },
  stepValue: { fontSize: 24, fontWeight: "800", color: theme.textPrimary, minWidth: 36, textAlign: "center" },
  hint: { color: theme.textSecondary, marginTop: 8, fontSize: 13 },
  error: { color: theme.danger, marginTop: 16, fontSize: 14 },
});
