import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import type { Book } from "../../types";

import {
  getBookById,
  reserveBook,
} from "../../services/bookService";

import { COLORS } from "../../constants/colors";

type RouteParams = {
  bookId: string;
};

export default function BookDetailsScreen() {
  const navigation =
    useNavigation<any>();

  const route =
    useRoute();

  const { bookId } =
    route.params as RouteParams;

  const [book, setBook] =
    useState<Book | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [reserving, setReserving] =
    useState(false);

  /**
   * Load the selected book.
   */
  useEffect(() => {
    loadBook();
  }, [bookId]);

  const loadBook = async () => {
    try {
      setLoading(true);

      const data =
        await getBookById(
          bookId
        );

      setBook(data);
    } catch (error) {
      console.error(
        "Failed to load book:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to load book details."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reserve the current book.
   */
  const handleReserve = async () => {
    if (!book || reserving) return;

    try {
        setReserving(true);

        console.log("Starting reservation for:", book.id);

        const reservation = await reserveBook(book.id);

        console.log(
        "Reservation created successfully:",
        reservation
        );

        navigation.navigate("ReservationConfirmation", {
        reservationId: reservation.id,
        });
    } catch (error: any) {
        console.error("Failed to reserve book:", error);

        Alert.alert(
        "Reservation Failed",
        error?.message ?? "Unable to reserve this book."
        );
    } finally {
        setReserving(false);
    }
    };

  /**
   * Loading state.
   */
  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading book details...
        </Text>
      </View>
    );
  }

  /**
   * Book not found.
   */
  if (!book) {
    return (
      <View
        style={styles.center}
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Book not found
        </Text>

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAvailable =
    book.availabilityStatus ===
    "available";

  const isReserved =
    book.availabilityStatus ===
    "reserved";

  return (
    <View
      style={styles.screen}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.container
        }
      >
        {/* Back button */}

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ← Back
          </Text>
        </TouchableOpacity>

        {/* Book Cover */}

        {book.coverUrl ? (
          <Image
            source={{
              uri: book.coverUrl,
            }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.coverPlaceholder
            }
          >
            <Text
              style={
                styles.coverPlaceholderText
              }
            >
              No Cover
            </Text>
          </View>
        )}

        {/* Title */}

        <Text
          style={styles.title}
        >
          {book.title}
        </Text>

        {/* Author */}

        <Text
          style={styles.author}
        >
          By {book.author}
        </Text>

        {/* Availability */}

        <View
          style={[
            styles.statusContainer,
            {
              backgroundColor:
                isAvailable
                  ? "#E8F7EE"
                  : isReserved
                  ? "#FFF4E5"
                  : "#FDECEC",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: isAvailable
                  ? COLORS.available
                  : isReserved
                  ? COLORS.warning
                  : COLORS.borrowed,
              },
            ]}
          >
            {isAvailable
              ? "● Available"
              : isReserved
              ? "● Reserved"
              : "● Borrowed"}
          </Text>
        </View>

        {/* Book Information */}

        <View
          style={
            styles.infoSection
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Book Information
          </Text>

          <View
            style={styles.infoRow}
          >
            <Text
              style={
                styles.infoLabel
              }
            >
              Category
            </Text>

            <Text
              style={
                styles.infoValue
              }
            >
              {book.category}
            </Text>
          </View>

          {book.edition && (
            <View
              style={
                styles.infoRow
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Edition
              </Text>

              <Text
                style={
                  styles.infoValue
                }
              >
                {book.edition}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}

        {book.description && (
          <View
            style={
              styles.descriptionSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Description
            </Text>

            <Text
              style={
                styles.description
              }
            >
              {book.description}
            </Text>
          </View>
        )}

        {/* Action */}

        {isAvailable ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              reserving &&
                styles.disabledButton,
            ]}
            onPress={
              handleReserve
            }
            disabled={reserving}
          >
            {reserving ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Reserve Book
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={
              styles.queueButton
            }
            onPress={() =>
              navigation.navigate(
                "QueueConfirmation",
                {
                  bookId:
                    book.id,
                }
              )
            }
          >
            <Text
              style={
                styles.queueButtonText
              }
            >
              Join Queue
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        COLORS.surface,
    },

    container: {
      padding: 20,
      paddingBottom: 40,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.surface,
      padding: 20,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color:
        COLORS.textSecondary,
    },

    errorTitle: {
      fontSize: 20,
      fontWeight: "700",
      color:
        COLORS.textPrimary,
      marginBottom: 20,
    },

    backButton: {
      alignSelf:
        "flex-start",
      marginBottom: 18,
    },

    backButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color:
        COLORS.primary,
    },

    cover: {
      width: "100%",
      height: 360,
      borderRadius: 12,
      backgroundColor:
        "#E8F1FC",
      marginBottom: 20,
    },

    coverPlaceholder: {
      width: "100%",
      height: 360,
      borderRadius: 12,
      backgroundColor:
        "#E8F1FC",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },

    coverPlaceholderText: {
      fontSize: 14,
      color:
        COLORS.textSecondary,
    },

    title: {
      fontSize: 26,
      fontWeight: "700",
      color:
        COLORS.textPrimary,
      marginBottom: 6,
    },

    author: {
      fontSize: 15,
      color:
        COLORS.textSecondary,
      marginBottom: 16,
    },

    statusContainer: {
      alignSelf:
        "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      marginBottom: 24,
    },

    statusText: {
      fontSize: 13,
      fontWeight: "600",
    },

    infoSection: {
      marginBottom: 24,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color:
        COLORS.textPrimary,
      marginBottom: 14,
    },

    infoRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    infoLabel: {
      fontSize: 14,
      color:
        COLORS.textSecondary,
    },

    infoValue: {
      fontSize: 14,
      fontWeight: "600",
      color:
        COLORS.textPrimary,
    },

    descriptionSection: {
      marginBottom: 28,
    },

    description: {
      fontSize: 14,
      lineHeight: 22,
      color:
        COLORS.textSecondary,
    },

    primaryButton: {
      height: 52,
      borderRadius: 10,
      backgroundColor:
        COLORS.primary,
      alignItems: "center",
      justifyContent:
        "center",
    },

    disabledButton: {
      opacity: 0.7,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },

    queueButton: {
      height: 52,
      borderRadius: 10,
      backgroundColor:
        COLORS.warning,
      alignItems: "center",
      justifyContent:
        "center",
    },

    queueButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
  });