import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Book } from "../../types";
import {
  getCatalogue,
  subscribeToBookAvailability,
} from "../../services/bookService";

const THEME = {
  background: "#F7F9FC",
  surface: "#FFFFFF",
  navy: "#173D89",
  navyLight: "#EAF0FC",
  orange: "#F47A27",
  text: "#17223B",
  muted: "#758197",
  border: "#E6EAF2",
  coverBg: "#F0F3F8",
  greenBg: "#E6F6EC",
  greenText: "#198754",
  redBg: "#FDEBEC",
  redText: "#C33A46",
};

// Keep the UI label consistent if database rows use either "Journal" or "Journals".
function categoryLabel(value?: string | null): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return "Uncategorized";
  return /^journals?$/i.test(trimmed) ? "Journals" : trimmed;
}

function BookCover({ book }: { book: Book }) {
  return (
    <View style={styles.coverArea}>
      {book.coverUrl ? (
        <Image
          source={{ uri: book.coverUrl }}
          style={styles.cover}
          resizeMode="contain"
          accessibilityLabel={`${book.title} cover`}
        />
      ) : (
        <View style={styles.coverFallback}>
          <Ionicons name="book-outline" size={36} color="#A7B4CA" />
          <Text style={styles.coverFallbackText}>No cover</Text>
        </View>
      )}
    </View>
  );
}

