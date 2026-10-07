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
  getUserReservations,
  ReservationItem,
} from '../../services/activityService';

export default function MyBookReservations({
  navigation,
}: any) {
  const [
    reservations,
    setReservations,
  ] = useState<ReservationItem[]>([]);

  const [
    loading,
    setLoading,
  ] = useState<boolean>(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState<boolean>(false);

  const [
    activeTab,
    setActiveTab,
  ] = useState<'Active' | 'Past'>('Active');

  // =========================================================
  // LOAD RESERVATIONS
  // =========================================================

  const loadReservations = async () => {
    try {
      const data =
        await getUserReservations();

      setReservations(data);
    } catch (err) {
      console.warn(
        'Error loading reservations:',
        err
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [])
  );

  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  // =========================================================
  // FILTER RESERVATIONS
  // =========================================================

  const activeReservations =
    reservations.filter(
      (item) =>
        item.status === 'Reserved' ||
        item.status ===
          'Ready for Collection'
    );

  const pastReservations =
    reservations.filter(
      (item) =>
        item.status === 'Collected' ||
        item.status === 'Cancelled' ||
        item.status === 'Expired' ||
        item.status === 'Returned'
    );

  const data =
    activeTab === 'Active'
      ? activeReservations
      : pastReservations;

  // =========================================================
  // STATUS COLORS
  // =========================================================

  const getStatusColor = (
    status: string
  ) => {
    switch (status) {
      case 'Reserved':
      case 'Collected':
      case 'Returned':
        return COLORS.success;

      case 'Ready for Collection':
        return COLORS.warning;

      case 'Cancelled':
      case 'Expired':
        return COLORS.danger;

      default:
        return COLORS.primary;
    }
  };

  const getStatusBgColor = (
    status: string
  ) => {
    switch (status) {
      case 'Reserved':
      case 'Collected':
      case 'Returned':
        return '#E6F4EA';

      case 'Ready for Collection':
        return '#FEF3C7';

      case 'Cancelled':
      case 'Expired':
        return '#FEE2E2';

      default:
        return '#E0E7FF';
    }
  };

  // =========================================================
  // RESERVATION CARD
  // =========================================================

  const renderItem = ({
    item,
  }: {
    item: ReservationItem;
  }) => (
    <View style={styles.card}>
      <Image
        source={{
          uri: item.image,
        }}
        style={styles.bookCover}
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
          style={
            styles.bookId
          }
        >
          Book ID: {item.bookId}
        </Text>

        <View
          style={
            styles.statusRow
          }
        >
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  getStatusBgColor(
                    item.status
                  ),
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    getStatusColor(
                      item.status
                    ),
                },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.dateRow
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
              styles.dateText
            }
          >
            {item.dateLabel}:{' '}
            {item.date}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={
          styles.detailsBtn
        }
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate(
            'ReservationDetails',
            {
              reservationId:
                item.id,
              reservation:
                item,
            }
          )
        }
      >
        <Text
          style={
            styles.detailsBtnText
          }
        >
          View Details
        </Text>
      </TouchableOpacity>
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
          style={[
            styles.activityNavBtn,
            styles.activityNavBtnActive,
          ]}
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
            style={[
              styles.activityNavText,
              styles.activityNavTextActive,
            ]}
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
          My Book Reservations
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

      {/* ACTIVE / PAST TABS */}

      <View
        style={
          styles.tabContainer
        }
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.tabBtn,
            activeTab ===
              'Active' &&
              styles.activeTabBtn,
          ]}
          onPress={() =>
            setActiveTab(
              'Active'
            )
          }
        >
          <Text
            style={[
              styles.tabText,
              activeTab ===
                'Active' &&
                styles.activeTabText,
            ]}
          >
            Active (
            {
              activeReservations.length
            }
            )
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.tabBtn,
            activeTab ===
              'Past' &&
              styles.activeTabBtn,
          ]}
          onPress={() =>
            setActiveTab(
              'Past'
            )
          }
        >
          <Text
            style={[
              styles.tabText,
              activeTab ===
                'Past' &&
                styles.activeTabText,
            ]}
          >
            Past (
            {
              pastReservations.length
            }
            )
          </Text>
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
            Loading reservations...
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
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
                name="bookmark-outline"
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
                No{' '}
                {activeTab.toLowerCase()}{' '}
                reservations
              </Text>

              <Text
                style={
                  styles.emptySubtitle
                }
              >
                {activeTab ===
                'Active'
                  ? 'You do not have any active book reservations.'
                  : 'Your past reservation history will appear here.'}
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

    // -------------------------------------------------------
    // ACTIVE / PAST
    // -------------------------------------------------------

    tabContainer: {
      flexDirection:
        'row',

      marginHorizontal:
        20,

      backgroundColor:
        COLORS.surface,

      borderRadius:
        25,

      padding:
        4,

      marginBottom:
        20,
    },

    tabBtn: {
      flex:
        1,

      paddingVertical:
        10,

      borderRadius:
        20,

      alignItems:
        'center',
    },

    activeTabBtn: {
      backgroundColor:
        COLORS.secondary,
    },

    tabText: {
      fontSize:
        14,

      fontWeight:
        '600',

      color:
        COLORS.primary,
    },

    activeTabText: {
      color:
        COLORS.white,
    },

    // -------------------------------------------------------
    // RESERVATION LIST
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

      alignItems:
        'center',
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

    bookId: {
      fontSize:
        12,

      color:
        COLORS.textSecondary,

      marginBottom:
        6,
    },

    statusRow: {
      flexDirection:
        'row',

      marginBottom:
        6,
    },

    statusBadge: {
      paddingHorizontal:
        8,

      paddingVertical:
        3,

      borderRadius:
        12,
    },

    statusText: {
      fontSize:
        10,

      fontWeight:
        '700',
    },

    dateRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    dateText: {
      fontSize:
        12,

      color:
        COLORS.textSecondary,

      marginLeft:
        4,
    },

    detailsBtn: {
      paddingVertical:
        8,

      paddingHorizontal:
        12,

      borderRadius:
        8,
    },

    detailsBtnText: {
      color:
        COLORS.primary,

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