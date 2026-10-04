import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type {
  Book,
} from "../../types";

import {
  getCatalogue,
  subscribeToBookAvailability,
} from "../../services/bookService";

const CATEGORIES = [
  "All",
  "Data Science",
  "Database",
  "Journals",
];

const THEME = {
  background:
    "#FFFFFF",

  title:
    "#1B3F94",

  accent:
    "#F07A2B",

  chip:
    "#D9D9D9",

  chipText:
    "#1A1A1A",

  text:
    "#111111",

  textSecondary:
    "#444444",

  border:
    "#111111",

  availableBg:
    "#92E67C",

  availableText:
    "#1E5A12",

  borrowedBg:
    "#F9B9B9",

  borrowedText:
    "#B42318",
};

export default function BookCatalogueScreen() {
  const navigation =
    useNavigation<any>();

  const insets =
    useSafeAreaInsets();

  const [
    books,
    setBooks,
  ] =
    useState<Book[]>([]);

  const [
    category,
    setCategory,
  ] =
    useState("All");

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /* LOAD BOOKS                                         */
  const loadBooks =
    useCallback(
      async (
        selectedCategory:
          string,
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
            await getCatalogue(
              selectedCategory
            );

          setBooks(
            data
          );
        } catch (
          error
        ) {
          console.error(
            "Failed to load catalogue:",
            error
          );

          setBooks(
            []
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
      []
    );

  /* LOAD WHEN CATEGORY CHANGES                         */
  useEffect(
    () => {
      loadBooks(
        category
      );
    },
    [
      category,
      loadBooks,
    ]
  );

  /* REFRESH WHEN SCREEN GETS FOCUS                     */
  useFocusEffect(
    useCallback(
      () => {
        loadBooks(
          category,
          false
        );
      },
      [
        category,
        loadBooks,
      ]
    )
  );

  /* REALTIME BOOK AVAILABILITY                         */
  /*
   * If another user reserves or cancels a book,
   * Supabase sends an UPDATE event from the books table.
   *
   * Then we refresh the catalogue.
   *
   * Example:
   *
   * User 1 reserves book
   *      |
   * books.availability_status = borrowed
   *      |
   * User 2 receives realtime event
   *      |
   * Catalogue refreshes
   *      |
   * User 2 sees "Borrowed"
   */

  useEffect(
    () => {
      const unsubscribe =
        subscribeToBookAvailability(
          () => {
            loadBooks(
              category,
              false
            );
          }
        );

      return () => {
        unsubscribe();
      };
    },
    [
      category,
      loadBooks,
    ]
  );

  /* SEARCH                                             */
  const submitSearch =
    () => {
      const value =
        query.trim();

      if (!value) {
        return;
      }

      navigation.navigate(
        "SearchResults",
        {
          query:
            value,
        }
      );
    };

  /* RENDER BOOK                                        */
  const renderBook = ({
    item,
  }: {
    item: Book;
  }) => {
    const isAvailable =
      item.availabilityStatus ===
      "available";

    return (
      <TouchableOpacity
        style={
          styles.card
        }
        activeOpacity={
          0.8
        }
        onPress={() =>
          navigation.navigate(
            "BookDetails",
            {
              bookId:
                item.id,
            }
          )
        }
      >
        {item.coverUrl ? (
          <Image
            source={{
              uri:
                item.coverUrl,
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

        <Text
          style={
            styles.cardTitle
          }
          numberOfLines={
            2
          }
        >
          {item.title}
        </Text>

        <Text
          style={
            styles.cardAuthor
          }
          numberOfLines={
            1
          }
        >
          {item.author}
        </Text>

        <Text
          style={
            styles.cardCategory
          }
          numberOfLines={
            1
          }
        >
          {
            item.category
          }
        </Text>

        <View
          style={[
            styles.statusBadge,

            {
              backgroundColor:
                isAvailable
                  ? THEME.availableBg
                  : THEME.borrowedBg,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,

              {
                color:
                  isAvailable
                    ? THEME.availableText
                    : THEME.borrowedText,
              },
            ]}
          >
            {isAvailable
              ? "Available"
              : "Borrowed"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* UI                                                 */
  return (
    <View
      style={
        styles.screen
      }
    >
      {/* HEADER                                          */}
      <View
        style={[
          styles.header,

          {
            paddingTop:
              insets.top +
              24,
          },
        ]}
      >
        {/* Title */}

        <Text
          style={
            styles.title
          }
        >
          Catalogue
        </Text>

        {/* Search */}

        <View
          style={
            styles.searchBar
          }
        >
          <View
            style={
              styles.searchIcon
            }
          >
            <View
              style={
                styles.searchIconCircle
              }
            />

            <View
              style={
                styles.searchIconHandle
              }
            />
          </View>

          <TextInput
            style={
              styles.searchInput
            }
            placeholder="Search by title, author..."
            placeholderTextColor={
              THEME.textSecondary
            }
            value={
              query
            }
            onChangeText={
              setQuery
            }
            onSubmitEditing={
              submitSearch
            }
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>

        {/* Categories */}

        <FlatList
          horizontal
          data={
            CATEGORIES
          }
          keyExtractor={(
            item
          ) =>
            item
          }
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.categoryList
          }
          renderItem={({
            item,
          }) => {
            const isActive =
              category ===
              item;

            return (
              <TouchableOpacity
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  setCategory(
                    item
                  )
                }
                style={[
                  styles.chip,

                  isActive &&
                    styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,

                    isActive &&
                      styles.chipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* LOADING                                         */}
      {loading ? (
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={
              THEME.accent
            }
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading books...
          </Text>
        </View>
      ) : books.length ===
        0 ? (
        /* EMPTY                                         */
        <View
          style={
            styles.emptyContainer
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            No books found
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            There are no books in
            this category.
          </Text>
        </View>
      ) : (
        /* BOOK LIST                                     */
        <FlatList
          data={
            books
          }
          keyExtractor={(
            item
          ) =>
            item.id
          }
          numColumns={
            2
          }
          renderItem={
            renderBook
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.bookList
          }
          columnWrapperStyle={
            styles.columnWrapper
          }
        />
      )}
    </View>
  );
}

/* STYLES                                             */
const styles =
  StyleSheet.create({
    screen: {
      flex: 1,

      backgroundColor:
        THEME.background,
    },

    /* HEADER                                             */
    header: {
      paddingHorizontal:
        20,

      paddingBottom:
        8,
    },

    title: {
      fontSize:
        26,

      fontWeight:
        "800",

      color:
        THEME.title,

      marginBottom:
        20,

      marginLeft:
        12,
    },

    /* SEARCH                                             */
    searchBar: {
      height:
        52,

      flexDirection:
        "row",

      alignItems:
        "center",

      borderRadius:
        26,

      borderWidth:
        1.5,

      borderColor:
        THEME.border,

      paddingHorizontal:
        18,
    },

    searchIcon: {
      width:
        24,

      height:
        24,

      marginRight:
        14,
    },

    searchIconCircle: {
      position:
        "absolute",

      top:
        1,

      left:
        1,

      width:
        16,

      height:
        16,

      borderRadius:
        8,

      borderWidth:
        3,

      borderColor:
        THEME.text,
    },

    searchIconHandle: {
      position:
        "absolute",

      top:
        16,

      left:
        14,

      width:
        9,

      height:
        3,

      borderRadius:
        2,

      backgroundColor:
        THEME.text,

      transform: [
        {
          rotate:
            "45deg",
        },
      ],
    },

    searchInput: {
      flex:
        1,

      fontSize:
        15,

      color:
        THEME.text,
    },

    /* CATEGORY                                           */
    categoryList: {
      gap:
        10,

      marginTop:
        20,

      paddingBottom:
        2,
    },

    chip: {
      borderRadius:
        20,

      paddingVertical:
        8,

      paddingHorizontal:
        20,

      backgroundColor:
        THEME.chip,
    },

    chipActive: {
      backgroundColor:
        THEME.accent,
    },

    chipText: {
      fontSize:
        14,

      fontWeight:
        "700",

      color:
        THEME.chipText,
    },

    chipTextActive: {
      color:
        "#FFFFFF",
    },

    /* LOADING                                            */
    loadingContainer: {
      flex:
        1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    loadingText: {
      marginTop:
        10,

      fontSize:
        13,

      color:
        THEME.textSecondary,
    },

    /* EMPTY                                              */
    emptyContainer: {
      flex:
        1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        30,
    },

    emptyTitle: {
      fontSize:
        18,

      fontWeight:
        "700",

      color:
        THEME.text,

      marginBottom:
        6,
    },

    emptyText: {
      fontSize:
        13,

      color:
        THEME.textSecondary,

      textAlign:
        "center",
    },

    /* BOOK LIST                                          */
    bookList: {
      paddingHorizontal:
        20,

      paddingTop:
        22,

      paddingBottom:
        30,
    },

    columnWrapper: {
      gap:
        16,
    },

    card: {
      flex:
        1,

      marginBottom:
        26,

      paddingHorizontal:
        8,

      alignItems:
        "flex-start",
    },

    cover: {
      width:
        120,

      height:
        140,

      borderRadius:
        10,

      backgroundColor:
        "#E8E8E8",

      marginBottom:
        12,
    },

    coverPlaceholder: {
      width:
        120,

      height:
        140,

      borderRadius:
        10,

      backgroundColor:
        "#E8E8E8",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom:
        12,
    },

    coverPlaceholderText: {
      fontSize:
        12,

      color:
        THEME.textSecondary,
    },

    cardTitle: {
      fontSize:
        16,

      fontWeight:
        "800",

      color:
        THEME.text,
    },

    cardAuthor: {
      fontSize:
        12,

      color:
        THEME.textSecondary,

      marginTop:
        4,
    },

    cardCategory: {
      fontSize:
        11,

      color:
        THEME.textSecondary,

      marginTop:
        2,
    },

    /* STATUS                                             */
    statusBadge: {
      marginTop:
        8,

      paddingVertical:
        3,

      paddingHorizontal:
        11,

      borderRadius:
        12,
    },

    statusText: {
      fontSize:
        10,

      fontWeight:
        "600",
    },
  });