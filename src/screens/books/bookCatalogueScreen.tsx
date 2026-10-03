import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import type { Book } from "../../types";
import { getCatalogue } from "../../services/bookService";
import { COLORS } from "../../constants/colors";

const CATEGORIES = ["All", "Data Science", "Database", "Journals"];

export default function BookCatalogueScreen() {
  const navigation = useNavigation<any>();

  const [books, setBooks] = useState<Book[]>([]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  /**
   * Load books from Supabase
   */
  const loadBooks = useCallback(async (selectedCategory: string) => {
    setLoading(true);

    try {
      const data = await getCatalogue(selectedCategory);
      setBooks(data);
    } catch (error) {
      console.error("Failed to load catalogue:", error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reload books when category changes
   */
  useEffect(() => {
    loadBooks(category);
  }, [category, loadBooks]);

  /**
   * Search
   */
  const submitSearch = () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    navigation.navigate("SearchResults", {
      query: trimmedQuery,
    });
  };

  /**
   * Book card
   */
  const renderBook = ({ item }: { item: Book }) => {
    const isAvailable =
      item.availabilityStatus === "available";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("BookDetails", {
            bookId: item.id,
          })
        }
      >
        {/* Book Cover */}
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverPlaceholderText}>
              No Cover
            </Text>
          </View>
        )}

        {/* Title */}
        <Text
          style={styles.cardTitle}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Author */}
        <Text
          style={styles.cardAuthor}
          numberOfLines={1}
        >
          {item.author}
        </Text>

        {/* Category */}
        <Text
          style={styles.cardCategory}
          numberOfLines={1}
        >
          {item.category}
        </Text>

        {/* Availability */}
        <Text
          style={[
            styles.statusText,
            {
              color: isAvailable
                ? COLORS.available
                : item.availabilityStatus === "reserved"
                ? COLORS.warning
                : COLORS.borrowed,
            },
          ]}
        >
          {isAvailable
            ? "● Available"
            : item.availabilityStatus === "reserved"
            ? "● Reserved"
            : "● Borrowed"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Catalogue
        </Text>

        {/* Search */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, author..."
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>

        {/* Categories */}
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isActive = category === item;

            return (
              <TouchableOpacity
                onPress={() => setCategory(item)}
                activeOpacity={0.8}
                style={[
                  styles.chip,
                  isActive && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading books...
          </Text>
        </View>
      ) : books.length === 0 ? (
        /* Empty */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No books found
          </Text>

          <Text style={styles.emptyText}>
            There are no books available in this category.
          </Text>
        </View>
      ) : (
        /* Books */
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderBook}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bookList}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  header: {
    padding: 20,
    backgroundColor: COLORS.background,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  searchBar: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  categoryList: {
    gap: 8,
    marginTop: 12,
  },

  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background,
  },

  chipActive: {
    backgroundColor: "#E8F1FC",
    borderColor: COLORS.primary,
  },

  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  chipTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  bookList: {
    padding: 16,
  },

  columnWrapper: {
    gap: 16,
  },

  card: {
    flex: 1,
    marginBottom: 16,
  },

  cover: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    backgroundColor: "#E8F1FC",
  },

  coverPlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    backgroundColor: "#E8F1FC",
    alignItems: "center",
    justifyContent: "center",
  },

  coverPlaceholderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 8,
  },

  cardAuthor: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  cardCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
  },
});