import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getUserReservations, ReservationItem } from '../../services/activityService';

export default function MyBookReservations({ navigation }: any) {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'Active' | 'Past'>('Active');

  const loadReservations = async () => {
    try {
      const data = await getUserReservations();
      setReservations(data);
    } catch (err) {
      console.warn('Error loading reservations:', err);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  const activeReservations = reservations.filter(
    (item) => item.status === 'Reserved' || item.status === 'Ready for Collection'
  );

  const pastReservations = reservations.filter(
    (item) => item.status === 'Collected' || item.status === 'Cancelled' || item.status === 'Expired' || item.status === 'Returned'
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
        return '#E6F4EA'; // light green
      case 'Ready for Collection':
        return '#FEF3C7'; // light yellow
      case 'Cancelled':
      case 'Expired':
        return '#FEE2E2'; // light red
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
        <Text style={styles.bookId}>Book ID: {item.bookId}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.dateText}>
            {item.dateLabel}: {item.date}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.detailsBtn}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Activity Category Switcher for testing all Member 4 screens */}
      <View style={styles.activityNav}>
        <TouchableOpacity
          style={[styles.activityNavBtn, styles.activityNavBtnActive]}
          onPress={() => navigation.navigate('MyBookReservations')}
        >
          <Text style={[styles.activityNavText, styles.activityNavTextActive]}>Book Reservations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.activityNavBtn}
          onPress={() => navigation.navigate('MyStudyRoomBookings')}
        >
          <Text style={styles.activityNavText}>Room Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.activityNavBtn}
          onPress={() => navigation.navigate('BorrowedBooks')}
        >
          <Text style={styles.activityNavText}>Borrowed Books</Text>
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Active' && styles.activeTabBtn]}
          onPress={() => setActiveTab('Active')}
        >
          <Text style={[styles.tabText, activeTab === 'Active' && styles.activeTabText]}>
            Active ({activeReservations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Past' && styles.activeTabBtn]}
          onPress={() => setActiveTab('Past')}
        >
          <Text style={[styles.tabText, activeTab === 'Past' && styles.activeTabText]}>
            Past ({pastReservations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading reservations...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} reservations</Text>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  activityNavBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityNavBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  activityNavText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activityNavTextActive: {
    color: COLORS.white,
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  bookId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 6,
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
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  detailsBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
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
