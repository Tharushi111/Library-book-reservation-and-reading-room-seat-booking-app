import React, {
  useCallback,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  COLORS,
} from '../../constants/colors';

import {
  getUserBorrowedBooks,
  BorrowedBookItem,
} from '../../services/activityService';

export default function BorrowedBooks({
  navigation,
}: any) {
  const [
    books,
    setBooks,
  ] = useState<BorrowedBookItem[]>([]);

  const [
    loading,
    setLoading,
  ] = useState<boolean>(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState<boolean>(false);

  // =========================================================
  // LOAD BORROWED BOOKS
  // =========================================================

  const loadBooks = async () => {
    try {
      const data =
        await getUserBorrowedBooks();

      setBooks(data);
    } catch (err) {
      console.warn(
        'Error loading borrowed books:',
        err
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadBooks();
  };

  // =========================================================
  // GROUP BORROWED BOOKS
  // =========================================================

  const dueSoonBooks =
    books.filter(
      (b) =>
        b.dueIn
          .toLowerCase()
          .includes(
            'due in 1'
          ) ||
        b.dueIn
          .toLowerCase()
          .includes(
            'due in 2'
          ) ||
        b.dueIn
          .toLowerCase()
          .includes(
            'due in 3'
          ) ||
        b.dueIn
          .toLowerCase()
          .includes(
            'today'
          ) ||
        b.dueIn
          .toLowerCase()
          .includes(
            'overdue'
          )
    );

  const otherBooks =
    books.filter(
      (b) =>
        !dueSoonBooks.includes(
          b
        )
    );

  // =========================================================
  // BOOK CARD
  // =========================================================

  const BookCard = ({
    item,
    isDueSoon,
  }: {
    item: BorrowedBookItem;
    isDueSoon: boolean;
  }) => (
    <View
      style={[
        styles.card,
        isDueSoon &&
          styles.cardDueSoon,
      ]}
    >
      <Image
        source={{
          uri: item.image,
        }}
        style={
          styles.bookCover
        }
      />

      <View
        style={
          styles.cardContent
        }
      >
        <Text
          style={
            styles.bookTitle
          }
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <Text
          style={[
            styles.dueInText,
            isDueSoon && {
              color:
                COLORS.danger,
            },
          ]}
        >
          {item.dueIn}
        </Text>

        <Text
          style={
            styles.dateText
          }
        >
          Due date: {item.dueDate}
        </Text>
      </View>
    </View>
  );

  // =========================================================
  // UI
  // =========================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      {/* ACTIVITY CATEGORY SWITCHER */}

      <View
        style={
          styles.activityNav
        }
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={
            styles.activityNavBtn
          }
          onPress={() =>
            navigation.navigate(
              'MyBookReservations'
            )
          }
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={
              styles.activityNavText
            }
          >
            Book Reservations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={
            styles.activityNavBtn
          }
          onPress={() =>
            navigation.navigate(
              'MyStudyRoomBookings'
            )
          }
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={
              styles.activityNavText
            }
          >
            Room Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.activityNavBtn,
            styles.activityNavBtnActive,
          ]}
          onPress={() =>
            navigation.navigate(
              'BorrowedBooks'
            )
          }
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[
              styles.activityNavText,
              styles.activityNavTextActive,
            ]}
          >
            Borrowed Books
          </Text>
        </TouchableOpacity>
      </View>

      {/* HEADER */}

      <View
        style={
          styles.header
        }
      >
        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
          style={
            styles.backBtn
          }
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={
              COLORS.primary
            }
          />
        </TouchableOpacity>

        <Text
          style={
            styles.headerTitle
          }
        >
          Borrowed Books
        </Text>

        <TouchableOpacity
          onPress={
            onRefresh
          }
          style={
            styles.refreshBtn
          }
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={
              COLORS.primary
            }
          />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}

      {loading ? (
        <View
          style={
            styles.centered
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
            Loading borrowed
            books...
          </Text>
        </View>
      ) : books.length ===
        0 ? (
        <View
          style={
            styles.emptyContainer
          }
        >
          <Ionicons
            name="book-outline"
            size={48}
            color={
              COLORS.border
            }
          />

          <Text
            style={
              styles.emptyTitle
            }
          >
            No borrowed books
          </Text>

          <Text
            style={
              styles.emptySubtitle
            }
          >
            You currently do not
            have any borrowed
            library books.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
              }
              colors={[
                COLORS.primary,
              ]}
              tintColor={
                COLORS.primary
              }
            />
          }
        >
          {dueSoonBooks.length >
            0 && (
            <>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Due Soon
              </Text>

              {dueSoonBooks.map(
                (book) => (
                  <BookCard
                    key={
                      book.id
                    }
                    item={
                      book
                    }
                    isDueSoon={
                      true
                    }
                  />
                )
              )}
            </>
          )}

          {otherBooks.length >
            0 && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    marginTop:
                      dueSoonBooks.length >
                      0
                        ? 10
                        : 0,
                  },
                ]}
              >
                Other Borrowed Books
              </Text>

              {otherBooks.map(
                (book) => (
                  <BookCard
                    key={
                      book.id
                    }
                    item={
                      book
                    }
                    isDueSoon={
                      false
                    }
                  />
                )
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    // -------------------------------------------------------
    // ACTIVITY NAVIGATION
    // -------------------------------------------------------

    activityNav: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginHorizontal:
        16,

      marginTop:
        12,

      marginBottom:
        8,

      padding:
        4,

      backgroundColor:
        '#F3F6FA',

      borderRadius:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },

    activityNavBtn: {
      flex: 1,

      minHeight:
        42,

      paddingVertical:
        8,

      paddingHorizontal:
        3,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'transparent',
    },

    activityNavBtnActive: {
      backgroundColor:
        COLORS.primary,

      shadowColor:
        COLORS.black,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.12,

      shadowRadius:
        3,

      elevation:
        2,
    },

    activityNavText: {
      width:
        '100%',

      fontSize:
        11,

      lineHeight:
        15,

      fontWeight:
        '600',

      color:
        COLORS.textSecondary,

      textAlign:
        'center',
    },

    activityNavTextActive: {
      color:
        COLORS.white,

      fontWeight:
        '700',
    },

    // -------------------------------------------------------
    // HEADER
    // -------------------------------------------------------

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal:
        20,

      paddingTop:
        10,

      paddingBottom:
        15,
    },

    backBtn: {
      padding:
        5,
    },

    refreshBtn: {
      padding:
        5,
    },

    headerTitle: {
      fontSize:
        18,

      fontWeight:
        '700',

      color:
        COLORS.primary,
    },

    // -------------------------------------------------------
    // BORROWED BOOK LIST
    // -------------------------------------------------------

    scrollContent: {
      paddingHorizontal:
        20,

      paddingBottom:
        20,
    },

    sectionTitle: {
      fontSize:
        16,

      fontWeight:
        '700',

      color:
        COLORS.primary,

      marginBottom:
        15,
    },

    card: {
      flexDirection:
        'row',

      backgroundColor:
        COLORS.white,

      borderRadius:
        16,

      padding:
        15,

      marginBottom:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      shadowColor:
        COLORS.black,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.05,

      shadowRadius:
        5,

      elevation:
        2,

      alignItems:
        'center',
    },

    cardDueSoon: {
      backgroundColor:
        '#FEF2F2',

      borderColor:
        '#FCCACA',
    },

    bookCover: {
      width:
        60,

      height:
        80,

      borderRadius:
        8,

      marginRight:
        15,

      backgroundColor:
        COLORS.surface,
    },

    cardContent: {
      flex:
        1,

      justifyContent:
        'center',
    },

    bookTitle: {
      fontSize:
        16,

      fontWeight:
        '700',

      color:
        COLORS.primary,

      marginBottom:
        4,
    },

    dueInText: {
      fontSize:
        13,

      fontWeight:
        '600',

      color:
        COLORS.textSecondary,

      marginBottom:
        4,
    },

    dateText: {
      fontSize:
        12,

      color:
        COLORS.textSecondary,
    },

    // -------------------------------------------------------
    // LOADING / EMPTY
    // -------------------------------------------------------

    centered: {
      flex:
        1,

      justifyContent:
        'center',

      alignItems:
        'center',

      paddingTop:
        60,
    },

    loadingText: {
      marginTop:
        12,

      fontSize:
        14,

      color:
        COLORS.textSecondary,
    },

    emptyContainer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },

    emptyTitle: {
      fontSize:
        16,

      fontWeight:
        '700',

      color:
        COLORS.primary,

      marginTop:
        12,
    },

    emptySubtitle: {
      fontSize:
        13,

      color:
        COLORS.textSecondary,

      textAlign:
        'center',

      marginTop:
        6,

      paddingHorizontal:
        20,
    },
  });