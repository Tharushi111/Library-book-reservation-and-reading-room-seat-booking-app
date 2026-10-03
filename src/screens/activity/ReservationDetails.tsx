import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
  getReservationDetails,
  cancelReservation,
  ReservationItem,
} from '../../services/activityService';

export default function ReservationDetails({ route, navigation }: any) {
  const initialReservation: ReservationItem = route?.params?.reservation || {
    id: route?.params?.reservationId || 'RES-10245',
    bookId: 'BK1024',
    title: 'Database Systems',
    status: 'Reserved',
    dateLabel: 'Collect By',
    date: '12 Sep 2026',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300',
    reservedAt: '10 Sep 2026',
    collectionDeadline: '12 Sep 2026',
  };

  const [item, setItem] = useState<ReservationItem>(initialReservation);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (route?.params?.reservationId) {
      loadDetails(route.params.reservationId);
    }
  }, [route?.params?.reservationId]);

  const loadDetails = async (id: string) => {
    try {
      setLoading(true);
      const res = await getReservationDetails(id);
      if (res) {
        setItem(res);
      }
    } catch (err) {
      console.warn('Error loading reservation details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = () => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this book reservation?',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const result = await cancelReservation(item.id);
              if (result.success) {
                setItem((prev) => ({
                  ...prev,
                  status: 'Cancelled',
                }));
                Alert.alert('Reservation Cancelled', 'Your reservation status has been updated to Cancelled.');
              } else {
                Alert.alert('Cancellation Error', result.message);
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not cancel reservation.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const isCancelled = item.status === 'Cancelled' || item.status === 'Collected';
  const isReady = item.status === 'Ready for Collection';

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservation Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Book Info Card */}
          <View style={styles.bookCard}>
            <Image source={{ uri: item.image }} style={styles.bookCover} />
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              <Text style={styles.bookId}>Book ID: {item.bookId}</Text>
            </View>
          </View>

          {/* Reservation Status Row */}
          <View style={styles.statusRow}>
            <View style={styles.resIdContainer}>
              <Text style={styles.resIdLabel}>Reservation ID</Text>
              <Text style={styles.resIdText}>{item.id}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>

          {/* Vertical Timeline */}
          <View style={styles.timelineContainer}>
            {/* Step 1 */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineIconContainer}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
                <View
                  style={[
                    styles.timelineLine,
                    isReady || item.status === 'Collected'
                      ? styles.timelineLineActive
                      : styles.timelineLineInactive,
                  ]}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Reservation Confirmed</Text>
                <Text style={styles.timelineDate}>{item.reservedAt || item.date}</Text>
                <Text style={styles.timelineDesc}>Reservation has been recorded in the library system.</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineIconContainer}>
                <View
                  style={[
                    styles.timelineDot,
                    isReady || item.status === 'Collected'
                      ? styles.timelineDotActive
                      : styles.timelineDotInactive,
                  ]}
                />
                <View
                  style={[
                    styles.timelineLine,
                    item.status === 'Collected'
                      ? styles.timelineLineActive
                      : styles.timelineLineInactive,
                  ]}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Ready for Collection</Text>
                <Text style={styles.timelineDate}>
                  {item.collectionDeadline || item.date}
                </Text>
                <Text style={styles.timelineDesc}>
                  {item.status === 'Cancelled'
                    ? 'Reservation was cancelled.'
                    : isReady
                    ? 'Book is ready at the circulation desk.'
                    : 'Library staff is preparing the book.'}
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineIconContainer}>
                <View
                  style={
                    item.status === 'Collected'
                      ? styles.timelineDotActive
                      : item.status === 'Cancelled'
                      ? [styles.timelineDot, { backgroundColor: COLORS.danger }]
                      : styles.timelineDotInactive
                  }
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>
                  {item.status === 'Cancelled'
                    ? 'Reservation Cancelled'
                    : 'Collection Finalized'}
                </Text>
                <Text style={styles.timelineDate}>
                  {item.collectionDeadline || item.date}
                </Text>
                <Text style={styles.timelineDesc}>
                  {item.status === 'Cancelled'
                    ? 'Cancelled by user request.'
                    : item.status === 'Collected'
                    ? 'Book has been collected by user.'
                    : 'Collect within 48 hours of notification.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Cancel Button (UPDATE CRUD Operation) */}
          <TouchableOpacity
            style={[styles.cancelBtn, isCancelled && styles.cancelBtnDisabled]}
            onPress={handleCancelReservation}
            disabled={isCancelled || cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color={COLORS.danger} />
            ) : (
              <Text
                style={[
                  styles.cancelBtnText,
                  isCancelled && styles.cancelBtnTextDisabled,
                ]}
              >
                {item.status === 'Cancelled'
                  ? 'Reservation is Cancelled'
                  : item.status === 'Collected'
                  ? 'Book Already Collected'
                  : 'Cancel Reservation'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  bookCover: {
    width: 70,
    height: 100,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: COLORS.surface,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  bookId: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
  },
  resIdContainer: {},
  resIdLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  resIdText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Timeline styles
  timelineContainer: {
    paddingLeft: 10,
    marginBottom: 40,
  },
  timelineStep: {
    flexDirection: 'row',
  },
  timelineIconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 15,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 2,
    zIndex: 1,
  },
  timelineDotActive: {
    backgroundColor: COLORS.secondary,
  },
  timelineDotInactive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginTop: 2,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 50,
  },
  timelineLineActive: {
    backgroundColor: COLORS.secondary,
  },
  timelineLineInactive: {
    backgroundColor: COLORS.border,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 25,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Cancel Button
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelBtnDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cancelBtnText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtnTextDisabled: {
    color: COLORS.textSecondary,
  },
});
