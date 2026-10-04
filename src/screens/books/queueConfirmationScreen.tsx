import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import { supabase } from "../../services/supabase";
import {
  getBookById,
  getQueueEntry,
  getQueueTotal,
  joinQueue,
} from "../../services/bookService";

import type {
  Book,
  BookQueueEntry,
} from "../../types";

import { COLORS } from "../../constants/colors";

type QueueConfirmationParams = {
  bookId: string;
};

export default function QueueConfirmationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { bookId } =
    route.params as QueueConfirmationParams;

  const [book, setBook] = useState<Book | null>(null);
  const [queueEntry, setQueueEntry] =
    useState<BookQueueEntry | null>(null);

  const [queueTotal, setQueueTotal] =
    useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadQueueInformation();
  }, [bookId]);

  const loadQueueInformation = async () => {
    try {
      setLoading(true);
      setError("");

      // Get the current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in to join the queue."
        );
      }

      // Load the book
      const bookData = await getBookById(bookId);

      setBook(bookData);

      // Check if this user is already in the queue
      const { data: existingEntry, error: existingError } =
        await supabase
          .from("book_queue")
          .select("*, book:books(*)")
          .eq("book_id", bookId)
          .eq("user_id", user.id)
          .eq("status", "waiting")
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingEntry) {
        setQueueEntry(existingEntry as BookQueueEntry);
      } else {
        setQueueEntry(null);
      }

      // Get total waiting
      const total = await getQueueTotal(bookId);

      setQueueTotal(total);
    } catch (err: any) {
      console.error(
        "Failed to load queue information:",
        err
      );

      setError(
        err?.message ||
          "Unable to load queue information."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    try {
      setJoining(true);
      setError("");

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in to join the queue."
        );
      }

      const entry = await joinQueue(
        bookId,
        user.id
      );

      setQueueEntry(entry);

      // Refresh total
      const total = await getQueueTotal(bookId);

      setQueueTotal(total);
    } catch (err: any) {
      console.error(
        "Failed to join queue:",
        err
      );

      setError(
        err?.message ||
          "Unable to join the queue."
      );
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Checking queue...
        </Text>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>
          Book not found
        </Text>

        <Text style={styles.errorText}>
          {error || "Unable to find this book."}
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const alreadyJoined = queueEntry !== null;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Join Queue
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Success message */}
        {alreadyJoined ? (
          <View style={styles.successContainer}>
            <View style={styles.successCircle}>
              <Text style={styles.successIcon}>
                ✓
              </Text>
            </View>

            <Text style={styles.successTitle}>
              You're in the queue!
            </Text>

            <Text style={styles.successText}>
              You have successfully joined the
              waiting queue for this book.
            </Text>
          </View>
        ) : (
          <View style={styles.introContainer}>
            <Text style={styles.introTitle}>
              Book currently borrowed
            </Text>

            <Text style={styles.introText}>
              This book is currently unavailable.
              Join the queue and we'll notify you
              when it becomes available.
            </Text>
          </View>
        )}

        {/* Book */}
        <View style={styles.bookCard}>
          <Text style={styles.bookTitle}>
            {book.title}
          </Text>

          <Text style={styles.bookAuthor}>
            by {book.author}
          </Text>

          <View style={styles.borrowedBadge}>
            <Text style={styles.borrowedText}>
              ● Borrowed
            </Text>
          </View>
        </View>

        {/* Queue Information */}
        {alreadyJoined ? (
          <View style={styles.queueCard}>
            <Text style={styles.sectionTitle}>
              Your Queue Position
            </Text>

            <View style={styles.positionCircle}>
              <Text style={styles.positionNumber}>
                {queueEntry?.queuePosition ?? "-"}
              </Text>
            </View>

            <Text style={styles.positionLabel}>
              Your position in the queue
            </Text>

            <View style={styles.queueDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                People waiting
              </Text>

              <Text style={styles.infoValue}>
                {queueTotal}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Estimated wait
              </Text>

              <Text style={styles.infoValue}>
                {queueEntry?.estimatedWaitDays ?? 0}{" "}
                days
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.queueCard}>
            <Text style={styles.sectionTitle}>
              Current Queue
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                People waiting
              </Text>

              <Text style={styles.infoValue}>
                {queueTotal}
              </Text>
            </View>

            <View style={styles.queueDivider} />

            <Text style={styles.waitInfo}>
              You will be added to position{" "}
              {queueTotal + 1}.
            </Text>
          </View>
        )}

        {/* Error */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorMessage}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Action */}
        {!alreadyJoined ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              joining && styles.disabledButton,
            ]}
            disabled={joining}
            onPress={handleJoinQueue}
          >
            {joining ? (
              <ActivityIndicator
                color={COLORS.white}
              />
            ) : (
              <Text style={styles.primaryButtonText}>
                Confirm & Join Queue
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>
              Back to Book
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  header: {
    height: 64,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: 38,
    fontWeight: "300",
    color: COLORS.textPrimary,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  introContainer: {
    marginBottom: 20,
  },

  introTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  introText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  successContainer: {
    alignItems: "center",
    marginBottom: 24,
  },

  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F7EE",
    alignItems: "center",
    justifyContent: "center",
  },

  successIcon: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.available,
  },

  successTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  successText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.textSecondary,
  },

  bookCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  bookTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  bookAuthor: {
    marginTop: 5,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  borrowedBadge: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#FDECEC",
  },

  borrowedText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.borrowed,
  },

  queueCard: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  positionCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E8F1FC",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },

  positionNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
  },

  positionLabel: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  queueDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 42,
  },

  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  waitInfo: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  errorContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FDECEC",
  },

  errorMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.error,
  },

  primaryButton: {
    height: 52,
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    height: 52,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },

  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    color: COLORS.textSecondary,
  },
});