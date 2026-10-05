import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import {
  BusySlot,
  createRoomBooking,
  getCurrentUserRole,
  getRoomBusySlots,
  getRoomById,
  validateBooking,
} from "../../services/roomService";
import { Room } from "../../types";
import {
  ROOM_TYPE_LABEL,
  STAFF_ONLY_MESSAGE,
  UserRole,
  canBookRoom,
  getErrorMessage,
  maxBookingISO,
  minParticipants,
  todayISO,
} from "../../utils/spaceUtils";
import DateCalendar from "./DateCalendar";
import { ErrorView, LoadingView, PrimaryButton, ScreenHeader } from "./SpacesUI";
import TimeSlotPicker from "./TimeSlotPicker";
import { theme } from "./spacesTheme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "BookStudyRoom">;

export default function BookStudyRoomScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [room, setRoom] = useState<Room | null>(null);
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [participants, setParticipants] = useState(5);

  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);
  const [busyError, setBusyError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRoom = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [r, userRole] = await Promise.all([getRoomById(params.roomId), getCurrentUserRole()]);
      setRoom(r);
      setRole(userRole);
      setParticipants(minParticipants(r.roomType));
    } catch (e) {
      setLoadError(getErrorMessage(e, "Could not load this room."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId]);

  // Whenever the room or date changes, load every active booking for that day.
  const roomId = room?.id;
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setBusyLoading(true);
    setBusyError(null);
    getRoomBusySlots(roomId, date)
      .then((slots) => {
        if (!cancelled) setBusy(slots);
      })
      .catch((e) => {
        if (!cancelled) {
          setBusy([]);
          setBusyError(getErrorMessage(e, "Could not check which times are free."));
        }
      })
      .finally(() => {
        if (!cancelled) setBusyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, date]);

  if (loading) return <LoadingView />;
  if (loadError || !room) {
    return <ErrorView message={loadError ?? "Room not found."} onRetry={loadRoom} />;
  }

  const title = room.roomType === "conference_room" ? "Book Conference Room" : "Book Study Room";

  // Students can't book conference rooms, even if they reach this screen directly.
  if (!canBookRoom(room, role)) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={title} />
        <View style={styles.locked}>
          <Text style={styles.lockedTitle}>This room is for lecturers and staff</Text>
          <Text style={styles.lockedText}>{STAFF_ONLY_MESSAGE}</Text>
          <View style={{ height: 8 }} />
          <PrimaryButton label="Back to rooms" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const min = minParticipants(room.roomType);

  const changeParticipants = (delta: number) => {
    setFormError(null);
    setParticipants((p) => Math.max(1, Math.min(room.capacity, p + delta)));
  };

  const onSelectDate = (iso: string) => {
    setDate(iso);
    setStartTime("");
    setEndTime("");
    setFormError(null);
  };

  const onSubmit = async () => {
    const input = { roomId: room.id, date, startTime, endTime, participants };
    const problem = validateBooking(room, input, role);
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
      setFormError(getErrorMessage(e, "Could not create the booking."));
      // Someone may have just taken the slot, so refresh what is free.
      getRoomBusySlots(room.id, date).then(setBusy).catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.roomCard}>
          <Text style={styles.roomName}>{room.name}</Text>
          <Text style={styles.roomMeta}>
            {ROOM_TYPE_LABEL[room.roomType]}, fits up to {room.capacity} people
          </Text>
        </View>

        <Text style={styles.label}>Date</Text>
        <DateCalendar
          selected={date}
          minDate={todayISO()}
          maxDate={maxBookingISO()}
          onSelect={onSelectDate}
        />
        <Text style={styles.hint}>Past dates are greyed out and can't be selected.</Text>

        <TimeSlotPicker
          date={date}
          startTime={startTime}
          endTime={endTime}
          busy={busy}
          loading={busyLoading}
          onChange={(s, e) => {
            setStartTime(s);
            setEndTime(e);
            setFormError(null);
          }}
        />
        {busyError ? <Text style={styles.error}>{busyError}</Text> : null}

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
  locked: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  lockedTitle: { fontSize: 20, fontWeight: "800", color: theme.textPrimary, textAlign: "center" },
  lockedText: { color: theme.textSecondary, textAlign: "center" },
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
