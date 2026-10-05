import React, { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import {
  BusySlot,
  cancelRoomBooking,
  getBookingById,
  getRoomBusySlots,
  updateRoomBookingTimes,
} from "../../services/roomService";
import { RoomBooking } from "../../types";
import { ROOM_TYPE_LABEL, formatDisplayDate, getErrorMessage, hasStarted } from "../../utils/spaceUtils";
import { ErrorView, LoadingView, PrimaryButton, ScreenHeader, StatusBadge } from "./SpacesUI";
import TimeSlotPicker from "./TimeSlotPicker";
import { theme } from "./spacesTheme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "BookingDetails">;

export default function BookingDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [booking, setBooking] = useState<RoomBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Change-time panel
  const [editing, setEditing] = useState(false);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setBooking(await getBookingById(params.bookingId));
    } catch (e) {
      setError(getErrorMessage(e, "Could not load this booking."));
    } finally {
      setLoading(false);
    }
  }, [params.bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadBusy = useCallback(async (b: RoomBooking) => {
    try {
      setBusyLoading(true);
      setEditError(null);
      const slots = await getRoomBusySlots(b.roomId, b.bookingDate);
      setBusy(slots.filter((s) => s.bookingId !== b.id)); // this booking's own slot stays free for it
    } catch (e) {
      setBusy([]);
      setEditError(getErrorMessage(e, "Could not check which times are free."));
    } finally {
      setBusyLoading(false);
    }
  }, []);

  const startEditing = () => {
    if (!booking) return;
    setNotice(null);
    setActionError(null);
    setConfirming(false);
    setEditStart(booking.startTime);
    setEditEnd(booking.endTime);
    setEditing(true);
    loadBusy(booking);
  };

  const onSave = async () => {
    if (!booking) return;
    try {
      setSaving(true);
      setEditError(null);
      const updated = await updateRoomBookingTimes(booking.id, editStart, editEnd);
      setBooking(updated);
      setEditing(false);
      setNotice("Your booking time has been updated.");
    } catch (e) {
      setEditError(getErrorMessage(e, "Could not update the booking."));
      loadBusy(booking); // someone may have just taken the slot, so refresh what is free
    } finally {
      setSaving(false);
    }
  };

  const onCancel = async () => {
    if (!booking) return;
    try {
      setCancelling(true);
      setActionError(null);
      await cancelRoomBooking(booking.id);
      setConfirming(false);
      setNotice("Your booking has been cancelled.");
      setBooking(await getBookingById(booking.id)); // re-query so the screen shows the new status
    } catch (e) {
      setActionError(getErrorMessage(e, "Could not cancel the booking."));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingView />;
  if (error || !booking) return <ErrorView message={error ?? "Booking not found."} onRetry={load} />;

  const statusColor =
    booking.status === "active"
      ? theme.success
      : booking.status === "cancelled"
      ? theme.danger
      : theme.textSecondary;
  const statusLabel =
    booking.status === "active" ? "Active" : booking.status === "cancelled" ? "Cancelled" : "Completed";

  const isActive = booking.status === "active";
  const started = hasStarted(booking.bookingDate, booking.startTime);
  const canEdit = isActive && !started;
  const unchanged = editStart === booking.startTime && editEnd === booking.endTime;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Booking Details" />
      <ScrollView contentContainerStyle={styles.content}>
        {booking.room?.imageUrl ? (
          <Image source={{ uri: booking.room.imageUrl }} style={styles.image} />
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>{booking.room?.name ?? "Room"}</Text>
          <StatusBadge label={statusLabel} color={statusColor} />
        </View>
        {booking.room ? (
          <Text style={styles.muted}>
            {ROOM_TYPE_LABEL[booking.room.roomType]}, fits up to {booking.room.capacity} people
          </Text>
        ) : null}

        <View style={styles.card}>
          <Detail label="Booking" value={`#${booking.id.slice(0, 8).toUpperCase()}`} />
          <Detail label="Date" value={formatDisplayDate(booking.bookingDate)} />
          <Detail label="Time" value={`${booking.startTime} – ${booking.endTime}`} />
          <Detail label="Participants" value={String(booking.participants)} last />
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {editing ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Change booking time</Text>
            <Text style={styles.muted}>The date stays {formatDisplayDate(booking.bookingDate)}.</Text>

            <TimeSlotPicker
              date={booking.bookingDate}
              startTime={editStart}
              endTime={editEnd}
              busy={busy}
              loading={busyLoading}
              onChange={(s, e) => {
                setEditStart(s);
                setEditEnd(e);
                setEditError(null);
              }}
            />

            {editError ? <Text style={styles.error}>{editError}</Text> : null}

            <View style={{ height: 14 }} />
            <PrimaryButton
              label="Save new time"
              onPress={onSave}
              loading={saving}
              disabled={!editStart || !editEnd || unchanged}
            />
            <View style={{ height: 8 }} />
            <PrimaryButton
              label="Discard changes"
              variant="outline"
              onPress={() => {
                setEditing(false);
                setEditError(null);
              }}
              disabled={saving}
            />
          </View>
        ) : (
          <>
            {canEdit ? (
              <>
                <PrimaryButton label="Change time" variant="outline" onPress={startEditing} />
                <View style={{ height: 10 }} />
              </>
            ) : null}
            {isActive && started ? (
              <Text style={styles.muted}>This booking has already started, so its time can't be changed.</Text>
            ) : null}

            {isActive ? (
              confirming ? (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmText}>Cancel this booking? This can't be undone.</Text>
                  <PrimaryButton label="Yes, cancel booking" variant="danger" onPress={onCancel} loading={cancelling} />
                  <View style={{ height: 8 }} />
                  <PrimaryButton
                    label="Keep booking"
                    variant="outline"
                    onPress={() => setConfirming(false)}
                    disabled={cancelling}
                  />
                </View>
              ) : (
                <PrimaryButton label="Cancel booking" variant="danger" onPress={() => setConfirming(true)} />
              )
            ) : null}
          </>
        )}

        <View style={{ height: 10 }} />
        <PrimaryButton label="Back to Spaces" variant="outline" onPress={() => navigation.navigate("MainTabs")} />
      </ScrollView>
    </View>
  );
}

function Detail({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, paddingBottom: 40 },
  image: { width: "100%", height: 170, borderRadius: 14, marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: theme.textPrimary, flexShrink: 1 },
  muted: { color: theme.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginVertical: 18,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 12,
  },
  detailLabel: { color: theme.textSecondary },
  detailValue: { color: theme.textPrimary, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  notice: { color: theme.success, fontWeight: "700", marginBottom: 12 },
  error: { color: theme.danger, marginTop: 12, marginBottom: 4 },
  panel: {
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 14,
    padding: 14,
  },
  panelTitle: { fontSize: 17, fontWeight: "800", color: theme.textPrimary },
  confirmBox: {
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: 12,
    padding: 14,
  },
  confirmText: { color: theme.textPrimary, fontWeight: "600", marginBottom: 12 },
});
