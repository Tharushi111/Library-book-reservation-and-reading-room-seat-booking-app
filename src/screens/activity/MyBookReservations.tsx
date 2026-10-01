import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const ACTIVE_RESERVATIONS = [
  {
    id: 'RES-10245',
    bookId: 'BK1024',
    title: 'Database Systems',
    status: 'Reserved',
    dateLabel: 'Collect By',
    date: '12 Sep 2026',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=Database',
  },
  {
    id: 'RES-20874',
    bookId: 'BK2087',
    title: 'Software Engineering',
    status: 'Ready for Collection',
    dateLabel: 'Collect By',
    date: '14 Sep 2025',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=SE',
  },
  {
    id: 'RES-35678',
    bookId: 'BK3567',
    title: 'Web Technologies',
    status: 'Reserved',
    dateLabel: 'Collect By',
    date: '16 Sep 2025',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=Web',
  },
];

const PAST_RESERVATIONS = [
  {
    id: 'RES-11311',
    bookId: 'BK1131',
    title: 'Data Structures',
    status: 'Collected',
    dateLabel: 'Collect By',
    date: '02 Sep 2025',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=DS',
  },
  {
    id: 'RES-33314',
    bookId: 'BK3331',
    title: 'Human Computer Interaction',
    status: 'Cancelled',
    dateLabel: 'Collect By',
    date: '28 Aug 2025',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=HCI',
  },
  {
    id: 'RES-19762',
    bookId: 'BK1976',
    title: 'Introduction to AI',
    status: 'Returned',
    dateLabel: 'Collect By',
    date: '15 Aug 2025',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=AI',
  },
];

export default function MyBookReservations({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'Active' | 'Past'>('Active');

  const data = activeTab === 'Active' ? ACTIVE_RESERVATIONS : PAST_RESERVATIONS;

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
        return '#E6F4EA'; // light green
      case 'Ready for Collection':
        return '#FEF3C7'; // light yellow
      case 'Cancelled':
        return '#FEE2E2'; // light red
      default:
        return '#E0E7FF';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.bookCover} />
      <View style={styles.cardContent}>
        <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.bookId}>Book ID: {item.bookId}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.dateText}>{item.dateLabel}: {item.date}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.detailsBtn}
        onPress={() => navigation.navigate('ReservationDetails', { reservation: item })}
      >
        <Text style={styles.detailsBtnText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Book Reservations</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Active' && styles.activeTabBtn]}
          onPress={() => setActiveTab('Active')}
        >
          <Text style={[styles.tabText, activeTab === 'Active' && styles.activeTabText]}>
            Active ({ACTIVE_RESERVATIONS.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Past' && styles.activeTabBtn]}
          onPress={() => setActiveTab('Past')}
        >
          <Text style={[styles.tabText, activeTab === 'Past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.bookId}
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
});
