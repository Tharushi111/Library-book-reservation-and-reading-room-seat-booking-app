import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  getBookById,
  getQueueEntry,
  getQueueTotal,
  joinQueue,
  setQueueNotify,
  subscribeToBookQueue,
} from "../../services/bookService";

import type {
  Book,
  BookQueueEntry,
} from "../../types";

type RouteParams = {
  bookId: string;
};

const THEME = {
  background: "#FFFFFF",

  blue: "#0757B7",

  orange: "#FF6428",

  orangeLight: "#FFD8C7",

  orangeBorder: "#FFAF8D",

  text: "#111111",

  textSecondary: "#666666",

  border: "#E3E9F0",

  iconBackground: "#FFB89D",
};

export default function QueueConfirmationScreen() {
  const navigation =
    useNavigation<any>();

  const route =
    useRoute<any>();

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
    queueEntry,
    setQueueEntry,
  ] =
    useState<BookQueueEntry | null>(
      null
    );

  const [
    queueTotal,
    setQueueTotal,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    joining,
    setJoining,
  ] =
    useState(false);

  const [
    updatingNotify,
    setUpdatingNotify,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /* LOAD QUEUE */

  const loadQueueInformation =
    useCallback(
      async (
        showLoading = false
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          setError("");

          const [
            bookData,
            existingEntry,
            total,
          ] =
            await Promise.all([
              getBookById(
                bookId
              ),

              getQueueEntry(
                bookId
              ),

              getQueueTotal(
                bookId
              ),
            ]);

          setBook(
            bookData
          );

          setQueueEntry(
            existingEntry
          );

          setQueueTotal(
            total
          );
        } catch (
          err: any
        ) {
          console.error(
            "Queue loading error:",
            err
          );

          setError(
            err?.message ??
              "Unable to load queue information."
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [
        bookId,
      ]
    );

  /* INITIAL LOAD */

  useEffect(
    () => {
      loadQueueInformation(
        true
      );
    },
    [
      loadQueueInformation,
    ]
  );

  /* REFRESH WHEN SCREEN IS OPENED                      */
  useFocusEffect(
    useCallback(
      () => {
        loadQueueInformation();
      },
      [
        loadQueueInformation,
      ]
    )
  );

  /* SUPABASE REALTIME                                  */
  useEffect(
    () => {
      if (!bookId) {
        return;
      }

      const unsubscribe =
        subscribeToBookQueue(
          bookId,
          () => {
            loadQueueInformation();
          }
        );

      return () => {
        unsubscribe();
      };
    },
    [
      bookId,
      loadQueueInformation,
    ]
  );

  /* JOIN QUEUE                                         */
  const handleJoinQueue =
    async () => {
      try {
        setJoining(true);

        setError("");

        const latestBook =
          await getBookById(
            bookId
          );

        if (
          latestBook.availabilityStatus ===
          "available"
        ) {
          throw new Error(
            "This book is now available. You can reserve it directly."
          );
        }

        await joinQueue(
          bookId
        );

        await loadQueueInformation();
      } catch (
        err: any
      ) {
        console.error(
          "Join queue error:",
          err
        );

        setError(
          err?.message ??
            "Unable to join queue."
        );
      } finally {
        setJoining(false);
      }
    };

  /* NOTIFY CHECKBOX                                    */
  const handleToggleNotify =
    async () => {
      if (
        !queueEntry ||
        updatingNotify
      ) {
        return;
      }

      const newValue =
        !(
          queueEntry.notifyEnabled ??
          true
        );

      const previousValue =
        queueEntry.notifyEnabled ??
        true;

      setQueueEntry({
        ...queueEntry,
        notifyEnabled:
          newValue,
      });

      try {
        setUpdatingNotify(
          true
        );

        await setQueueNotify(
          queueEntry.id,
          newValue
        );
      } catch (
        err
      ) {
        console.error(
          "Notify update error:",
          err
        );

        setQueueEntry({
          ...queueEntry,
          notifyEnabled:
            previousValue,
        });

        setError(
          "Unable to update notification preference."
        );
      } finally {
        setUpdatingNotify(
          false
        );
      }
    };

  /* LOADING                                            */
  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={[
          "top",
          "left",
          "right",
        ]}
      >
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
            Loading queue...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* BOOK ERROR                                         */
  if (!book) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={[
          "top",
          "left",
          "right",
        ]}
      >
        <View
          style={
            styles.center
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            Book information unavailable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* BEFORE USER JOINS                                  */
  if (!queueEntry) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={[
          "top",
          "left",
          "right",
        ]}
      >
        <ScrollView
          contentContainerStyle={
            styles.preJoinContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={
              0.7
            }
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={
                THEME.blue
              }
            />
          </TouchableOpacity>

          <View
            style={
              styles.iconCircle
            }
          >
            <Ionicons
              name="hourglass-outline"
              size={55}
              color="#101820"
            />
          </View>

          <Text
            style={
              styles.confirmTitle
            }
          >
            Join the Queue?
          </Text>

          <Text
            style={
              styles.confirmBook
            }
          >
            {book.title}
          </Text>

          <Text
            style={
              styles.confirmDescription
            }
          >
            This book is currently borrowed.
            Join the queue and we'll keep your
            place until it becomes available.
          </Text>

          <View
            style={
              styles.queueInfoCard
            }
          >
            <Text
              style={
                styles.queueInfoLabel
              }
            >
              People currently waiting
            </Text>

            <Text
              style={
                styles.queueInfoNumber
              }
            >
              {queueTotal}
            </Text>
          </View>

          {error ? (
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.mainButton,

              joining &&
                styles.disabledButton,
            ]}
            disabled={
              joining
            }
            onPress={
              handleJoinQueue
            }
            activeOpacity={
              0.85
            }
          >
            {joining ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.mainButtonText
                }
              >
                Confirm & Join Queue
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* QUEUE CONFIRMATION                                 */
  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* Back */}

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={
            0.7
          }
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={
              THEME.blue
            }
          />
        </TouchableOpacity>

        {/* Hourglass */}

        <View
          style={
            styles.iconCircle
          }
        >
          <Ionicons
            name="hourglass-outline"
            size={55}
            color="#101820"
          />
        </View>

        {/* Main Content */}

        <Text
          style={
            styles.title
          }
        >
          You’re in the Queue
        </Text>

        <View
          style={
            styles.positionRow
          }
        >
          <Text
            style={
              styles.bookTitle
            }
            numberOfLines={
              1
            }
          >
            {book.title}
          </Text>

          <Text
            style={
              styles.positionText
            }
          >
            position{" "}
            {queueEntry.queuePosition ??
              "-"}{" "}
            of{" "}
            {queueTotal}
          </Text>
        </View>

        {/* Estimated Wait */}

        <View
          style={
            styles.waitCard
          }
        >
          <Text
            style={
              styles.waitLabel
            }
          >
            Estimated wait
          </Text>

          <Text
            style={
              styles.waitValue
            }
          >
            ~{" "}
            {queueEntry.estimatedWaitDays ??
              4}{" "}
            Days
          </Text>
        </View>

        {/* Notify */}

        <TouchableOpacity
          style={
            styles.notifyRow
          }
          onPress={
            handleToggleNotify
          }
          disabled={
            updatingNotify
          }
          activeOpacity={
            0.7
          }
        >
          <View
            style={[
              styles.checkbox,

              (queueEntry.notifyEnabled ??
                true) &&
                styles.checkboxChecked,
            ]}
          >
            {(queueEntry.notifyEnabled ??
              true) && (
              <Ionicons
                name="checkmark"
                size={16}
                color="#FFFFFF"
              />
            )}
          </View>

          <View
            style={
              styles.notifyTextContainer
            }
          >
            <Text
              style={
                styles.notifyTitle
              }
            >
              Notify me
            </Text>

            <Text
              style={
                styles.notifySubtitle
              }
            >
              Notify me when this book becomes available
            </Text>
          </View>
        </TouchableOpacity>

        {error ? (
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        ) : null}

        {/* My Reservations */}

        <TouchableOpacity
          style={
            styles.mainButton
          }
          activeOpacity={
            0.85
          }
          onPress={() =>
            navigation.navigate("MyBookReservations")
          }
        >
          <Text
            style={
              styles.mainButtonText
            }
          >
            My Reservations
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* STYLES                                             */
const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        THEME.background,
    },

    center: {
      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",

      paddingHorizontal:
        30,
    },

    loadingText: {
      marginTop: 12,

      color:
        THEME.textSecondary,
    },

    /* MAIN CONTENT                                       */
    content: {
      flexGrow: 1,

      paddingHorizontal:
        28,

      /*
       * SafeAreaView already protects
       * the status bar area.
       *
       * This is only extra visual spacing.
       */
      paddingTop: 8,

      paddingBottom:
        40,
    },

    preJoinContent: {
      flexGrow: 1,

      paddingHorizontal:
        28,

      paddingTop: 8,

      paddingBottom:
        40,

      alignItems:
        "center",
    },

    /* BACK BUTTON                                        */
    backButton: {
      width: 46,

      height: 46,

      justifyContent:
        "center",

      alignItems:
        "flex-start",

      alignSelf:
        "flex-start",

      marginLeft:
        -10,
    },

    /* ICON                                               */
    iconCircle: {
      width: 104,

      height: 104,

      borderRadius:
        52,

      backgroundColor:
        THEME.iconBackground,

      justifyContent:
        "center",

      alignItems:
        "center",

      alignSelf:
        "center",

      marginTop:
        35,

      marginBottom:
        46,
    },

    /* TITLE                                              */
    title: {
      fontSize: 23,

      lineHeight: 29,

      fontWeight:
        "800",

      color:
        THEME.text,

      textAlign:
        "center",
    },

    /* POSITION                                           */
    positionRow: {
      marginTop: 3,

      flexDirection:
        "row",

      justifyContent:
        "center",

      alignItems:
        "center",

      flexWrap:
        "wrap",

      columnGap: 10,
    },

    bookTitle: {
      maxWidth:
        "58%",

      fontSize: 14,

      fontWeight:
        "500",

      color:
        THEME.text,
    },

    positionText: {
      fontSize: 14,

      color:
        THEME.textSecondary,
    },

    /* WAIT CARD                                          */
    waitCard: {
      height: 122,

      marginTop:
        36,

      borderRadius:
        7,

      borderWidth:
        1,

      borderColor:
        THEME.orangeBorder,

      backgroundColor:
        THEME.orangeLight,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    waitLabel: {
      fontSize: 12,

      color:
        THEME.text,
    },

    waitValue: {
      marginTop: 3,

      fontSize: 19,

      fontWeight:
        "800",

      color:
        THEME.text,
    },

    /* NOTIFY                                             */
    notifyRow: {
      marginTop:
        21,

      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal:
        3,
    },

    checkbox: {
      width: 22,

      height: 22,

      borderRadius:
        5,

      borderWidth:
        2,

      borderColor:
        THEME.orange,

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    checkboxChecked: {
      backgroundColor:
        THEME.orange,

      borderColor:
        THEME.orange,
    },

    notifyTextContainer: {
      marginLeft: 10,

      flex: 1,
    },

    notifyTitle: {
      fontSize: 14,

      fontWeight:
        "700",

      color:
        THEME.text,
    },

    notifySubtitle: {
      marginTop: 1,

      fontSize: 11,

      color:
        THEME.textSecondary,
    },

    /* BUTTON                                             */
    mainButton: {
      height: 48,

      marginTop:
        28,

      marginHorizontal:
        32,

      borderRadius:
        8,

      backgroundColor:
        THEME.orange,

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    mainButtonText: {
      color:
        "#FFFFFF",

      fontSize: 14,

      fontWeight:
        "700",
    },

    disabledButton: {
      opacity:
        0.65,
    },

    /* ERROR                                              */
    errorText: {
      marginTop:
        15,

      color:
        "#D32F2F",

      textAlign:
        "center",

      fontSize:
        13,
    },

    /* PRE-JOIN                                           */
    confirmTitle: {
      fontSize: 24,

      fontWeight:
        "800",

      color:
        THEME.text,

      textAlign:
        "center",
    },

    confirmBook: {
      marginTop: 8,

      fontSize: 17,

      fontWeight:
        "700",

      color:
        THEME.text,

      textAlign:
        "center",
    },

    confirmDescription: {
      marginTop: 12,

      paddingHorizontal:
        10,

      fontSize: 14,

      lineHeight: 21,

      color:
        THEME.textSecondary,

      textAlign:
        "center",
    },

    queueInfoCard: {
      width: "100%",

      marginTop: 32,

      paddingVertical:
        22,

      borderRadius:
        10,

      borderWidth: 1,

      borderColor:
        THEME.orangeBorder,

      backgroundColor:
        THEME.orangeLight,

      alignItems:
        "center",
    },

    queueInfoLabel: {
      fontSize: 13,

      color:
        THEME.textSecondary,
    },

    queueInfoNumber: {
      marginTop: 3,

      fontSize: 23,

      fontWeight:
        "800",

      color:
        THEME.text,
    },
  });