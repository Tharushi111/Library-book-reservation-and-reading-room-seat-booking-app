import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import type { BookReservation } from "../../types";

import {
  getReservation,
} from "../../services/bookService";

import { COLORS } from "../../constants/colors";

export default function ReservationConfirmationScreen() {
  const navigation =
    useNavigation<any>();

  const route =
    useRoute<any>();

  const {
    reservationId,
  } = route.params ?? {};

  const [
    reservation,
    setReservation,
  ] =
    useState<BookReservation | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (reservationId) {
      loadReservation();
    } else {
      setLoading(false);
    }
  }, [reservationId]);

  const loadReservation =
    async () => {
      try {
        setLoading(true);

        const data =
          await getReservation(
            reservationId
          );

        setReservation(data);
      } catch (error) {
        console.error(
          "Failed to load reservation:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading reservation...
        </Text>
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Reservation not found
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate(
              "BookCatalogue"
            )
          }
        >
          <Text
            style={styles.buttonText}
          >
            Back to Catalogue
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const book =
    reservation.book;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>

        {/* Success icon */}

        <View
          style={styles.successCircle}
        >
          <Text
            style={styles.checkmark}
          >
            ✓
          </Text>
        </View>

        {/* Title */}

        <Text style={styles.title}>
          Reservation Successful
        </Text>

        <Text style={styles.subtitle}>
          Your book has been successfully
          reserved.
        </Text>

        {/* Book */}

        {book && (
          <View style={styles.bookInfo}>
            <Text
              style={styles.bookTitle}
            >
              {book.title}
            </Text>

            <Text
              style={styles.author}
            >
              {book.author}
            </Text>
          </View>
        )}

        {/* Deadline */}

        <View
          style={styles.deadlineBox}
        >
          <Text
            style={styles.deadlineLabel}
          >
            Collection deadline
          </Text>

          <Text
            style={styles.deadline}
          >
            {reservation.collectionDeadline
              ? new Date(
                  reservation.collectionDeadline
                ).toLocaleString()
              : "48 hours"}
          </Text>
        </View>

        {/* Back */}

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate(
              "BookCatalogue"
            )
          }
        >
          <Text
            style={styles.buttonText}
          >
            Back to Catalogue
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  center: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 20,
  },

  card: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },

  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EAF8EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  checkmark: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.available,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },

  bookInfo: {
    width: "100%",
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
  },

  bookTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  author: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  deadlineBox: {
    width: "100%",
    marginTop: 14,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFF5E8",
  },

  deadlineLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  deadline: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 5,
  },

  button: {
    width: "100%",
    height: 50,
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
});