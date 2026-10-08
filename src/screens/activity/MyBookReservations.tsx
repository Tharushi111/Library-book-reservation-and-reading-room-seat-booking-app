import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
  getUserReservations,
  getUserWaitingList,
  leaveUserWaitingList,
  subscribeToMyWaitingList,
  ReservationItem,
  WaitingListItem,
} from '../../services/activityService';

export default function MyBookReservations({ navigation }: any) {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Active' | 'Waiting List' | 'Past'>('Active');

  const loadActivity = useCallback(async () => {
    // Load independently so a queue error cannot hide existing reservations.
    const [reservationResult, waitingResult] = await Promise.allSettled([
      getUserReservations(),
      getUserWaitingList(),
    ]);

    if (reservationResult.status === 'fulfilled') {
      setReservations(reservationResult.value);
    } else {
      console.warn('Error loading reservations:', reservationResult.reason);
    }

    if (waitingResult.status === 'fulfilled') {
      setWaitingList(waitingResult.value);
    } else {
      console.warn('Error loading waiting list:', waitingResult.reason);
      Alert.alert('Waiting List', 'Unable to load your waiting list. Please try refreshing.');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let focused = true;
      let unsubscribe: (() => void) | undefined;

      void loadActivity();
      void subscribeToMyWaitingList(() => {
        if (focused) void loadActivity();
      })
        .then((cleanup) => {
          if (focused) unsubscribe = cleanup;
          else cleanup();
        })
        .catch((error) => console.warn('Waiting list realtime unavailable:', error));

      return () => {
        focused = false;
        unsubscribe?.();
      };
    }, [loadActivity])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadActivity();
  };

  const confirmLeaveQueue = (item: WaitingListItem) => {
    Alert.alert(
      'Leave Waiting List?',
      `Are you sure you want to leave the queue for "${item.title}"? You will lose your current position.`,
      [
        { text: 'Keep My Place', style: 'cancel' },
        {
          text: 'Leave Queue',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setLeavingId(item.id);
                await leaveUserWaitingList(item.id);
                setWaitingList((current) => current.filter((entry) => entry.id !== item.id));
                await loadActivity();
              } catch (error: any) {
                Alert.alert('Unable to Leave Queue', error?.message || 'Please try again.');
              } finally {
                setLeavingId(null);
              }
            })();
          },
        },
      ]
    );
  };

  const activeReservations = reservations.filter(
    (item) =>
      item.status === 'Reserved' ||
      item.status === 'Ready for Collection'
  );

  const pastReservations = reservations.filter(
    (item) =>
      item.status === 'Collected' ||
      item.status === 'Cancelled' ||
      item.status === 'Expired' ||
      item.status === 'Returned'
  );

  const data = activeTab === 'Active' ? activeReservations : pastReservations;

  const getStatusColor = (status: string) => {
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

  const getStatusBgColor = (status: string) => {
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

  const renderItem = ({ item }: { item: ReservationItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.bookCover} />

      <View style={styles.cardContent}>
        <Text style={styles.bookTitle} numberOfLines={1}>
          {item.title}
        </Text>

        {/* Book UUID intentionally not displayed in the UI. */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusBgColor(item.status) },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={COLORS.textSecondary}
          />
          <Text style={styles.dateText}>
            {item.dateLabel}: {item.date}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.detailsBtn}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('ReservationDetails', {
            reservationId: item.id,
            reservation: item,
          })
        }
      >
        <Text style={styles.detailsBtnText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWaitingItem = ({ item }: { item: WaitingListItem }) => {
    const ahead = item.queuePosition === null ? null : Math.max(0, item.queuePosition - 1);
    const leaving = leavingId === item.id;

    return (
      <View style={styles.waitingCard}>
        <View style={styles.waitingCardTop}>
          <Image source={{ uri: item.image }} style={styles.waitingBookCover} />
          <View style={styles.waitingBookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.waitingBadge}>
              <Text style={styles.waitingBadgeText}>
                {item.status === 'notified' ? 'Notified' : 'Waiting'}
              </Text>
            </View>
            <Text style={styles.queuePosition}>
              {item.queuePosition === null
                ? 'Queue position updating...'
                : `Queue Position #${item.queuePosition}`}
            </Text>
            <Text style={styles.queueAhead}>
              {ahead === null
                ? 'Pull down to refresh your position.'
                : ahead === 0
                  ? 'You are first in line'
                  : `${ahead} student${ahead === 1 ? '' : 's'} ahead of you`}
            </Text>
          </View>
        </View>
        <View style={styles.queueFooter}>
          <Text style={styles.queueJoined}>Joined: {item.joinedDate}</Text>
          <TouchableOpacity
            style={[styles.leaveQueueBtn, leaving && styles.leaveQueueBtnDisabled]}
            activeOpacity={0.75}
            disabled={leaving}
            onPress={() => confirmLeaveQueue(item)}
            accessibilityRole="button"
            accessibilityLabel={`Leave queue for ${item.title}`}
          >
            {leaving ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <Ionicons name="exit-outline" size={16} color={COLORS.danger} />
            )}
            <Text style={styles.leaveQueueText}>
              {leaving ? 'Leaving...' : 'Leave Queue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[COLORS.primary]}
      tintColor={COLORS.primary}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.activityNav}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.activityNavBtn, styles.activityNavBtnActive]}
          onPress={() => navigation.navigate('MyBookReservations')}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[styles.activityNavText, styles.activityNavTextActive]}
          >
            Book Reservations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.activityNavBtn}
          onPress={() => navigation.navigate('MyStudyRoomBookings')}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={styles.activityNavText}
          >
            Room Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.activityNavBtn}
          onPress={() => navigation.navigate('BorrowedBooks')}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={styles.activityNavText}
          >
            Borrowed Books
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Book Reservations</Text>

        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.tabBtn,
            activeTab === 'Active' && styles.activeTabBtn,
          ]}
          onPress={() => setActiveTab('Active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Active' && styles.activeTabText,
            ]}
          >
            Active ({activeReservations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.tabBtn,
            activeTab === 'Waiting List' && styles.activeTabBtn,
          ]}
          onPress={() => setActiveTab('Waiting List')}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={[
              styles.tabText,
              activeTab === 'Waiting List' && styles.activeTabText,
            ]}
          >
            Waiting List ({waitingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.tabBtn,
            activeTab === 'Past' && styles.activeTabBtn,
          ]}
          onPress={() => setActiveTab('Past')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Past' && styles.activeTabText,
            ]}
          >
            Past ({pastReservations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      ) : activeTab === 'Waiting List' ? (
        <FlatList
          data={waitingList}
          keyExtractor={(item) => item.id}
          renderItem={renderWaitingItem}
          contentContainerStyle={[
            styles.listContent,
            waitingList.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Your waiting list is empty</Text>
              <Text style={styles.emptySubtitle}>
                Join the queue for an unavailable book to track your position here.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            data.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>
                No {activeTab.toLowerCase()} reservations
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'Active'
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  activityNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 4,
    backgroundColor: '#F3F6FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityNavBtn: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 8,
    paddingHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activityNavBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  activityNavText: {
    width: '100%',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  activityNavTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backBtn: {
    padding: 5,
  },
  refreshBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTabBtn: {
    backgroundColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
  activeTabText: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: COLORS.surface,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  detailsBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginLeft: 6,
  },
  detailsBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  waitingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  waitingCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  waitingBookCover: {
    width: 66,
    height: 90,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: COLORS.surface,
  },
  waitingBookInfo: {
    flex: 1,
    minWidth: 0,
  },
  waitingBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  waitingBadgeText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
  },
  queuePosition: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  queueAhead: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  queueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  queueJoined: {
    color: COLORS.textSecondary,
    fontSize: 11,
    flexShrink: 1,
  },
  leaveQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  leaveQueueBtnDisabled: {
    opacity: 0.6,
  },
  leaveQueueText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
});
