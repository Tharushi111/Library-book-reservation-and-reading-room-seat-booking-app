import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import { getBookingById } from "../../services/roomService";
import { RoomBooking } from "../../types";
import { formatDisplayDate } from "../../utils/spaceUtils";
import { ErrorView, LoadingView, PrimaryButton, ScreenHeader } from "./SpacesUI";
import { theme } from "./spacesTheme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "BookingConfirmation">;

export default function BookingConfirmationScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const bookingId = params?.bookingId;

  const [booking, setBooking] = useState<RoomBooking | null>(null);
  const [loading, setLoading] = useState(!!bookingId);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError(null);
      setBooking(await getBookingById(bookingId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your booking.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!bookingId) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Booking Confirmation" />
        <View style={styles.centerBox}>
          <Text style={styles.muted}>There is no booking to show yet.</Text>
          <PrimaryButton label="Back to Spaces" onPress={() => navigation.navigate("MainTabs")} />
        </View>
      </View>
    );
  }
  if (loading) return <LoadingView />;
  if (error || !booking) return <ErrorView message={error ?? "Booking not found."} onRetry={load} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Booking Confirmation" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tick}>
          <Text style={styles.tickText}>✓</Text>
        </View>
        <Text style={styles.title}>Your room is booked</Text>
        <Text style={styles.muted}>Booking #{booking.id.slice(0, 8).toUpperCase()}</Text>

        <View style={styles.card}>
          <Detail label="Room" value={booking.room?.name ?? "Study room"} />
          <Detail label="Date" value={formatDisplayDate(booking.bookingDate)} />
          <Detail label="Time" value={`${booking.startTime} – ${booking.endTime}`} />
          <Detail label="Participants" value={String(booking.participants)} />
          <Detail label="Status" value="Active" last />
        </View>

        <PrimaryButton
          label="View booking details"
          onPress={() => navigation.navigate("BookingDetails", { bookingId: booking.id })}
        />
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
  content: { padding: 20, alignItems: "stretch" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  tick: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.success,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  tickText: { color: "#FFFFFF", fontSize: 34, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: theme.textPrimary, textAlign: "center", marginTop: 14 },
  muted: { color: theme.textSecondary, textAlign: "center", marginTop: 4 },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginVertical: 22,
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
});
