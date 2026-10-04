import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type {
  BookReservation,
} from "../../types";

import {
  cancelReservation,
  getReservation,
} from "../../services/bookService";

const THEME = {
  white: "#FFFFFF",
  blue: "#0057B8",
  text: "#000000",
  secondary: "#555555",

  green: "#10C84A",
  darkGreen: "#079134",
  lightGreen: "#4DF577",

  peach: "#FFD9C9",
  peachBorder: "#FFAA83",

  red: "#FF1F2D",
};

export default function ReservationConfirmationScreen() {
  const navigation =
    useNavigation<any>();

  const route =
    useRoute<any>();

  const insets =
    useSafeAreaInsets();

  const { reservationId } =
    route.params ?? {};

  const [
    reservation,
    setReservation,
  ] =
    useState<BookReservation | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    cancelling,
    setCancelling,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    if (reservationId) {
      loadReservation();
    } else {
      setLoading(false);

      setError(
        "Reservation ID is missing."
      );
    }
  }, [reservationId]);

  const loadReservation =
    async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getReservation(
            reservationId
          );

        setReservation(data);
      } catch (err: any) {
        console.error(
          "Reservation error:",
          err
        );

        setError(
          err?.message ??
            "Unable to load reservation."
        );
      } finally {
        setLoading(false);
      }
    };

  const goBack = () => {
    navigation.goBack();
  };

  const performCancellation =
    async () => {
      try {
        setCancelling(true);

        await cancelReservation(
          reservationId
        );

        Alert.alert(
          "Reservation Cancelled",
          "Your reservation has been cancelled successfully.",
          [
            {
              text: "OK",

              onPress: () => {
                navigation.navigate(
                  "BookCatalogue"
                );
              },
            },
          ]
        );
      } catch (err: any) {
        console.error(
          "Cancel reservation error:",
          err
        );

        Alert.alert(
          "Unable to Cancel",
          err?.message ??
            "Something went wrong while cancelling the reservation."
        );
      } finally {
        setCancelling(false);
      }
    };

  const handleCancelReservation =
    () => {
      Alert.alert(
        "Cancel Reservation",
        "Are you sure you want to cancel this reservation?",
        [
          {
            text: "No",
            style: "cancel",
          },

          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress:
              performCancellation,
          },
        ]
      );
    };

  const getRemainingTime =
    () => {
      if (
        !reservation?.collectionDeadline
      ) {
        return "4h 50m";
      }

      const deadline =
        new Date(
          reservation.collectionDeadline
        ).getTime();

      const now =
        new Date().getTime();

      const diff =
        deadline - now;

      if (diff <= 0) {
        return "Expired";
      }

      const totalMinutes =
        Math.floor(
          diff / (1000 * 60)
        );

      const hours =
        Math.floor(
          totalMinutes / 60
        );

      const minutes =
        totalMinutes % 60;

      return `${hours}h ${minutes}m`;
    };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={THEME.blue}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading reservation...
        </Text>
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.center}>
        <Text
          style={styles.errorTitle}
        >
          Reservation not found
        </Text>

        <Text
          style={
            styles.errorMessage
          }
        >
          {error}
        </Text>

        <TouchableOpacity
          style={
            styles.errorButton
          }
          onPress={goBack}
        >
          <Text
            style={
              styles.errorButtonText
            }
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop:
            insets.top,
        },
      ]}
    >
      {/* Back Button */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={goBack}
        activeOpacity={0.7}
      >
        <Text
          style={styles.backIcon}
        >
          ‹
        </Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Success Circle */}

        <View
          style={
            styles.successOuterCircle
          }
        >
          <View
            style={
              styles.successInnerCircle
            }
          >
            <Text
              style={
                styles.checkmark
              }
            >
              ✓
            </Text>
          </View>
        </View>

        {/* Title */}

        <Text style={styles.title}>
          Reservation Confirmed
        </Text>

        {/* Book Name */}

        <Text
          style={styles.subtitle}
        >
          <Text
            style={
              styles.bookName
            }
          >
            {reservation.book
              ?.title ??
              "Your book"}
          </Text>

          <Text
            style={
              styles.subtitleLight
            }
          >
            {" "}
            is being held for you
          </Text>
        </Text>

        {/* Collection Box */}

        <View
          style={
            styles.collectionBox
          }
        >
          <Text
            style={
              styles.collectionLabel
            }
          >
            Collect within
          </Text>

          <Text
            style={
              styles.collectionTime
            }
          >
            {getRemainingTime()}
          </Text>

          <Text
            style={
              styles.collectionLocation
            }
          >
            Pickup desk, 1st Floor
          </Text>
        </View>

        {/* Cancel Button */}

        <TouchableOpacity
          style={[
            styles.cancelButton,

            cancelling &&
              styles.cancelButtonDisabled,
          ]}
          onPress={
            handleCancelReservation
          }
          disabled={cancelling}
          activeOpacity={0.8}
        >
          {cancelling ? (
            <ActivityIndicator
              size="small"
              color={THEME.red}
            />
          ) : (
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel Reservation
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,

      backgroundColor:
        THEME.white,
    },

    center: {
      flex: 1,

      backgroundColor:
        THEME.white,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        30,
    },

    loadingText: {
      marginTop: 12,

      fontSize: 13,

      color:
        THEME.secondary,
    },

    backButton: {
      width: 50,

      height: 48,

      marginLeft: 22,

      marginTop: 5,

      justifyContent:
        "center",

      alignItems:
        "flex-start",
    },

    backIcon: {
      color:
        THEME.blue,

      fontSize: 32,

      fontWeight:
        "700",

      lineHeight: 34,
    },

    content: {
      flex: 1,

      alignItems:
        "center",

      paddingHorizontal:
        36,

      paddingTop: 33,
    },

    successOuterCircle: {
      width: 104,

      height: 104,

      borderRadius: 52,

      backgroundColor:
        THEME.green,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderWidth: 3,

      borderColor:
        THEME.lightGreen,

      shadowColor: "#000",

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.2,

      shadowRadius: 4,

      elevation: 6,

      marginBottom: 45,
    },

    successInnerCircle: {
      width: 96,

      height: 96,

      borderRadius: 48,

      backgroundColor:
        THEME.green,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderBottomWidth: 5,

      borderBottomColor:
        THEME.darkGreen,
    },

    checkmark: {
      color:
        THEME.white,

      fontSize: 63,

      fontWeight:
        "800",

      lineHeight: 68,

      transform: [
        {
          rotate: "-4deg",
        },
      ],
    },

    title: {
      color:
        THEME.text,

      fontSize: 22,

      fontWeight:
        "800",

      textAlign:
        "center",

      letterSpacing:
        -0.5,
    },

    subtitle: {
      marginTop: 3,

      fontSize: 13,

      textAlign:
        "center",
    },

    bookName: {
      color:
        THEME.text,
    },

    subtitleLight: {
      color: "#7A7A7A",
    },

    collectionBox: {
      width: 240,

      height: 122,

      marginTop: 35,

      backgroundColor:
        THEME.peach,

      borderWidth: 1,

      borderColor:
        THEME.peachBorder,

      borderRadius: 8,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    collectionLabel: {
      color:
        THEME.text,

      fontSize: 11,

      marginBottom: 2,
    },

    collectionTime: {
      color:
        THEME.text,

      fontSize: 18,

      fontWeight:
        "800",

      lineHeight: 22,
    },

    collectionLocation: {
      marginTop: 4,

      color:
        THEME.text,

      fontSize: 11,
    },

    cancelButton: {
      width: 178,

      height: 31,

      marginTop: 45,

      borderWidth: 1.3,

      borderColor:
        THEME.red,

      borderRadius: 7,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        THEME.white,
    },

    cancelButtonDisabled: {
      opacity: 0.55,
    },

    cancelButtonText: {
      color:
        THEME.red,

      fontSize: 11,

      fontWeight:
        "700",
    },

    errorTitle: {
      fontSize: 20,

      fontWeight:
        "700",

      color:
        THEME.text,
    },

    errorMessage: {
      marginTop: 8,

      color:
        THEME.secondary,

      fontSize: 13,

      textAlign:
        "center",
    },

    errorButton: {
      marginTop: 20,

      paddingHorizontal:
        24,

      height: 42,

      borderRadius: 7,

      backgroundColor:
        THEME.blue,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    errorButtonText: {
      color:
        THEME.white,

      fontWeight:
        "700",
    },
  });