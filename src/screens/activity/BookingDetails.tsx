import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getBookingDetails, cancelRoomBooking, RoomBookingItem } from '../../services/activityService';
import { useFocusEffect } from '@react-navigation/native';

export default function BookingDetails({ route, navigation }: any) {
  const { bookingId, booking: initialBooking } = route.params || {};
  const [booking, setBooking] = useState<RoomBookingItem | null>(initialBooking || null);
  const [loading, setLoading] = useState<boolean>(!initialBooking);
  const [cancelling, setCancelling] = useState<boolean>(false);

  const loadBooking = async () => {
    if (!bookingId && !booking?.id) return;
    try {
      setLoading(true);
      const data = await getBookingDetails(bookingId || booking?.id);
      if (data) {
        setBooking(data);
      }
    } catch (err) {
      console.warn('Error fetching booking details:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!initialBooking) {
        loadBooking();
      }
    }, [bookingId, initialBooking])
  );

  const handleCancel = () => {
    if (!booking) return;

    Alert.alert(
      'Cancel Room Booking',
      `Are you sure you want to cancel your booking for ${booking.room}?`,
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            const res = await cancelRoomBooking(booking.id);
            if (res.success) {
              Alert.alert('Booking Cancelled', 'Your room booking was cancelled successfully.');
              setBooking({ ...booking, status: 'Cancelled' });
            } else {
              Alert.alert('Error', res.message);
            }
            setCancelling(false);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={COLORS.warning} />
          <Text style={styles.errorTitle}>Booking Not Found</Text>
          <Text style={styles.errorText}>The booking you are looking for does not exist or has been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = booking.status === 'Cancelled' || booking.status === 'Completed';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image source={{ uri: booking.image }} style={styles.roomImage} />
        
        <View style={styles.detailsCard}>
          <Text style={styles.roomTitle}>{booking.room}</Text>
          
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                booking.status === 'Cancelled' && { backgroundColor: '#FEE2E2' },
                booking.status === 'Completed' && { backgroundColor: '#E0E7FF' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  booking.status === 'Cancelled' && { color: COLORS.danger },
                  booking.status === 'Completed' && { color: COLORS.primary },
                ]}
              >
                {booking.status}
              </Text>
            </View>
            <Text style={styles.bookingId}>ID: {booking.id}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Room Type & Floor</Text>
              <Text style={styles.infoValue}>{booking.floor}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Capacity</Text>
              <Text style={styles.infoValue}>{booking.seat}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{booking.date}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{booking.time}</Text>
            </View>
          </View>

          {booking.participants && (
            <View style={styles.infoRow}>
              <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Participants</Text>
                <Text style={styles.infoValue}>{booking.participants} members</Text>
              </View>
            </View>
          )}
        </View>

        {!isCancelled && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  roomImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 24,
  },
  roomTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
  bookingId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cancelButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
  },
});
