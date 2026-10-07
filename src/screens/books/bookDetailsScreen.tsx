import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

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

import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type {
  Book,
} from "../../types";

import {
  getBookById,
  reserveBook,
} from "../../services/bookService";

type RouteParams = {
  bookId: string;
};

const THEME = {
  white:
    "#FFFFFF",

  blue:
    "#0057B8",

  orange:
    "#FF6525",

  text:
    "#111111",

  secondary:
    "#777777",

  availableBg:
    "#9BF09B",

  availableText:
    "#168324",

  borrowedBg:
    "#FFACB0",

  borrowedText:
    "#E00013",
};

export default function BookDetailsScreen() {
  const navigation =
    useNavigation<any>();

  const route =
    useRoute();

  const insets =
    useSafeAreaInsets();

  const {
    bookId,
  } =
    route.params as RouteParams;

  const [
    book,
    setBook,
  ] =
    useState<Book | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    reserving,
    setReserving,
  ] =
    useState(false);

  const loadBook =
    useCallback(
      async (
        showLoader =
          true
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          const data =
            await getBookById(
              bookId
            );

          setBook(
            data
          );
        } catch (
          error: any
        ) {
          console.error(
            "Failed to load book:",
            error
          );

          Alert.alert(
            "Error",
            error?.message ??
              "Unable to load book."
          );
        } finally {
          if (
            showLoader
          ) {
            setLoading(
              false
            );
          }
        }
      },
      [
        bookId,
      ]
    );

  useEffect(
    () => {
      loadBook();
    },
    [
      loadBook,
    ]
  );

  useFocusEffect(
    useCallback(
      () => {
        loadBook(
          false
        );
      },
      [
        loadBook,
      ]
    )
  );

  const handleReserve =
    async () => {
      if (
        !book ||
        reserving
      ) {
        return;
      }

      try {
        setReserving(
          true
        );

        const reservation =
          await reserveBook(
            book.id
          );

        navigation.navigate(
          "ReservationConfirmation",
          {
            reservationId:
              reservation.id,
          }
        );
      } catch (
        error: any
      ) {
        console.error(
          "Reservation error:",
          error
        );

        Alert.alert(
          "Reservation Failed",
          error?.message ??
            "Unable to reserve book."
        );

        await loadBook(
          false
        );
      } finally {
        setReserving(
          false
        );
      }
    };

  if (loading) {
    return (
      <View
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
          color={
            THEME.orange
          }
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

  if (!book) {
    return (
      <View
        style={
          styles.center
        }
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
            styles.primaryButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.primaryButtonText
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
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
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
              styles.backArrow
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.coverSection
          }
        >
          {book.coverUrl ? (
            <Image
              source={{
                uri:
                  book.coverUrl,
              }}
              style={
                styles.cover
              }
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
        </View>

        <View
          style={
            styles.bookInfo
          }
        >
          <Text
            style={
              styles.title
            }
          >
            {book.title}
          </Text>

          <Text
            style={
              styles.author
            }
          >
            {book.author}

            {book.edition
              ? `  ${book.edition}`
              : ""}
          </Text>

          <View
            style={[
              styles.statusBadge,

              isAvailable
                ? styles.availableBadge
                : styles.borrowedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,

                isAvailable
                  ? styles.availableText
                  : styles.borrowedText,
              ]}
            >
              {isAvailable
                ? "Available"
                : "Borrowed"}
            </Text>
          </View>
        </View>

        {book.description && (
          <View
            style={
              styles.descriptionSection
            }
          >
            <Text
              style={
                styles.description
              }
            >
              {
                book.description
              }
            </Text>
          </View>
        )}

        {isAvailable ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,

              reserving &&
                styles.disabledButton,
            ]}
            disabled={
              reserving
            }
            onPress={
              handleReserve
            }
          >
            {reserving ? (
              <ActivityIndicator
                color={
                  THEME.white
                }
              />
            ) : (
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Reserve This Book
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
        THEME.white,
    },

    scrollContent: {
      flexGrow: 1,
      paddingBottom:
        100,
    },

    center: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        THEME.white,

      paddingHorizontal:
        30,
    },

    loadingText: {
      marginTop:
        12,

      color:
        THEME.secondary,
    },

    errorTitle: {
      fontSize: 20,

      fontWeight:
        "700",

      marginBottom:
        20,

      color:
        THEME.text,
    },

    backButton: {
      width: 45,
      height: 50,

      marginLeft:
        24,

      marginTop:
        8,

      justifyContent:
        "center",
    },

    backArrow: {
      fontSize: 32,

      color:
        THEME.blue,
    },

    coverSection: {
      alignItems:
        "center",

      marginTop:
        46,
    },

    cover: {
      width: 168,
      height: 196,

      borderRadius:
        7,
    },

    coverPlaceholder: {
      width: 168,
      height: 196,

      borderRadius:
        7,

      backgroundColor:
        "#E8F1FC",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    coverPlaceholderText: {
      color:
        THEME.secondary,
    },

    bookInfo: {
      alignItems:
        "center",

      marginTop:
        52,

      paddingHorizontal:
        24,
    },

    title: {
      fontSize: 23,

      fontWeight:
        "800",

      lineHeight: 28,

      color:
        THEME.text,

      textAlign:
        "center",
    },

    author: {
      marginTop:
        4,

      fontSize: 12,

      color:
        THEME.secondary,

      textAlign:
        "center",
    },

    statusBadge: {
      marginTop:
        7,

      paddingHorizontal:
        16,

      paddingVertical:
        4,

      borderRadius:
        20,
    },

    statusText: {
      fontSize: 11,

      fontWeight:
        "600",
    },

    availableBadge: {
      backgroundColor:
        THEME.availableBg,
    },

    availableText: {
      color:
        THEME.availableText,
    },

    borrowedBadge: {
      backgroundColor:
        THEME.borrowedBg,
    },

    borrowedText: {
      color:
        THEME.borrowedText,
    },

    descriptionSection: {
      marginTop:
        24,

      paddingHorizontal:
        44,
    },

    description: {
      fontSize: 11,

      lineHeight: 14,

      color:
        THEME.text,
    },

    primaryButton: {
      alignSelf:
        "center",

      width: 178,
      height: 36,

      marginTop:
        24,

      borderRadius:
        7,

      backgroundColor:
        THEME.orange,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    primaryButtonText: {
      color:
        THEME.white,

      fontSize: 11,

      fontWeight:
        "700",
    },

    queueButton: {
      alignSelf:
        "center",

      width: 178,
      height: 36,

      marginTop:
        24,

      borderRadius:
        7,

      backgroundColor:
        THEME.orange,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    queueButtonText: {
      color:
        THEME.white,

      fontSize: 11,

      fontWeight:
        "700",
    },

    disabledButton: {
      opacity:
        0.6,
    },
  });