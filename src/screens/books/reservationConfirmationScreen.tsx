import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BookReservation } from "../../types";
import { cancelReservation, getReservation } from "../../services/bookService";

const C = {
  background: "#F7F9FD",
  white: "#FFFFFF",
  navy: "#173B83",
  blue: "#1958AC",
  orange: "#F47A2A",
  text: "#192842",
  muted: "#738198",
  line: "#E6EBF3",
  green: "#138A57",
  greenSoft: "#E8F7EE",
  red: "#C93D43",
  redSoft: "#FFF2F2",
  lightBlue: "#EAF2FF",
};

function formatDeadline(value?: string): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRemaining(value?: string, now = Date.now()): string {
  if (!value) return "Unavailable";
  const deadline = new Date(value).getTime();
  if (Number.isNaN(deadline)) return "Unavailable";
  const milliseconds = deadline - now;
  if (milliseconds <= 0) return "Deadline passed";
  const totalMinutes = Math.ceil(milliseconds / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default function ReservationConfirmationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const reservationId: string | undefined = route.params?.reservationId;

  const [reservation, setReservation] = useState<BookReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadReservation = useCallback(async (showLoader = true) => {
    if (!reservationId) {
      setError("Reservation ID is missing.");
      setLoading(false);
      return;
    }
    try {
      if (showLoader) setLoading(true);
      setError("");
      const data = await getReservation(reservationId);
      setReservation(data);
    } catch (err: any) {
      console.error("Reservation error:", err);
      setError(err?.message ?? "Unable to load reservation.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    loadReservation();
  }, [loadReservation]);

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const timer = setInterval(() => setNow(Date.now()), 60000);
      return () => clearInterval(timer);
    }, [])
  );

  const performCancellation = async () => {
    if (!reservationId || cancelling) return;
    try {
      setCancelling(true);
      await cancelReservation(reservationId);
      Alert.alert(
        "Reservation Cancelled",
        "Your reservation has been cancelled successfully.",
        [{ text: "OK", onPress: () => navigation.navigate("BookCatalogue") }]
      );
    } catch (err: any) {
      console.error("Cancel reservation error:", err);
      Alert.alert(
        "Unable to Cancel",
        err?.message ?? "Something went wrong while cancelling the reservation."
      );
      await loadReservation(false);
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelReservation = () => {
    Alert.alert(
      "Cancel Reservation?",
      "This book will no longer be held for you. Do you want to continue?",
      [
        { text: "Keep Reservation", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: performCancellation },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={styles.loadingText}>Loading reservation...</Text>
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={34} color={C.red} />
        </View>
        <Text style={styles.errorTitle}>Reservation not found</Text>
        <Text style={styles.errorMessage}>{error || "Please try again."}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const deadline = reservation.collectionDeadline;
  const remaining = getTimeRemaining(deadline, now);
  const canCancel = reservation.status?.toLowerCase() === "reserved";
  const isExpired = remaining === "Deadline passed";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Reservation Details</Text>
        <View style={styles.topRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successArea}>
          <View style={styles.successHalo}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={40} color={C.white} />
            </View>
          </View>
          <View style={styles.successPill}>
            <Ionicons name="checkmark-circle" size={14} color={C.green} />
            <Text style={styles.successPillText}>BOOK RESERVED</Text>
          </View>
          <Text style={styles.heading}>Reservation Confirmed!</Text>
          <Text style={styles.subheading}>
            Great! Your book is reserved and ready for collection. Please collect it before the deadline.
          </Text>
        </View>

        <View style={styles.bookCard}>
          <View style={styles.cardHeadingRow}>
            <Ionicons name="book-outline" size={17} color={C.blue} />
            <Text style={styles.cardHeading}>YOUR RESERVED BOOK</Text>
          </View>
          <View style={styles.bookRow}>
            {reservation.book?.coverUrl ? (
              <Image
                source={{ uri: reservation.book.coverUrl }}
                style={styles.bookCover}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.bookCover, styles.coverFallback]}>
                <Ionicons name="book" size={32} color={C.blue} />
              </View>
            )}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={3}>
                {reservation.book?.title ?? "Your book"}
              </Text>
              {!!reservation.book?.author && (
                <Text style={styles.bookAuthor} numberOfLines={2}>
                  {reservation.book.author}
                </Text>
              )}
              <View style={styles.bookStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.bookStatusText}>Reserved for you</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.pickupCard}>
          <View style={styles.cardHeadingRow}>
            <Ionicons name="time-outline" size={18} color={C.orange} />
            <Text style={styles.cardHeading}>COLLECTION INFORMATION</Text>
          </View>
          <Text style={styles.pickupLabel}>Time left to collect</Text>
          <Text style={[styles.timeText, isExpired && styles.expiredTime]}>
            {remaining}
          </Text>
          <View style={styles.pickupDivider} />
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={18} color={C.blue} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Collect before</Text>
              <Text style={styles.detailValue}>{formatDeadline(deadline)}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="location-outline" size={18} color={C.blue} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Collection point</Text>
              <Text style={styles.detailValue}>Pickup desk, 1st Floor</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipRow}>
          <Ionicons name="information-circle-outline" size={18} color={C.blue} />
          <Text style={styles.tipText}>
            Bring your student ID when collecting your book from the library.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("MyBookReservations")}
        >
          <Text style={styles.primaryButtonText}>View My Reservations</Text>
          <Ionicons name="arrow-forward" size={19} color={C.white} />
        </TouchableOpacity>
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelReservation}
            disabled={cancelling}
            activeOpacity={0.75}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={C.red} />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  center: {
    flex: 1, backgroundColor: C.background, alignItems: "center",
    justifyContent: "center", paddingHorizontal: 28,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: C.muted },
  errorIcon: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: C.redSoft,
    alignItems: "center", justifyContent: "center", marginBottom: 18,
  },
  errorTitle: { fontSize: 21, fontWeight: "800", color: C.text, textAlign: "center" },
  errorMessage: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: 9 },
  errorButton: {
    marginTop: 24, paddingHorizontal: 26, height: 46, backgroundColor: C.blue,
    borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  errorButtonText: { color: C.white, fontWeight: "700" },
  topBar: {
    height: 56, paddingHorizontal: 20, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", backgroundColor: C.background,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center",
  },
  topTitle: { color: C.navy, fontSize: 17, fontWeight: "800" },
  topRightSpacer: { width: 38 },
  scrollContent: {
    width: "100%", maxWidth: 500, alignSelf: "center", paddingHorizontal: 20,
    paddingTop: 10, paddingBottom: 22,
  },
  successArea: { alignItems: "center", marginBottom: 24 },
  successHalo: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: C.greenSoft,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  successCircle: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: C.green,
    alignItems: "center", justifyContent: "center", elevation: 3,
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16, shadowRadius: 8,
  },
  successPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 5, backgroundColor: C.greenSoft,
    borderRadius: 20, marginBottom: 10,
  },
  successPillText: { fontSize: 10, fontWeight: "800", color: C.green, letterSpacing: 0.7 },
  heading: {
    fontSize: 23, lineHeight: 30, fontWeight: "800", color: C.navy,
    textAlign: "center", letterSpacing: -0.4,
  },
  subheading: {
    color: C.muted, fontSize: 13, lineHeight: 20, textAlign: "center",
    marginTop: 7, maxWidth: 330,
  },
  bookCard: {
    backgroundColor: C.white, borderRadius: 18, borderWidth: 1,
    borderColor: C.line, padding: 16, marginBottom: 14,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035, shadowRadius: 9, elevation: 1,
  },
  cardHeadingRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 13 },
  cardHeading: { color: C.navy, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  bookRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  bookCover: { width: 76, height: 103, borderRadius: 8, backgroundColor: C.lightBlue },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  bookInfo: { flex: 1, gap: 6 },
  bookTitle: { color: C.text, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  bookAuthor: { color: C.muted, fontSize: 12, lineHeight: 17 },
  bookStatus: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6,
    paddingVertical: 5, paddingHorizontal: 9, backgroundColor: C.greenSoft,
    borderRadius: 8, marginTop: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  bookStatusText: { fontSize: 11, fontWeight: "700", color: C.green },
  pickupCard: {
    backgroundColor: C.white, borderRadius: 18, borderWidth: 1,
    borderColor: C.line, padding: 16,
  },
  pickupLabel: { color: C.muted, fontSize: 12, marginTop: 1 },
  timeText: { color: C.orange, fontSize: 25, fontWeight: "800", marginTop: 3, marginBottom: 13 },
  expiredTime: { color: C.red },
  pickupDivider: { height: 1, backgroundColor: C.line, marginBottom: 14 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 13, gap: 11 },
  detailIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.lightBlue,
    alignItems: "center", justifyContent: "center",
  },
  detailContent: { flex: 1 },
  detailLabel: { color: C.muted, fontSize: 11, marginBottom: 3 },
  detailValue: { color: C.text, fontSize: 13, fontWeight: "700" },
  tipRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 9,
    paddingHorizontal: 7, paddingTop: 16,
  },
  tipText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 18 },
  footer: {
    paddingTop: 12, paddingHorizontal: 20, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.line, alignItems: "center",
  },
  primaryButton: {
    width: "100%", maxWidth: 460, height: 50, borderRadius: 13,
    backgroundColor: C.orange, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  primaryButtonText: { color: C.white, fontSize: 14, fontWeight: "800" },
  cancelButton: {
    height: 36, marginTop: 4, alignItems: "center", justifyContent: "center",
  },
  cancelButtonText: { color: C.red, fontSize: 12, fontWeight: "700" },
});
