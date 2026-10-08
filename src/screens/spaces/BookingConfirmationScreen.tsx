import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import { getBookingById } from "../../services/roomService";
import { RoomBooking } from "../../types";
import { formatDisplayDate, getErrorMessage } from "../../utils/spaceUtils";
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
      setError(getErrorMessage(e, "Could not load your booking."));
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  if (!bookingId) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Booking Confirmation" />
        <View style={styles.centerBox}>
          <Ionicons name="calendar-outline" size={38} color={theme.primary} />
          <Text style={styles.muted}>There is no booking to show yet.</Text>
          <View style={{ width: "100%", marginTop: 10 }}><PrimaryButton label="Back to Spaces" onPress={() => navigation.navigate("MainTabs")} /></View>
        </View>
      </View>
    );
  }
  if (loading) return <LoadingView />;
  if (error || !booking) return <ErrorView message={error ?? "Booking not found."} onRetry={load} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Booking Confirmation" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successArt}>
          <View style={styles.halo}><View style={styles.tick}><Ionicons name="checkmark" size={37} color={theme.white} /></View></View>
        </View>
        <Text style={styles.title}>Room booked successfully!</Text>
        <Text style={styles.muted}>Your study space is reserved. Here are your booking details.</Text>
        <View style={styles.reference}><Ionicons name="receipt-outline" size={15} color={theme.primary} /><Text style={styles.referenceText}>Booking #{booking.id.slice(0, 8).toUpperCase()}</Text></View>

        <View style={styles.card}>
          <View style={styles.cardHeader}><View style={styles.cardHeaderIcon}><Ionicons name="calendar-outline" size={21} color={theme.primary} /></View><Text style={styles.cardHeaderTitle}>Reservation details</Text><View style={styles.activeBadge}><View style={styles.activeDot} /><Text style={styles.activeText}>Active</Text></View></View>
          <View style={styles.divider} />
          <Detail icon="business-outline" label="Room" value={booking.room?.name ?? "Room"} />
          <Detail icon="calendar-outline" label="Date" value={formatDisplayDate(booking.bookingDate)} />
          <Detail icon="time-outline" label="Time" value={`${booking.startTime} – ${booking.endTime}`} />
          <Detail icon="people-outline" label="Participants" value={String(booking.participants)} last />
        </View>

        <View style={styles.infoBox}><Ionicons name="information-circle-outline" size={19} color={theme.primary} /><Text style={styles.infoText}>You can view your booking details anytime from My Seat Bookings.</Text></View>
        <View style={styles.buttons}>
          <PrimaryButton label="Back to Spaces" variant="outline" onPress={() => navigation.navigate("MainTabs")} />
        </View>
      </ScrollView>
    </View>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>["name"];
function Detail({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.detailIcon}><Ionicons name={icon} size={17} color={theme.primary} /></View>
      <View style={{ flex: 1 }}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { paddingHorizontal: 19, paddingTop: 22, paddingBottom: 48, alignItems: "stretch" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 15, padding: 25 },
  successArt: { alignItems: "center", marginTop: 5 },
  halo: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.paleGreen, alignItems: "center", justifyContent: "center" },
  tick: { width: 69, height: 69, borderRadius: 35, backgroundColor: theme.success, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 23, fontWeight: "800", color: theme.navy, textAlign: "center", marginTop: 19, letterSpacing: -0.4 },
  muted: { color: theme.textSecondary, textAlign: "center", marginTop: 8, fontSize: 12, lineHeight: 19 },
  reference: { alignSelf: "center", marginTop: 17, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: theme.paleBlue, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  referenceText: { color: theme.primary, fontSize: 11, fontWeight: "800" },
  card: { backgroundColor: theme.white, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 16, marginTop: 27 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  cardHeaderIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.paleBlue, alignItems: "center", justifyContent: "center" },
  cardHeaderTitle: { color: theme.navy, fontSize: 14, fontWeight: "800", flex: 1 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: theme.paleGreen, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 16 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success },
  activeText: { color: theme.success, fontSize: 10, fontWeight: "800" },
  divider: { height: 1, backgroundColor: theme.border, marginTop: 14, marginBottom: 2 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  detailIcon: { width: 35, height: 35, borderRadius: 10, backgroundColor: theme.paleBlue, alignItems: "center", justifyContent: "center" },
  detailLabel: { color: theme.textSecondary, fontSize: 11 },
  detailValue: { color: theme.navy, fontWeight: "800", fontSize: 13, marginTop: 4 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: theme.paleBlue, borderRadius: 12, padding: 13, marginTop: 19 },
  infoText: { flex: 1, color: theme.textSecondary, fontSize: 11, lineHeight: 17 },
  buttons: { gap: 11, marginTop: 24 },
});