export default function BookCatalogueScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [books, setBooks] = useState<Book[]>([]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const loadBooks = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      // Always fetch the full catalogue so new Supabase categories appear automatically.
      const data = await getCatalogue();
      setBooks(data);
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to load catalogue:", error);
      setErrorMessage("Couldn't load the catalogue. Please try again.");
      // Preserve already loaded books if a background refresh fails.
    } finally {
      loadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBooks(!loadedOnce.current);
    }, [loadBooks])
  );

  useEffect(() => {
    const unsubscribe = subscribeToBookAvailability(() => {
      void loadBooks(false);
    });
    return unsubscribe;
  }, [loadBooks]);

  const categories = useMemo(() => {
    const values = Array.from(new Set(books.map((book) => categoryLabel(book.category))));
    values.sort((a, b) => a.localeCompare(b));
    return ["All", ...values];
  }, [books]);

  const visibleBooks = useMemo(() => {
    if (category === "All") return books;
    return books.filter((book) => categoryLabel(book.category) === category);
  }, [books, category]);

  const cardWidth = Math.max(120, (width - 52) / 2);

  const submitSearch = () => {
    const value = query.trim();
    if (!value) return;
    navigation.navigate("SearchResults", { query: value });
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadBooks(false);
  };

  const renderBook = ({ item }: { item: Book }) => {
    const isAvailable = item.availabilityStatus === "available";
    return (
      <TouchableOpacity
        style={[styles.card, { width: cardWidth }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("BookDetails", { bookId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${item.title}`}
      >
        <BookCover book={item} />
        <View style={styles.cardBody}>
          <Text style={styles.cardCategory} numberOfLines={1}>
            {categoryLabel(item.category)}
          </Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>
            {item.author || "Unknown author"}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isAvailable ? THEME.greenBg : THEME.redBg },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isAvailable ? THEME.greenText : THEME.redText },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isAvailable ? THEME.greenText : THEME.redText },
              ]}
            >
              {isAvailable ? "Available" : "Borrowed"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }] }>
        <View style={styles.headingRow}>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>SLIIT LIBRARY</Text>
            <Text style={styles.title}>Catalogue</Text>
            <Text style={styles.subtitle}>Find your next great read</Text>
          </View>
          <View style={styles.headingIcon}>
            <Ionicons name="library-outline" size={25} color={THEME.navy} />
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={22} color={THEME.navy} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search books, authors..."
            placeholderTextColor={THEME.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel="Search books by title or author"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={20} color={THEME.muted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={submitSearch} accessibilityLabel="Submit search">
              <Ionicons name="arrow-forward-circle" size={24} color={THEME.orange} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.browseRow}>
          <Text style={styles.browseTitle}>Browse categories</Text>
          <Text style={styles.browseCount}>
            {visibleBooks.length} {visibleBooks.length === 1 ? "book" : "books"}
          </Text>
        </View>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const selected = category === item;
            return (
              <TouchableOpacity
                style={[styles.chip, selected && styles.chipActive]}
                activeOpacity={0.85}
                onPress={() => setCategory(item)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading && !loadedOnce.current ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.orange} />
          <Text style={styles.message}>Loading books...</Text>
        </View>
      ) : errorMessage && books.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={42} color={THEME.muted} />
          <Text style={styles.message}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadBooks(true)}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleBooks}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderBook}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.bookList,
            { paddingBottom: Math.max(100, insets.bottom + 84) },
            visibleBooks.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.orange]}
              tintColor={THEME.orange}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="book-outline" size={42} color="#A9B4C8" />
              <Text style={styles.emptyTitle}>No books found</Text>
              <Text style={styles.message}>There are no books in this category yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headingText: { flex: 1 },
  eyebrow: { color: THEME.orange, fontSize: 10, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: THEME.navy, fontSize: 29, fontWeight: "800", marginTop: 2 },
  subtitle: { color: THEME.muted, fontSize: 13, marginTop: 2 },
  headingIcon: {
    width: 46, height: 46, borderRadius: 15,
    backgroundColor: THEME.navyLight, alignItems: "center", justifyContent: "center",
  },
  searchBar: {
    height: 49, marginTop: 17, borderRadius: 15,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14,
    backgroundColor: "#F5F7FB", borderWidth: 1, borderColor: THEME.border,
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 14, color: THEME.text, paddingVertical: 0 },
  browseRow: {
    marginTop: 19, marginBottom: 11,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  browseTitle: { fontSize: 14, fontWeight: "800", color: THEME.text },
  browseCount: { fontSize: 12, color: THEME.muted, fontWeight: "600" },
  categoryList: { gap: 8, paddingRight: 16 },
  chip: {
    paddingHorizontal: 15, paddingVertical: 9, borderRadius: 22,
    backgroundColor: "#F1F4F8", borderWidth: 1, borderColor: THEME.border,
  },
  chipActive: { backgroundColor: THEME.orange, borderColor: THEME.orange },
  chipText: { color: THEME.text, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  bookList: { paddingHorizontal: 20, paddingTop: 16 },
  columnWrapper: { gap: 12, marginBottom: 13 },
  card: {
    backgroundColor: THEME.surface, borderRadius: 16,
    borderWidth: 1, borderColor: THEME.border, overflow: "hidden",
    shadowColor: "#17223B", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 9, elevation: 2,
  },
  coverArea: {
    height: 172, backgroundColor: THEME.coverBg,
    paddingHorizontal: 12, paddingVertical: 10,
    alignItems: "center", justifyContent: "center",
  },
  cover: { width: "100%", height: "100%" },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  coverFallbackText: { color: THEME.muted, fontSize: 11, marginTop: 7 },
  cardBody: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 13 },
  cardCategory: {
    color: THEME.orange, fontSize: 10, fontWeight: "800",
    marginBottom: 5, letterSpacing: 0.1,
  },
  cardTitle: {
    color: THEME.text, fontSize: 14, lineHeight: 19, fontWeight: "800",
    minHeight: 38,
  },
  cardAuthor: { color: THEME.muted, fontSize: 11, marginTop: 5, marginBottom: 10 },
  statusBadge: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center",
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: "800" },
  centered: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", padding: 20 },
  message: { marginTop: 10, color: THEME.muted, textAlign: "center", fontSize: 13 },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: "800", color: THEME.text },
  emptyList: { flexGrow: 1 },
  retryButton: { marginTop: 18, backgroundColor: THEME.orange, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 10 },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
