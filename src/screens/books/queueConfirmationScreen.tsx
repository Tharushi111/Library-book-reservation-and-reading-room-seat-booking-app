import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getBookById,
  getQueueEntry,
  getQueueTotal,
  joinQueue,
  setQueueNotify,
  subscribeToBookQueue,
} from "../../services/bookService";
import type { Book, BookQueueEntry } from "../../types";

type RouteParams = { bookId: string };

const COLORS = {
  background: "#F7F9FD",
  white: "#FFFFFF",
  navy: "#1B3F94",
  navyDark: "#173476",
  blueSoft: "#EDF3FD",
  orange: "#F47A2A",
  orangeSoft: "#FFF2E8",
  orangeBorder: "#FFDFC6",
  text: "#19243A",
  muted: "#68758A",
  border: "#E5EAF2",
  green: "#16804A",
  greenSoft: "#E9F7EF",
  red: "#C43B3B",
};

export default function QueueConfirmationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { bookId } = route.params as RouteParams;

  const [book, setBook] = useState<Book | null>(null);
  const [queueEntry, setQueueEntry] = useState<BookQueueEntry | null>(null);
  const [queueTotal, setQueueTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [updatingNotify, setUpdatingNotify] = useState(false);
  const [error, setError] = useState("");

  const loadQueueInformation = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        setError("");
        const [bookData, existingEntry, total] = await Promise.all([
          getBookById(bookId),
          getQueueEntry(bookId),
          getQueueTotal(bookId),
        ]);
        setBook(bookData);
        setQueueEntry(existingEntry);
        setQueueTotal(total);
      } catch (err: any) {
        console.error("Queue loading error:", err);
        setError(err?.message ?? "Unable to load queue information.");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [bookId]
  );

  useEffect(() => {
    void loadQueueInformation(true);
  }, [loadQueueInformation]);

  useFocusEffect(
    useCallback(() => {
      void loadQueueInformation();
    }, [loadQueueInformation])
  );

  useEffect(() => {
    if (!bookId) return;
    const unsubscribe = subscribeToBookQueue(bookId, () => {
      void loadQueueInformation();
    });
    return () => unsubscribe();
  }, [bookId, loadQueueInformation]);

  const handleJoinQueue = async () => {
    if (joining) return;
    try {
      setJoining(true);
      setError("");
      const latestBook = await getBookById(bookId);
      if (latestBook.availabilityStatus === "available") {
        throw new Error("This book is now available. You can reserve it directly.");
      }
      await joinQueue(bookId);
      await loadQueueInformation();
    } catch (err: any) {
      console.error("Join queue error:", err);
      setError(err?.message ?? "Unable to join the waiting list.");
    } finally {
      setJoining(false);
    }
  };

  const handleToggleNotify = async () => {
    if (!queueEntry || updatingNotify) return;
    const previousValue = queueEntry.notifyEnabled ?? true;
    const nextValue = !previousValue;
    setQueueEntry({ ...queueEntry, notifyEnabled: nextValue });
    try {
      setUpdatingNotify(true);
      setError("");
      await setQueueNotify(queueEntry.id, nextValue);
    } catch (err) {
      console.error("Notify update error:", err);
      setQueueEntry((current) =>
        current?.id === queueEntry.id
          ? { ...current, notifyEnabled: previousValue }
          : current
      );
      setError("Unable to update your notification preference.");
    } finally {
      setUpdatingNotify(false);
    }
  };

  const isJoined = !!queueEntry;
  const position = queueEntry?.queuePosition;
  const peopleAhead = typeof position === "number" ? Math.max(0, position - 1) : null;
  const estimatedWaitDays = queueEntry?.estimatedWaitDays;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.orange} />
          <Text style={styles.loadingText}>Loading waiting list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Book information unavailable</Text>
          {error ? <Text style={styles.emptyMessage}>{error}</Text> : null}
          <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryActionText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waiting List</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={[styles.heroIcon, isJoined && styles.heroIconJoined]}>
            <Ionicons
              name={isJoined ? "checkmark-circle" : "time-outline"}
              size={43}
              color={isJoined ? COLORS.green : COLORS.orange}
            />
          </View>
          <Text style={styles.eyebrow}>{isJoined ? "YOU'RE ON THE LIST" : "BOOK UNAVAILABLE"}</Text>
          <Text style={styles.heroTitle}>
            {isJoined ? "You're in the queue!" : "Join the waiting list"}
          </Text>
          <Text style={styles.heroDescription}>
            {isJoined
              ? "Your spot is saved. We'll keep your queue information up to date."
              : "This book is currently borrowed. Join the waiting list to save your place."}
          </Text>
        </View>

        <View style={styles.bookCard}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.bookCover} resizeMode="cover" />
          ) : (
            <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
              <Ionicons name="book-outline" size={28} color={COLORS.navy} />
            </View>
          )}
          <View style={styles.bookTextColumn}>
            <Text style={styles.bookCardLabel}>SELECTED BOOK</Text>
            <Text style={styles.bookTitle} numberOfLines={3}>{book.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={2}>{book.author}</Text>
            <View style={styles.borrowedPill}>
              <View style={styles.borrowedDot} />
              <Text style={styles.borrowedPillText}>Currently borrowed</Text>
            </View>
          </View>
        </View>

        {isJoined ? (
          <>
            <Text style={styles.sectionTitle}>Your queue status</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricCardPrimary}>
                <Text style={styles.metricLabelPrimary}>Your position</Text>
                <Text style={styles.metricValuePrimary}>
                  {typeof position === "number" ? `#${position}` : "—"}
                </Text>
                <Text style={styles.metricFooterPrimary}>in the waiting list</Text>
              </View>
              <View style={styles.metricCardSecondary}>
                <Text style={styles.metricLabel}>People ahead</Text>
                <Text style={styles.metricValue}>
                  {peopleAhead === null ? "—" : peopleAhead}
                </Text>
                <Text style={styles.metricFooter}>of {queueTotal} waiting</Text>
              </View>
            </View>

            {typeof estimatedWaitDays === "number" && estimatedWaitDays >= 0 ? (
              <View style={styles.estimateCard}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.orange} />
                <View style={styles.estimateText}>
                  <Text style={styles.estimateTitle}>Estimated waiting time</Text>
                  <Text style={styles.estimateSubtitle}>
                    Approximately {estimatedWaitDays} {estimatedWaitDays === 1 ? "day" : "days"} · This is only an estimate
                  </Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.notifyCard}
              onPress={handleToggleNotify}
              disabled={updatingNotify}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: queueEntry.notifyEnabled ?? true, disabled: updatingNotify }}
              activeOpacity={0.8}
            >
              <View style={styles.notifyIcon}>
                <Ionicons name="notifications-outline" size={21} color={COLORS.navy} />
              </View>
              <View style={styles.notifyText}>
                <Text style={styles.notifyTitle}>Notify me</Text>
                <Text style={styles.notifySubtitle}>Alert me when this book becomes available</Text>
              </View>
              <View style={[styles.checkbox, (queueEntry.notifyEnabled ?? true) && styles.checkboxChecked]}>
                {(queueEntry.notifyEnabled ?? true) ? (
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                ) : null}
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Waiting list overview</Text>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIcon}>
                <Ionicons name="people-outline" size={23} color={COLORS.navy} />
              </View>
              <View style={styles.overviewCopy}>
                <Text style={styles.overviewLabel}>Students currently waiting</Text>
                <Text style={styles.overviewHint}>You'll join after the existing students</Text>
              </View>
              <Text style={styles.overviewCount}>{queueTotal}</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="information-circle-outline" size={19} color={COLORS.navy} />
              <Text style={styles.tipText}>
                Your position may move forward as other students leave the queue.
              </Text>
            </View>
          </>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={19} color={COLORS.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.mainButton, joining && styles.disabledButton]}
          onPress={isJoined ? () => navigation.navigate("MyBookReservations") : handleJoinQueue}
          disabled={joining}
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          {joining ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name={isJoined ? "list-outline" : "add-circle-outline"} size={20} color={COLORS.white} />
              <Text style={styles.mainButtonText}>
                {isJoined ? "View My Reservations" : "Confirm & Join Queue"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>

        {!isJoined ? (
          <TouchableOpacity style={styles.textButton} onPress={() => navigation.goBack()}>
            <Text style={styles.textButtonLabel}>Maybe later</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.bottomNote}>You can manage or leave the queue from My Reservations.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.muted },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  emptyMessage: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.muted, textAlign: "center" },
  secondaryAction: { marginTop: 20, backgroundColor: COLORS.navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  secondaryActionText: { color: COLORS.white, fontSize: 14, fontWeight: "700" },
  header: { height: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.blueSoft },
  headerTitle: { fontSize: 17, fontWeight: "800", color: COLORS.navyDark },
  headerSpacer: { width: 38 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  hero: { alignItems: "center", marginBottom: 23 },
  heroIcon: { width: 86, height: 86, borderRadius: 43, backgroundColor: COLORS.orangeSoft, alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 1, borderColor: COLORS.orangeBorder },
  heroIconJoined: { backgroundColor: COLORS.greenSoft, borderColor: "#CBECD9" },
  eyebrow: { color: COLORS.orange, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 5 },
  heroTitle: { color: COLORS.text, fontSize: 25, fontWeight: "800", letterSpacing: -0.5, textAlign: "center" },
  heroDescription: { marginTop: 9, maxWidth: 310, color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  bookCard: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: COLORS.white, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, shadowColor: "#1B3F94", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  bookCover: { width: 77, height: 106, borderRadius: 8, backgroundColor: COLORS.blueSoft },
  bookCoverPlaceholder: { alignItems: "center", justifyContent: "center" },
  bookTextColumn: { flex: 1, marginLeft: 14, alignItems: "flex-start" },
  bookCardLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2, color: COLORS.muted, marginBottom: 5 },
  bookTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800", color: COLORS.text },
  bookAuthor: { fontSize: 12, lineHeight: 17, color: COLORS.muted, marginTop: 4 },
  borrowedPill: { marginTop: 9, flexDirection: "row", alignItems: "center", borderRadius: 20, backgroundColor: "#FFF0F0", paddingHorizontal: 9, paddingVertical: 5 },
  borrowedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red, marginRight: 6 },
  borrowedPillText: { color: COLORS.red, fontSize: 10, fontWeight: "700" },
  sectionTitle: { marginTop: 25, marginBottom: 12, fontSize: 16, fontWeight: "800", color: COLORS.text },
  metricsRow: { flexDirection: "row", gap: 12 },
  metricCardPrimary: { flex: 1, minHeight: 139, padding: 16, borderRadius: 16, backgroundColor: COLORS.navy, justifyContent: "space-between" },
  metricCardSecondary: { flex: 1, minHeight: 139, padding: 16, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: "space-between" },
  metricLabelPrimary: { fontSize: 12, fontWeight: "600", color: "#D7E4FF" },
  metricValuePrimary: { fontSize: 35, fontWeight: "800", color: COLORS.white },
  metricFooterPrimary: { fontSize: 11, color: "#D7E4FF" },
  metricLabel: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
  metricValue: { fontSize: 35, fontWeight: "800", color: COLORS.text },
  metricFooter: { fontSize: 11, color: COLORS.muted },
  estimateCard: { flexDirection: "row", alignItems: "center", marginTop: 12, borderRadius: 13, padding: 14, backgroundColor: COLORS.orangeSoft, borderWidth: 1, borderColor: COLORS.orangeBorder },
  estimateText: { flex: 1, marginLeft: 10 },
  estimateTitle: { fontSize: 12, fontWeight: "800", color: COLORS.text },
  estimateSubtitle: { fontSize: 11, lineHeight: 17, color: COLORS.muted, marginTop: 3 },
  notifyCard: { marginTop: 17, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 14, flexDirection: "row", alignItems: "center" },
  notifyIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: COLORS.blueSoft, alignItems: "center", justifyContent: "center" },
  notifyText: { flex: 1, marginHorizontal: 12 },
  notifyTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  notifySubtitle: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  checkbox: { width: 23, height: 23, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  overviewCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  overviewIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: COLORS.blueSoft, alignItems: "center", justifyContent: "center" },
  overviewCopy: { flex: 1, marginLeft: 12 },
  overviewLabel: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  overviewHint: { fontSize: 11, lineHeight: 16, color: COLORS.muted, marginTop: 4 },
  overviewCount: { fontSize: 26, fontWeight: "800", color: COLORS.navy, marginLeft: 10 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 15, paddingHorizontal: 4 },
  tipText: { flex: 1, marginLeft: 9, fontSize: 12, lineHeight: 18, color: COLORS.muted },
  errorBox: { flexDirection: "row", alignItems: "flex-start", marginTop: 18, padding: 12, backgroundColor: "#FFF1F1", borderRadius: 10 },
  errorText: { flex: 1, color: COLORS.red, fontSize: 12, lineHeight: 18, marginLeft: 8 },
  mainButton: { height: 54, marginTop: 25, borderRadius: 13, backgroundColor: COLORS.orange, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  mainButtonText: { fontSize: 14, fontWeight: "800", color: COLORS.white },
  disabledButton: { opacity: 0.6 },
  textButton: { alignItems: "center", paddingVertical: 16 },
  textButtonLabel: { fontSize: 13, fontWeight: "700", color: COLORS.muted },
  bottomNote: { textAlign: "center", marginTop: 13, fontSize: 11, lineHeight: 17, color: COLORS.muted },
});
