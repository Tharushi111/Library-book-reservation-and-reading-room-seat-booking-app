import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import { getStaffBooks, deleteOrArchiveBook } from "../../services/staffService";
import { Book } from "../../types";
import BookCoverImage from "../../components/common/BookCoverImage";

const CATEGORIES = [
  "All",
  "Software Engineering",
  "Programming",
  "Database Management",
  "Artificial Intelligence & ML",
  "Cybersecurity",
  "Computer Networks",
  "Data Structures & Algorithms",
  "Web & Mobile Development",
  "UI/UX Design",
  "Business Management",
  "Mathematics & Statistics",
  "Project Management",
];

const AVAILABILITY_FILTERS = ["All", "Available", "Borrowed", "Maintenance"];

export default function StaffBookListScreen() {
  const navigation = useNavigation<any>();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAvailability, setSelectedAvailability] = useState("All");

  const loadBooks = useCallback(async () => {
    try {
      const data = await getStaffBooks({
        search: search.trim(),
        category: selectedCategory,
        availability: selectedAvailability,
      });
      setBooks(data);
    } catch (error: any) {
      console.error("Staff books load error:", error);
      Alert.alert("Error", error?.message || "Could not fetch library catalog.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory, selectedAvailability]);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  const handleDeleteBook = (book: Book) => {
    Alert.alert(
      "Remove or Archive Book",
      `Are you sure you want to remove "${book.title}" from circulation? Active loans or reservations will prevent deletion.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteOrArchiveBook(book.id);
              Alert.alert("Success", res.message);
              loadBooks();
            } catch (err: any) {
              Alert.alert("Cannot Delete Book", err?.message || "Operation failed.");
            }
          },
        },
      ]
    );
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    const isAvail = item.availabilityStatus === "available";
    return (
      <TouchableOpacity
        style={styles.bookCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("StaffBookDetails", { bookId: item.id })}
      >
        <BookCoverImage
          coverUrl={item.coverUrl}
          title={item.title}
          author={item.author}
          category={item.category}
          width={60}
          height={84}
          borderRadius={6}
          containerStyle={{ marginRight: 12 }}
        />

        <View style={styles.bookDetails}>
          <View style={styles.titleRow}>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </View>

          <Text style={styles.bookAuthor} numberOfLines={1}>
            By {item.author}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isAvail ? styles.statusAvailBadge : styles.statusBorrowedBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isAvail ? styles.statusAvailText : styles.statusBorrowedText,
                ]}
              >
                {isAvail ? "Available" : item.availabilityStatus.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.copiesRow}>
            <Text style={styles.copiesText}>
              Copies: <Text style={styles.copiesBold}>{item.availableCopies ?? 0} avail</Text> /{" "}
              {item.totalCopies ?? 0} total
            </Text>
            {item.shelfLocation ? (
              <Text style={styles.locationText} numberOfLines={1}>
                {item.shelfLocation}
              </Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.moreActionsButton}
          onPress={() => handleDeleteBook(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Book Inventory & Catalog</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("StaffAddEditBook")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Book</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8492A7" style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
            }}
            placeholder="Search by title, author, or ISBN..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={loadBooks}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Horizontal Filter */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === item && styles.chipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Availability Status Filter */}
      <View style={styles.subFiltersRow}>
        {AVAILABILITY_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.subFilterBtn,
              selectedAvailability === f && styles.subFilterBtnActive,
            ]}
            onPress={() => setSelectedAvailability(f)}
          >
            <Text
              style={[
                styles.subFilterText,
                selectedAvailability === f && styles.subFilterTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Books List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading books...</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadBooks();
              }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Books Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or category filters.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1E293B",
  },
  filtersContainer: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
  },
  categoryList: {
    paddingHorizontal: 12,
  },
  categoryChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  chipTextActive: {
    color: COLORS.white,
  },
  subFiltersRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  subFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#F8FAFC",
  },
  subFilterBtnActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  subFilterText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  subFilterTextActive: {
    color: "#1D4ED8",
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
    backgroundColor: "#F8FAFD",
    flexGrow: 1,
  },
  bookCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  bookCover: {
    width: 60,
    height: 84,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
    marginRight: 12,
  },
  bookDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  bookAuthor: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusAvailBadge: {
    backgroundColor: "#DCFCE7",
  },
  statusBorrowedBadge: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  statusAvailText: {
    color: "#15803D",
  },
  statusBorrowedText: {
    color: "#B91C1C",
  },
  copiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  copiesText: {
    fontSize: 11,
    color: "#64748B",
  },
  copiesBold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  locationText: {
    fontSize: 10,
    color: "#94A3B8",
    maxWidth: 100,
  },
  moreActionsButton: {
    padding: 8,
  },
  center: {
    flex: 1,
    backgroundColor: "#F8FAFD",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748B",
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },
});
