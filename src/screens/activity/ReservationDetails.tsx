import React, { useEffect, useState } from 'react';
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
  const passedReservation: ReservationItem | undefined = route?.params?.reservation;
  const reservationId: string | undefined =
    route?.params?.reservationId || passedReservation?.id;

  const [item, setItem] = useState<ReservationItem | null>(
    passedReservation ?? null
  );
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reservationId) {
      setLoading(false);
      setItem(null);
      return;
    }

    loadDetails(reservationId);
  }, [reservationId]);

  const loadDetails = async (id: string) => {
    try {
      setLoading(true);
      const result = await getReservationDetails(id);
      setItem(result);
    } catch (error) {
      console.warn('Error loading reservation details:', error);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = () => {
    if (!item) return;

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
                setItem((previous) =>
                  previous
                    ? {
                        ...previous,
                        status: 'Cancelled',
                        dateLabel: 'Cancelled',
                      }
                    : previous
                );

                Alert.alert(
                  'Reservation Cancelled',
                  'Your reservation status has been updated to Cancelled.'
                );
              } else {
                Alert.alert('Cancellation Error', result.message);
              }
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.message || 'Could not cancel reservation.'
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

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

  const shortReservationId = (id: string) => {
    if (id.length <= 12) return id;
    return `RES-${id.slice(0, 8).toUpperCase()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reservation Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reservation Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={48} color={COLORS.border} />
          <Text style={styles.notFoundTitle}>Reservation not found</Text>
          <Text style={styles.notFoundText}>
            This reservation does not exist or does not belong to this account.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled =
    item.status === 'Cancelled' ||
    item.status === 'Collected' ||
    item.status === 'Expired' ||
    item.status === 'Returned';

  const isReady = item.status === 'Ready for Collection';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservation Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bookCard}>
          <Image source={{ uri: item.image }} style={styles.bookCover} />
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{item.title}</Text>
            {/* Book UUID intentionally not displayed. */}
            <Text style={styles.bookSubtitle}>Library reservation</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.resIdContainer}>
            <Text style={styles.resIdLabel}>Reservation Reference</Text>
            <Text style={styles.resIdText}>{shortReservationId(item.id)}</Text>
          </View>

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

        <View style={styles.timelineContainer}>
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
              <Text style={styles.timelineDesc}>
                Reservation has been recorded in the library system.
              </Text>
            </View>
          </View>

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
                  : item.status === 'Expired'
                  ? 'The collection deadline has passed.'
                  : isReady
                  ? 'Book is ready at the circulation desk.'
                  : 'Library staff is preparing the book.'}
              </Text>
            </View>
          </View>

          <View style={styles.timelineStep}>
            <View style={styles.timelineIconContainer}>
              <View
                style={[
                  styles.timelineDot,
                  item.status === 'Collected' || item.status === 'Returned'
                    ? styles.timelineDotActive
                    : item.status === 'Cancelled' || item.status === 'Expired'
                    ? styles.timelineDotDanger
                    : styles.timelineDotInactive,
                ]}
              />
            </View>

            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>
                {item.status === 'Cancelled'
                  ? 'Reservation Cancelled'
                  : item.status === 'Expired'
                  ? 'Reservation Expired'
                  : item.status === 'Returned'
                  ? 'Book Returned'
                  : 'Collection Finalized'}
              </Text>
              <Text style={styles.timelineDate}>
                {item.collectionDeadline || item.date}
              </Text>
              <Text style={styles.timelineDesc}>
                {item.status === 'Cancelled'
                  ? 'Cancelled by user request.'
                  : item.status === 'Expired'
                  ? 'The reservation expired before collection.'
                  : item.status === 'Collected'
                  ? 'Book has been collected by the user.'
                  : item.status === 'Returned'
                  ? 'Book has been returned to the library.'
                  : 'Collect within 48 hours of the reservation deadline.'}
              </Text>
            </View>
          </View>
        </View>

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
                : item.status === 'Expired'
                ? 'Reservation Expired'
                : item.status === 'Returned'
                ? 'Book Returned'
                : 'Cancel Reservation'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerSpacer: {
    width: 34,
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
    paddingHorizontal: 30,
  },
  notFoundTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notFoundText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
    minWidth: 0,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  bookSubtitle: {
    fontSize: 13,
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
    gap: 10,
  },
  resIdContainer: {
    flex: 1,
    minWidth: 0,
  },
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
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
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
  timelineDotDanger: {
    backgroundColor: COLORS.danger,
  },
  timelineDotInactive: {
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
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
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
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
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtnTextDisabled: {
    color: COLORS.textSecondary,
  },
});
