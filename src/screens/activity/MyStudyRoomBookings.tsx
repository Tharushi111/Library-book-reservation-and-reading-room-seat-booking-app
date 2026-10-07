import React, {
  useCallback,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
  getUserRoomBookings,
  cancelRoomBooking,
  RoomBookingItem,
} from '../../services/activityService';

export default function MyStudyRoomBookings({
  navigation,
}: any) {
  const [
    bookings,
    setBookings,
  ] = useState<RoomBookingItem[]>([]);

  const [
    loading,
    setLoading,
  ] = useState<boolean>(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState<boolean>(false);

  // =========================================================
  // LOAD BOOKINGS
  // =========================================================

  const loadBookings = async () => {
    try {
      const data =
        await getUserRoomBookings();

      setBookings(data);
    } catch (err) {
      console.warn(
        'Error loading bookings:',
        err
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // =========================================================
  // CANCEL BOOKING
  // =========================================================

  const handleCancelBooking = (
    booking: RoomBookingItem
  ) => {
    if (
      booking.status ===
      'Cancelled'
    ) {
      Alert.alert(
        'Booking Notice',
        'This booking has already been cancelled.'
      );

      return;
    }

    Alert.alert(
      'Cancel Room Booking',
      `Are you sure you want to cancel your booking for ${booking.room}?`,
      [
        {
          text:
            'No, Keep It',
          style:
            'cancel',
        },
        {
          text:
            'Yes, Cancel',
          style:
            'destructive',

          onPress:
            async () => {
              const res =
                await cancelRoomBooking(
                  booking.id
                );

              if (
                res.success
              ) {
                setBookings(
                  (prev) =>
                    prev.map(
                      (b) =>
                        b.id ===
                        booking.id
                          ? {
                              ...b,
                              status:
                                'Cancelled',
                            }
                          : b
                    )
                );

                Alert.alert(
                  'Booking Cancelled',
                  'Your room booking was cancelled.'
                );
              } else {
                Alert.alert(
                  'Error',
                  res.message
                );
              }
            },
        },
      ]
    );
  };

  // =========================================================
  // BOOKING CARD
  // =========================================================

  const renderItem = ({
    item,
  }: {
    item: RoomBookingItem;
  }) => {
    const isCancelled =
      item.status ===
      'Cancelled';

    return (
      <TouchableOpacity
        style={
          styles.card
        }
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate(
            'ActivityBookingDetails',
            {
              bookingId:
                item.id,
            }
          )
        }
      >
        <Image
          source={{
            uri: item.image,
          }}
          style={
            styles.roomImage
          }
        />

        <View
          style={
            styles.cardContent
          }
        >
          <Text
            style={
              styles.roomTitle
            }
          >
            {item.room}
          </Text>

          <View
            style={
              styles.infoRow
            }
          >
            <Ionicons
              name="business-outline"
              size={14}
              color={
                COLORS.textSecondary
              }
            />

            <Text
              style={
                styles.infoText
              }
            >
              {item.floor}
            </Text>
          </View>

          <View
            style={
              styles.infoRow
            }
          >
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={
                COLORS.textSecondary
              }
            />

            <Text
              style={
                styles.infoText
              }
            >
              {item.seat}
            </Text>
          </View>

          <View
            style={
              styles.infoRow
            }
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={
                COLORS.textSecondary
              }
            />

            <Text
              style={
                styles.infoText
              }
            >
              Date: {item.date}
            </Text>
          </View>

          <View
            style={
              styles.infoRow
            }
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={
                COLORS.textSecondary
              }
            />

            <Text
              style={
                styles.infoText
              }
            >
              Time: {item.time}
            </Text>
          </View>

          <View
            style={
              styles.bottomRow
            }
          >
            <View
              style={[
                styles.statusBadge,
                isCancelled && {
                  backgroundColor:
                    '#FEE2E2',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isCancelled && {
                    color:
                      COLORS.danger,
                  },
                ]}
              >
                {item.status}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                handleCancelBooking(
                  item
                )
              }
            >
              <Text
                style={[
                  styles.cancelBtnText,
                  isCancelled && {
                    color:
                      COLORS.textSecondary,
                  },
                ]}
              >
                {isCancelled
                  ? 'Cancelled'
                  : 'Cancel Booking'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          style={[
            styles.activityNavBtn,
            styles.activityNavBtnActive,
          ]}
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
            style={[
              styles.activityNavText,
              styles.activityNavTextActive,
            ]}
          >
            Room Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={
            styles.activityNavBtn
          }
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
            style={
              styles.activityNavText
            }
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
          My Study Room Bookings
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

      <Text
        style={
          styles.sectionTitle
        }
      >
        Bookings
      </Text>

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
            Loading bookings...
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            bookings
          }
          keyExtractor={(
            item
          ) => item.id}
          renderItem={
            renderItem
          }
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={
            false
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
          ListEmptyComponent={
            <View
              style={
                styles.emptyContainer
              }
            >
              <Ionicons
                name="easel-outline"
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
                No study room
                bookings
              </Text>

              <Text
                style={
                  styles.emptySubtitle
                }
              >
                You do not have any
                room bookings
                scheduled.
              </Text>
            </View>
          }
        />
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

    sectionTitle: {
      fontSize:
        16,

      fontWeight:
        '700',

      color:
        COLORS.primary,

      marginHorizontal:
        20,

      marginBottom:
        15,
    },

    // -------------------------------------------------------
    // BOOKING LIST
    // -------------------------------------------------------

    listContent: {
      paddingHorizontal:
        20,

      paddingBottom:
        20,
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
    },

    roomImage: {
      width:
        80,

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
    },

    roomTitle: {
      fontSize:
        16,

      fontWeight:
        '700',

      color:
        COLORS.primary,

      marginBottom:
        8,
    },

    infoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        4,
    },

    infoText: {
      fontSize:
        12,

      color:
        COLORS.textSecondary,

      marginLeft:
        6,
    },

    bottomRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      marginTop:
        8,
    },

    statusBadge: {
      backgroundColor:
        '#E6F4EA',

      paddingHorizontal:
        8,

      paddingVertical:
        4,

      borderRadius:
        12,
    },

    statusText: {
      color:
        COLORS.success,

      fontSize:
        10,

      fontWeight:
        '700',
    },

    cancelBtnText: {
      color:
        COLORS.danger,

      fontSize:
        12,

      fontWeight:
        '600',
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
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        60,
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

      textAlign:
        'center',
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