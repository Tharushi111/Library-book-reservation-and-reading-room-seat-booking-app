import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import {
  BusySlot, createRoomBooking, getCurrentUserRole, getRoomBusySlots, getRoomById, validateBooking,
} from "../../services/roomService";
import { Room } from "../../types";
import {
  ROOM_TYPE_LABEL, STAFF_ONLY_MESSAGE, UserRole, canBookRoom, getErrorMessage,
  maxBookingISO, minParticipants, todayISO,
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

  const roomId = room?.id;
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setBusyLoading(true);
    setBusyError(null);
    getRoomBusySlots(roomId, date)
      .then((slots) => { if (!cancelled) setBusy(slots); })
      .catch((e) => {
        if (!cancelled) {
          setBusy([]);
          setBusyError(getErrorMessage(e, "Could not check which times are free."));
        }
      })
      .finally(() => { if (!cancelled) setBusyLoading(false); });
    return () => { cancelled = true; };
  }, [roomId, date]);

  if (loading) return <LoadingView />;
  if (loadError || !room) return <ErrorView message={loadError ?? "Room not found."} onRetry={loadRoom} />;

  const title = room.roomType === "conference_room" ? "Book Conference Room" : "Book Study Room";
  if (!canBookRoom(room, role)) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={title} />
        <View style={styles.locked}>
          <View style={styles.lockIcon}><Ionicons name="lock-closed-outline" size={34} color={theme.warning} /></View>
          <Text style={styles.lockedTitle}>This room is for lecturers and staff</Text>
          <Text style={styles.lockedText}>{STAFF_ONLY_MESSAGE}</Text>
          <View style={{ width: "100%", marginTop: 16 }}><PrimaryButton label="Back to rooms" onPress={() => navigation.goBack()} /></View>
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
    if (problem) { setFormError(problem); return; }
    try {
      setSubmitting(true);
      setFormError(null);
      const booking = await createRoomBooking(input);
      navigation.replace("BookingConfirmation", { bookingId: booking.id });
    } catch (e) {
      setFormError(getErrorMessage(e, "Could not create the booking."));
      getRoomBusySlots(room.id, date).then(setBusy).catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.roomCard}>
          <View style={styles.roomIcon}><Ionicons name={room.roomType === "conference_room" ? "business-outline" : "library-outline"} size={25} color={theme.primary} /></View>
          <View style={{ flex: 1 }}><Text style={styles.roomName}>{room.name}</Text><Text style={styles.roomMeta}>{ROOM_TYPE_LABEL[room.roomType]} · Up to {room.capacity} people</Text></View>
        </View>

        <View style={styles.stepHeading}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View><View><Text style={styles.sectionTitle}>Choose a date</Text><Text style={styles.sectionHint}>Select your preferred booking day</Text></View></View>
        <DateCalendar selected={date} minDate={todayISO()} maxDate={maxBookingISO()} onSelect={onSelectDate} />

        <View style={[styles.stepHeading, { marginTop: 25 }]}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View><View><Text style={styles.sectionTitle}>Choose a time</Text><Text style={styles.sectionHint}>Pick an available start and end time</Text></View></View>
        <TimeSlotPicker
          date={date} startTime={startTime} endTime={endTime} busy={busy} loading={busyLoading}
          onChange={(s, e) => { setStartTime(s); setEndTime(e); setFormError(null); }}
        />
        {busyError ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color={theme.danger} /><Text style={styles.errorText}>{busyError}</Text></View> : null}

        <View style={[styles.stepHeading, { marginTop: 25 }]}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View><View><Text style={styles.sectionTitle}>Group size</Text><Text style={styles.sectionHint}>How many people are attending?</Text></View></View>
        <View style={styles.participantsCard}>
          <View style={styles.participantsTop}>
            <View style={styles.participantsIcon}><Ionicons name="people-outline" size={21} color={theme.primary} /></View>
            <View style={{ flex: 1 }}><Text style={styles.participantsLabel}>Participants</Text><Text style={styles.participantsHint}>Minimum {min} people</Text></View>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => changeParticipants(-1)} accessibilityLabel="Remove participant"><Ionicons name="remove" size={20} color={theme.primary} /></Pressable>
              <Text style={styles.stepValue}>{participants}</Text>
              <Pressable style={[styles.stepBtn, styles.plusBtn]} onPress={() => changeParticipants(1)} accessibilityLabel="Add participant"><Ionicons name="add" size={20} color={theme.white} /></Pressable>
            </View>
          </View>
        </View>

        {formError ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={18} color={theme.danger} /><Text style={styles.errorText}>{formError}</Text></View> : null}
        <View style={styles.confirmArea}>
          <PrimaryButton label="Confirm booking" icon="arrow-forward" onPress={onSubmit} loading={submitting} disabled={busyLoading || !!busyError} />
          <View style={styles.securityRow}><Ionicons name="shield-checkmark-outline" size={15} color={theme.success} /><Text style={styles.securityText}>Your booking is checked for availability before confirmation.</Text></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 50 },
  roomCard: { backgroundColor: theme.paleBlue, borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 26 },
  roomIcon: { width: 49, height: 49, borderRadius: 14, backgroundColor: theme.white, alignItems: "center", justifyContent: "center" },
  roomName: { color: theme.navy, fontSize: 16, fontWeight: "800" },
  roomMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 5 },
  stepHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  stepNumber: { width: 31, height: 31, borderRadius: 10, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: theme.white, fontSize: 14, fontWeight: "800" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: theme.navy },
  sectionHint: { fontSize: 11, color: theme.textSecondary, marginTop: 3 },
  participantsCard: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 15 },
  participantsTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  participantsIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.paleBlue, alignItems: "center", justifyContent: "center" },
  participantsLabel: { fontSize: 13, fontWeight: "800", color: theme.navy },
  participantsHint: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 9 },
  stepBtn: { width: 33, height: 33, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" },
  plusBtn: { backgroundColor: theme.primary, borderColor: theme.primary },
  stepValue: { fontSize: 17, fontWeight: "800", color: theme.navy, minWidth: 20, textAlign: "center" },
  errorBox: { backgroundColor: theme.paleRed, borderRadius: 11, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14 },
  errorText: { color: theme.danger, flex: 1, fontSize: 12, lineHeight: 18 },
  confirmArea: { marginTop: 24 },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 13 },
  securityText: { fontSize: 10, color: theme.textSecondary, flexShrink: 1 },
  locked: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25, gap: 12 },
  lockIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: theme.paleOrange, alignItems: "center", justifyContent: "center" },
  lockedTitle: { fontSize: 20, fontWeight: "800", color: theme.navy, textAlign: "center", marginTop: 8 },
  lockedText: { color: theme.textSecondary, textAlign: "center", fontSize: 13, lineHeight: 20 },
});
