import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import {
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../../services/supabase";
import { COLORS } from "../../constants/colors";
import { RootStackParamList } from "../../navigation/types";

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    "SearchResults"
  >;

type Book = {
  id: string;
  title: string;
  author: string;
  category: string | null;
  description: string | null;
  edition: string | null;
  cover_url: string | null;

  availability_status:
    | "available"
    | "borrowed"
    | "reserved";
};

export default function SearchResultsScreen({
  navigation,
  route,
}: Props) {
  const query =
    route.params?.query?.trim() ?? "";

  const [books, setBooks] =
    useState<Book[]>([]);

  const [loading, setLoading] =
    useState(true);

  // =====================================================
  // SEARCH BOOKS FROM SUPABASE
  // =====================================================

  const loadBooks =
    useCallback(async () => {
      try {
        setLoading(true);

        if (!query) {
          setBooks([]);
          return;
        }

        /*
         * Search title, author and category.
         *
         * Example query:
         * Engineering
         *
         * Can match:
         * Software Engineering
         * Engineering Mathematics
         * category = Engineering
         */
        const {
          data,
          error,
        } = await supabase
          .from("books")
          .select(
            `
            id,
            title,
            author,
            category,
            description,
            edition,
            cover_url,
            availability_status
            `
          )
          .or(
            `title.ilike.%${query}%,author.ilike.%${query}%,category.ilike.%${query}%`
          )
          .order("title", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        setBooks(
          (data ?? []) as Book[]
        );
      } catch (error) {
        console.error(
          "Search books error:",
          error
        );

        setBooks([]);
      } finally {
        setLoading(false);
      }
    }, [query]);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  // =====================================================
  // OPEN BOOK DETAILS
  // =====================================================

  const openBookDetails = (
    bookId: string
  ) => {
    navigation.navigate(
      "BookDetails",
      {
        bookId,
      }
    );
  };

  // =====================================================
  // AVAILABILITY
  // =====================================================

  const getStatusLabel = (
    status: Book["availability_status"]
  ) => {
    if (status === "available") {
      return "Available";
    }

    if (status === "borrowed") {
      return "Borrowed";
    }

    return "Reserved";
  };

  const getStatusStyle = (
    status: Book["availability_status"]
  ) => {
    if (status === "available") {
      return styles.availableBadge;
    }

    if (status === "borrowed") {
      return styles.borrowedBadge;
    }

    return styles.reservedBadge;
  };

  const getStatusTextStyle = (
    status: Book["availability_status"]
  ) => {
    if (status === "available") {
      return styles.availableText;
    }

    if (status === "borrowed") {
      return styles.borrowedText;
    }

    return styles.reservedText;
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.primary
        }
      />

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <Text
          style={styles.headerTitle}
        >
          Search Results
        </Text>

        <View
          style={styles.headerSpacer}
        />
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <ScrollView
        style={styles.body}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* SEARCH SUMMARY */}

        <View
          style={
            styles.searchSummary
          }
        >
          <Text
            style={
              styles.resultsForText
            }
          >
            Results for
          </Text>

          <Text
            style={
              styles.queryText
            }
          >
            "{query}"
          </Text>

          {!loading && (
            <Text
              style={
                styles.resultCount
              }
            >
              {books.length}{" "}
              {books.length === 1
                ? "book"
                : "books"}{" "}
              found
            </Text>
          )}
        </View>

        {/* LOADING */}

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
              size="large"
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Searching books...
            </Text>
          </View>
        ) : books.length === 0 ? (
          /* EMPTY */

          <View
            style={
              styles.emptyContainer
            }
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="search-outline"
                size={36}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No Books Found
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              We couldn't find books
              matching "{query}".
            </Text>

            <TouchableOpacity
              style={
                styles.searchAgainButton
              }
              onPress={() =>
                navigation.goBack()
              }
            >
              <Text
                style={
                  styles.searchAgainText
                }
              >
                Search Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* BOOK RESULTS */

          <View>
            {books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={
                  styles.bookCard
                }
                onPress={() =>
                  openBookDetails(
                    book.id
                  )
                }
                activeOpacity={0.8}
              >
                {/* COVER */}

                <View
                  style={
                    styles.coverContainer
                  }
                >
                  {book.cover_url ? (
                    <Image
                      source={{
                        uri: book.cover_url,
                      }}
                      style={
                        styles.bookCover
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={
                        styles.coverPlaceholder
                      }
                    >
                      <Ionicons
                        name="book-outline"
                        size={30}
                        color={
                          COLORS.primary
                        }
                      />
                    </View>
                  )}
                </View>

                {/* INFO */}

                <View
                  style={
                    styles.bookInfo
                  }
                >
                  <Text
                    style={
                      styles.bookTitle
                    }
                    numberOfLines={2}
                  >
                    {book.title}
                  </Text>

                  <Text
                    style={
                      styles.bookAuthor
                    }
                    numberOfLines={1}
                  >
                    {book.author}
                  </Text>

                  {book.category && (
                    <Text
                      style={
                        styles.bookCategory
                      }
                      numberOfLines={1}
                    >
                      {book.category}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(
                        book.availability_status
                      ),
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        getStatusTextStyle(
                          book.availability_status
                        ),
                      ]}
                    >
                      {getStatusLabel(
                        book.availability_status
                      )}
                    </Text>
                  </View>
                </View>

                {/* ARROW */}

                <Ionicons
                  name="chevron-forward"
                  size={21}
                  color="#0B67D1"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.primary,
    },

    // HEADER

    header: {
      height: 62,

      paddingHorizontal: 20,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      backgroundColor:
        COLORS.primary,
    },

    backButton: {
      width: 38,
      height: 38,

      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "700",

      color: COLORS.white,
    },

    headerSpacer: {
      width: 38,
    },

    // BODY

    body: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    scrollContent: {
      flexGrow: 1,

      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },

    // SEARCH SUMMARY

    searchSummary: {
      marginBottom: 20,
    },

    resultsForText: {
      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    queryText: {
      marginTop: 3,

      fontSize: 19,
      fontWeight: "700",

      color:
        COLORS.primary,
    },

    resultCount: {
      marginTop: 5,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    // LOADING

    loadingContainer: {
      flex: 1,

      minHeight: 300,

      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 10,

      fontSize: 12,

      color:
        COLORS.textSecondary,
    },

    // BOOK CARD

    bookCard: {
      minHeight: 128,

      flexDirection: "row",
      alignItems: "center",

      backgroundColor:
        COLORS.white,

      borderWidth: 1,
      borderColor:
        "#D9E3F0",

      borderRadius: 12,

      padding: 11,

      marginBottom: 12,
    },

    coverContainer: {
      width: 72,
      height: 96,

      marginRight: 12,
    },

    bookCover: {
      width: "100%",
      height: "100%",

      borderRadius: 7,
    },

    coverPlaceholder: {
      flex: 1,

      borderRadius: 7,

      backgroundColor:
        "#EEF5FC",

      alignItems: "center",
      justifyContent: "center",
    },

    bookInfo: {
      flex: 1,

      justifyContent: "center",

      paddingRight: 7,
    },

    bookTitle: {
      fontSize: 14,
      fontWeight: "700",

      color:
        COLORS.primary,

      lineHeight: 19,
    },

    bookAuthor: {
      marginTop: 5,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    bookCategory: {
      marginTop: 4,

      fontSize: 10,

      color: "#65758A",
    },

    // STATUS

    statusBadge: {
      alignSelf: "flex-start",

      marginTop: 8,

      paddingHorizontal: 9,
      paddingVertical: 4,

      borderRadius: 12,
    },

    statusText: {
      fontSize: 9,
      fontWeight: "700",
    },

    availableBadge: {
      backgroundColor:
        "#E9F8EE",
    },

    availableText: {
      color: "#16803C",
    },

    borrowedBadge: {
      backgroundColor:
        "#FDECEC",
    },

    borrowedText: {
      color:
        COLORS.danger,
    },

    reservedBadge: {
      backgroundColor:
        "#FFF3E4",
    },

    reservedText: {
      color: "#C66A00",
    },

    // EMPTY

    emptyContainer: {
      flex: 1,

      minHeight: 350,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 25,
    },

    emptyIcon: {
      width: 74,
      height: 74,

      borderRadius: 37,

      backgroundColor:
        "#EEF5FC",

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 15,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",

      color:
        COLORS.primary,
    },

    emptyDescription: {
      marginTop: 7,

      textAlign: "center",

      fontSize: 11,

      lineHeight: 17,

      color:
        COLORS.textSecondary,
    },

    searchAgainButton: {
      marginTop: 20,

      minWidth: 130,

      height: 43,

      paddingHorizontal: 18,

      borderRadius: 9,

      backgroundColor:
        COLORS.secondary,

      alignItems: "center",
      justifyContent: "center",
    },

    searchAgainText: {
      fontSize: 12,
      fontWeight: "700",

      color: COLORS.white,
    },
  });