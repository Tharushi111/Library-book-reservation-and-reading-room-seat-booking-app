import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const DUE_SOON = [
  {
    id: 'BRW-01',
    title: 'Database Systems',
    dueIn: 'Due in 3 days',
    dueDate: '15 Sep 2026',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=Database',
  },
  {
    id: 'BRW-02',
    title: 'Web Technologies',
    dueIn: 'Due in 7 days',
    dueDate: '20 Sep 2025',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=Web',
  },
];

const OTHER_BOOKS = [
  {
    id: 'BRW-03',
    title: 'Web Development',
    dueIn: 'Due in 15 days',
    dueDate: '28 Sep 2026',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=Dev',
  },
  {
    id: 'BRW-04',
    title: 'Clean Code',
    dueIn: 'Due in 20 days',
    dueDate: '05 Oct 2026',
    image: 'https://via.placeholder.com/100x150/0B4DA2/FFFFFF?text=Clean',
  },
];

export default function BorrowedBooks({ navigation }: any) {
  const BookCard = ({ item, isDueSoon }: { item: any; isDueSoon: boolean }) => (
    <View style={[styles.card, isDueSoon && styles.cardDueSoon]}>
      <Image source={{ uri: item.image }} style={styles.bookCover} />
      <View style={styles.cardContent}>
        <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.dueInText, isDueSoon && { color: COLORS.danger }]}>{item.dueIn}</Text>
        <Text style={styles.dateText}>Due date: {item.dueDate}</Text>
        <TouchableOpacity style={styles.detailsBtn}>
          <Text style={styles.detailsBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Borrowed Books</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Due Soon</Text>
        {DUE_SOON.map((book) => (
          <BookCard key={book.id} item={book} isDueSoon={true} />
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Other Borrowed Books</Text>
        {OTHER_BOOKS.map((book) => (
          <BookCard key={book.id} item={book} isDueSoon={false} />
        ))}
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
    backgroundColor: '#FEF2F2', // light red
    borderColor: '#FCCACA', // slightly darker red border
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
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
    marginBottom: 8,
  },
  detailsBtn: {
    alignSelf: 'flex-end',
  },
  detailsBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
