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
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Book } from "../../types";
import { getBookById, reserveBook } from "../../services/bookService";

type RouteParams = { bookId: string };

const THEME = {
  background: "#F7F9FD",
  white: "#FFFFFF",
  blue: "#1B3F94",
  blueDark: "#163476",
  blueSoft: "#EDF3FD",
  orange: "#F47A2A",
  text: "#19243A",
  muted: "#68758A",
  border: "#E4EAF3",
  greenBg: "#E7F7EC",
  greenText: "#197B42",
  redBg: "#FFF0F0",
  redText: "#C33939",
};

export default function BookDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { bookId } = route.params as RouteParams;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  const loadBook = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        const data = await getBookById(bookId);
        setBook(data);
      } catch (error: any) {
        console.error("Failed to load book:", error);
        Alert.alert("Error", error?.message ?? "Unable to load book.");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [bookId]
  );

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  useFocusEffect(
    useCallback(() => {
      loadBook(false);
    }, [loadBook])
  );

  const handleReserve = async () => {
    if (!book || reserving) return;

    try {
      setReserving(true);
      const reservation = await reserveBook(book.id);
      navigation.navigate("ReservationConfirmation", {
        reservationId: reservation.id,
      });
    } catch (error: any) {
      console.error("Reservation error:", error);
      Alert.alert(
        "Reservation Failed",
        error?.message ?? "Unable to reserve book."
      );
      await loadBook(false);
    } finally {
      setReserving(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={23} color={THEME.blue} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Book Details</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {renderHeader()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.orange} />
          <Text style={styles.loadingText}>Loading book details...</Text>
        </View>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {renderHeader()}
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="book-outline" size={34} color={THEME.blue} />
          </View>
          <Text style={styles.errorTitle}>Book not found</Text>
          <Text style={styles.errorSubtitle}>
            This book is currently unavailable in the catalogue.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isAvailable = book.availabilityStatus === "available";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 28 },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />
          <View style={styles.coverFrame}>
            {book.coverUrl ? (
              <Image
                source={{ uri: book.coverUrl }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="book-outline" size={56} color="#93A7C7" />
                <Text style={styles.coverPlaceholderText}>No Cover Available</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                isAvailable ? styles.availableBadge : styles.borrowedBadge,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isAvailable ? THEME.greenText : THEME.redText },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  isAvailable ? styles.availableText : styles.borrowedText,
                ]}
              >
                {isAvailable ? "Available" : "Borrowed"}
              </Text>
            </View>
          </View>

          <Text style={styles.bookTitle}>{book.title}</Text>
          <View style={styles.authorRow}>
            <Ionicons name="person-outline" size={16} color={THEME.muted} />
            <Text style={styles.authorText}>{book.author || "Unknown author"}</Text>
          </View>

          {(book.category || book.edition) && (
            <View style={styles.metadataRow}>
              {book.category ? (
                <View style={styles.metadataChip}>
                  <Ionicons name="grid-outline" size={14} color={THEME.blue} />
                  <Text style={styles.metadataText}>{book.category}</Text>
                </View>
              ) : null}
              {book.edition ? (
                <View style={styles.metadataChip}>
                  <Ionicons name="layers-outline" size={14} color={THEME.blue} />
                  <Text style={styles.metadataText}>{book.edition}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.sectionTitleRow}>
            <Ionicons name="reader-outline" size={20} color={THEME.blue} />
            <Text style={styles.sectionTitle}>About this book</Text>
          </View>
          <Text style={styles.description}>
            {book.description?.trim() || "A description for this book has not been added yet."}
          </Text>

          <View style={styles.actionCard}>
            <View style={styles.actionHeadingRow}>
              <View style={styles.actionIcon}>
                <Ionicons
                  name={isAvailable ? "checkmark-circle-outline" : "time-outline"}
                  size={22}
                  color={THEME.blue}
                />
              </View>
              <View style={styles.actionHeadingText}>
                <Text style={styles.actionTitle}>
                  {isAvailable ? "Ready to reserve" : "Currently unavailable"}
                </Text>
                <Text style={styles.actionDescription}>
                  {isAvailable
                    ? "Reserve this book and follow the collection instructions."
                    : "Join the waiting list to secure your place in the queue."}
                </Text>
              </View>
            </View>

            {isAvailable ? (
              <TouchableOpacity
                style={[styles.primaryButton, reserving && styles.disabledButton]}
                disabled={reserving}
                activeOpacity={0.85}
                onPress={handleReserve}
                accessibilityRole="button"
              >
                {reserving ? (
                  <ActivityIndicator color={THEME.white} />
                ) : (
                  <>
                    <Ionicons name="bookmark-outline" size={19} color={THEME.white} />
                    <Text style={styles.primaryButtonText}>Reserve This Book</Text>
                    <Ionicons name="arrow-forward" size={18} color={THEME.white} />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("QueueConfirmation", { bookId: book.id })
                }
                accessibilityRole="button"
              >
                <Ionicons name="people-outline" size={19} color={THEME.white} />
                <Text style={styles.primaryButtonText}>Join Waiting List</Text>
                <Ionicons name="arrow-forward" size={18} color={THEME.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.background },
  header: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: THEME.blueSoft,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: THEME.blue },
  headerSpacer: { width: 38 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: {
    height: 260,
    backgroundColor: THEME.blueSoft,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroCircleLarge: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "#E0EAFB",
    top: -110,
    right: -85,
  },
  heroCircleSmall: {
    position: "absolute",
    width: 165,
    height: 165,
    borderRadius: 90,
    backgroundColor: "#E5EEFC",
    bottom: -88,
    left: -55,
  },
  coverFrame: {
    width: 163,
    height: 220,
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 5,
    shadowColor: "#173B72",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  cover: { width: "100%", height: "100%", borderRadius: 8 },
  coverPlaceholder: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F4FA",
    padding: 10,
  },
  coverPlaceholderText: {
    fontSize: 11,
    color: THEME.muted,
    marginTop: 10,
    textAlign: "center",
  },
  mainContent: { paddingHorizontal: 22, paddingTop: 20 },
  statusRow: { flexDirection: "row", marginBottom: 12 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  availableBadge: { backgroundColor: THEME.greenBg },
  borrowedBadge: { backgroundColor: THEME.redBg },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  statusText: { fontSize: 12, fontWeight: "700" },
  availableText: { color: THEME.greenText },
  borrowedText: { color: THEME.redText },
  bookTitle: {
    color: THEME.text,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  authorRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  authorText: { flex: 1, fontSize: 14, color: THEME.muted, marginLeft: 8, lineHeight: 20 },
  metadataRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  metadataChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: THEME.white,
  },
  metadataText: { color: THEME.blue, fontSize: 12, fontWeight: "600" },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 23 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 },
  sectionTitle: { color: THEME.text, fontSize: 17, fontWeight: "800" },
  description: { color: THEME.muted, fontSize: 14, lineHeight: 23 },
  actionCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    marginTop: 24,
    shadowColor: "#173B72",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  actionHeadingRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME.blueSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  actionHeadingText: { flex: 1 },
  actionTitle: { color: THEME.text, fontSize: 15, fontWeight: "800" },
  actionDescription: { color: THEME.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  primaryButton: {
    height: 50,
    width: "100%",
    borderRadius: 13,
    backgroundColor: THEME.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 17,
    paddingHorizontal: 12,
  },
  primaryButtonText: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  disabledButton: { opacity: 0.6 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  loadingText: { color: THEME.muted, marginTop: 12, fontSize: 14 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: THEME.blueSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: { fontSize: 19, fontWeight: "800", color: THEME.text },
  errorSubtitle: { fontSize: 13, color: THEME.muted, textAlign: "center", lineHeight: 20, marginTop: 7 },
});
