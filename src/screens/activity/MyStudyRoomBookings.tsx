import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const UPCOMING_BOOKINGS = [
  {
    id: 'BKG-001',
    room: 'Study Room A',
    floor: 'Floor 2',
    seat: 'A-12',
    date: '13 Sep 2026',
    time: '10:00 AM - 12:00 PM',
    status: 'Confirmed',
    image: 'https://via.placeholder.com/100x80/cccccc/000000?text=Room+A',
  },
  {
    id: 'BKG-002',
    room: 'Study Room B',
    floor: 'Floor 2',
    seat: 'B-04',
    date: '14 Sep 2026',
    time: '01:00 PM - 03:00 PM',
    status: 'Confirmed',
    image: 'https://via.placeholder.com/100x80/cccccc/000000?text=Room+B',
  },
];

export default function MyStudyRoomBookings({ navigation }: any) {
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.roomImage} />
      <View style={styles.cardContent}>
        <Text style={styles.roomTitle}>{item.room}</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.floor}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="pricetag-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Seat: {item.seat}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Date: {item.date}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Time: {item.time}</Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.detailsBtnText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Seat Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sectionTitle}>Upcoming</Text>

      <FlatList
        data={UPCOMING_BOOKINGS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginHorizontal: 20,
    marginBottom: 15,
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
  },
  roomImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '700',
  },
  detailsBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
