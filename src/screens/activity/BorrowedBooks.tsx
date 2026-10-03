import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
  getUserBorrowedBooks,
  BorrowedBookItem,
} from '../../services/activityService';

export default function BorrowedBooks({ navigation }: any) {
  const [books, setBooks] = useState<BorrowedBookItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadBooks = async () => {
    try {
      const data = await getUserBorrowedBooks();
      setBooks(data);
    } catch (err) {
      console.warn('Error loading borrowed books:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBooks();
  };

  const dueSoonBooks = books.filter(
    (b) => b.dueIn.toLowerCase().includes('due in 1') ||
           b.dueIn.toLowerCase().includes('due in 2') ||
           b.dueIn.toLowerCase().includes('due in 3') ||
           b.dueIn.toLowerCase().includes('today') ||
           b.dueIn.toLowerCase().includes('overdue')
  );

  const otherBooks = books.filter((b) => !dueSoonBooks.includes(b));

  const BookCard = ({ item, isDueSoon }: { item: BorrowedBookItem; isDueSoon: boolean }) => (
    <View style={[styles.card, isDueSoon && styles.cardDueSoon]}>
      <Image source={{ uri: item.image }} style={styles.bookCover} />
      <View style={styles.cardContent}>
        <Text style={styles.bookTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.dueInText, isDueSoon && { color: COLORS.danger }]}>
          {item.dueIn}
        </Text>
        <Text style={styles.dateText}>Due date: {item.dueDate}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Activity Category Switcher */}
      <View style={styles.activityNav}>
        <TouchableOpacity
          style={styles.activityNavBtn}
          onPress={() => navigation.navigate('MyBookReservations')}
        >
          <Text style={styles.activityNavText}>Book Reservations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.activityNavBtn}
          onPress={() => navigation.navigate('MyStudyRoomBookings')}
        >
          <Text style={styles.activityNavText}>Room Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.activityNavBtn, styles.activityNavBtnActive]}
          onPress={() => navigation.navigate('BorrowedBooks')}
        >
          <Text style={[styles.activityNavText, styles.activityNavTextActive]}>Borrowed Books</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Borrowed Books</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading borrowed books...</Text>
        </View>
      ) : books.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No borrowed books</Text>
          <Text style={styles.emptySubtitle}>You currently do not have any borrowed library books.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {dueSoonBooks.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Due Soon</Text>
              {dueSoonBooks.map((book) => (
                <BookCard key={book.id} item={book} isDueSoon={true} />
              ))}
            </>
          )}

          {otherBooks.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: dueSoonBooks.length > 0 ? 10 : 0 }]}>
                Other Borrowed Books
              </Text>
              {otherBooks.map((book) => (
                <BookCard key={book.id} item={book} isDueSoon={false} />
              ))}
            </>
          )}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 15,
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
  cardDueSoon: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCCACA',
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
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  dueInText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
