import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ReservationDetails({ route, navigation }: any) {
  // If navigation passes a reservation object, use it; otherwise use default mock data
  const item = route?.params?.reservation || {
    id: 'RES-10245',
    bookId: 'BK1024',
    title: 'Database Systems',
    status: 'Reserved',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=Database',
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
        return '#FEE2E2';
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
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>

        {/* Vertical Timeline */}
        <View style={styles.timelineContainer}>
          {/* Step 1 */}
          <View style={styles.timelineStep}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <View style={[styles.timelineLine, styles.timelineLineActive]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Reservation Confirmed</Text>
              <Text style={styles.timelineDate}>13 Sep 2026</Text>
              <Text style={styles.timelineDesc}>Reservation has been placed</Text>
            </View>
          </View>
          
          {/* Step 2 */}
          <View style={styles.timelineStep}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <View style={[styles.timelineLine, styles.timelineLineInactive]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Ready for Collection</Text>
              <Text style={styles.timelineDate}>13 Sep 2026</Text>
              <Text style={styles.timelineDesc}>Book is ready</Text>
            </View>
          </View>
          
          {/* Step 3 */}
          <View style={styles.timelineStep}>
            <View style={styles.timelineIconContainer}>
              <View style={styles.timelineDotInactive} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Collected By</Text>
              <Text style={styles.timelineDate}>13 Sep 2026</Text>
              <Text style={styles.timelineDesc}>Within 48 hours</Text>
            </View>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
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
    marginBottom: 0, // spacing managed by line height
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
    minHeight: 50, // ensures the line connects to the next dot
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
  cancelBtnText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
