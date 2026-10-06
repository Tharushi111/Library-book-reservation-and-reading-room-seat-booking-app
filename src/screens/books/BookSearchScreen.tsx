import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { supabase } from "../../services/supabase";
import { COLORS } from "../../constants/colors";
import { RootStackParamList } from "../../navigation/types";

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    "BookSearch"
  >;

type RecentSearch = {
  id: string;
  search_query: string;
  created_at: string;
};

const categories = [
  "Computer Science",
  "Engineering",
  "Business",
  "Design",
  "Mathematics",
  "More",
];

export default function BookSearchScreen({
  navigation,
}: Props) {
  const [searchText, setSearchText] =
    useState("");

  const [
    recentSearches,
    setRecentSearches,
  ] = useState<RecentSearch[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [searching, setSearching] =
    useState(false);

  // =====================================================
  // READ RECENT SEARCHES
  // =====================================================

  const loadRecentSearches =
    useCallback(async () => {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("recent_searches")
          .select(
            "id, search_query, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(5);

        if (error) {
          throw error;
        }

        setRecentSearches(
          (data ?? []) as RecentSearch[]
        );
      } catch (error: any) {
        console.error(
          "Recent search load error:",
          error
        );

        Alert.alert(
          "Unable to Load Searches",
          error?.message ||
            "Please try again."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentSearches();
    }, [loadRecentSearches])
  );

  // =====================================================
  // CREATE RECENT SEARCH
  // =====================================================

  const saveRecentSearch =
    async (query: string) => {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Please login again."
        );
      }

      const { error } =
        await supabase
          .from("recent_searches")
          .insert({
            user_id: user.id,
            search_query: query,
          });

      if (error) {
        throw error;
      }
    };

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch =
    async (
      customQuery?: string
    ) => {
      const query = (
        customQuery ??
        searchText
      ).trim();

      if (!query) {
        Alert.alert(
          "Search Required",
          "Please enter a book title, author, or keyword."
        );

        return;
      }

      try {
        setSearching(true);

        await saveRecentSearch(
          query
        );

        setSearchText("");

        navigation.navigate(
          "SearchResults",
          {
            query,
          }
        );
      } catch (error: any) {
        console.error(
          "Search error:",
          error
        );

        Alert.alert(
          "Search Failed",
          error?.message ||
            "Please try again."
        );
      } finally {
        setSearching(false);
      }
    };

  // =====================================================
  // CLICK AN EXISTING RECENT SEARCH
  // =====================================================

  const handleRecentSearch = (
    query: string
  ) => {
    navigation.navigate(
      "SearchResults",
      {
        query,
      }
    );
  };

  // =====================================================
  // CATEGORY
  // =====================================================

  const handleCategoryPress =
    async (category: string) => {
      if (category === "More") {
        Alert.alert(
          "More Categories",
          "Additional categories will be available from the full book catalogue."
        );

        return;
      }

      await handleSearch(
        category
      );
    };

  // =====================================================
  // OPEN RECENT SEARCHES PAGE
  // =====================================================

  const openRecentSearches = () => {
    navigation.navigate(
      "RecentSearches"
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.primary
        }
      />

      {/* =================================================
          BLUE HEADER
      ================================================= */}

      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <Text
          style={
            styles.headerTitle
          }
        >
          Search Books
        </Text>

        <View
          style={styles.headerSpacer}
        />
      </View>

      {/* =================================================
          WHITE CONTENT
      ================================================= */}

      <ScrollView
        style={styles.body}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* SEARCH BAR */}

        <View
          style={styles.searchRow}
        >
          <View
            style={
              styles.searchContainer
            }
          >
            <Ionicons
              name="search-outline"
              size={20}
              color="#8390A5"
            />

            <TextInput
              value={searchText}
              onChangeText={
                setSearchText
              }
              placeholder="Search by title, author, keyword..."
              placeholderTextColor="#9CA3AF"
              style={
                styles.searchInput
              }
              returnKeyType="search"
              onSubmitEditing={() =>
                handleSearch()
              }
            />

            {searchText.length >
              0 && (
              <TouchableOpacity
                onPress={() =>
                  setSearchText("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color="#A2ADBC"
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={
              styles.filterButton
            }
            onPress={() =>
              Alert.alert(
                "Book Filters",
                "Select one of the popular categories below to filter books."
              )
            }
          >
            <Ionicons
              name="funnel-outline"
              size={22}
              color="#1683E8"
            />
          </TouchableOpacity>
        </View>

        {searching && (
          <View
            style={
              styles.searchingRow
            }
          >
            <ActivityIndicator
              size="small"
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.searchingText
              }
            >
              Searching...
            </Text>
          </View>
        )}

        {/* =================================================
            RECENT SEARCHES
        ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Recent Searches
          </Text>

          <TouchableOpacity
            onPress={
              openRecentSearches
            }
          >
            <Text
              style={
                styles.viewAllText
              }
            >
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View
            style={
              styles.loadingSection
            }
          >
            <ActivityIndicator
              size="small"
              color={
                COLORS.primary
              }
            />
          </View>
        ) : recentSearches.length >
          0 ? (
          <View>
            {recentSearches.map(
              (item) => (
                <TouchableOpacity
                  key={item.id}
                  style={
                    styles.recentItem
                  }
                  onPress={() =>
                    handleRecentSearch(
                      item.search_query
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={
                      styles.recentLeft
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={
                        COLORS.secondary
                      }
                    />

                    <Text
                      style={
                        styles.recentText
                      }
                      numberOfLines={1}
                    >
                      {
                        item.search_query
                      }
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#0B67D1"
                  />
                </TouchableOpacity>
              )
            )}
          </View>
        ) : (
          <View
            style={
              styles.emptyRecent
            }
          >
            <Ionicons
              name="time-outline"
              size={28}
              color="#A8B3C2"
            />

            <Text
              style={
                styles.emptyText
              }
            >
              No recent searches yet
            </Text>

            <Text
              style={
                styles.emptySubtext
              }
            >
              Search for a book to
              create your history.
            </Text>
          </View>
        )}

        {/* =================================================
            POPULAR CATEGORIES
        ================================================= */}

        <Text
          style={[
            styles.sectionTitle,
            styles.categoryTitle,
          ]}
        >
          Popular Categories
        </Text>

        <View
          style={
            styles.categoryContainer
          }
        >
          {categories.map(
            (category, index) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,

                  index === 0 &&
                    styles.selectedCategoryChip,
                ]}
                onPress={() =>
                  handleCategoryPress(
                    category
                  )
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryText,

                    index === 0 &&
                      styles.selectedCategoryText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.primary,
    },

    // BLUE HEADER

    topHeader: {
      height: 62,

      paddingHorizontal: 20,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      backgroundColor:
        COLORS.primary,
    },

    backButton: {
      width: 38,
      height: 38,

      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "700",

      color: COLORS.white,
    },

    headerSpacer: {
      width: 38,
    },

    // BODY

    body: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    scrollContent: {
      flexGrow: 1,

      paddingHorizontal: 22,
      paddingTop: 22,
      paddingBottom: 40,
    },

    // SEARCH

    searchRow: {
      flexDirection: "row",
      alignItems: "center",

      marginBottom: 24,
    },

    searchContainer: {
      flex: 1,

      height: 50,

      flexDirection: "row",
      alignItems: "center",

      borderWidth: 1,
      borderColor:
        "#D2DEED",

      borderRadius: 10,

      paddingHorizontal: 13,

      backgroundColor:
        COLORS.white,
    },

    searchInput: {
      flex: 1,

      marginLeft: 9,
      marginRight: 7,

      fontSize: 12,

      color:
        COLORS.textPrimary,
    },

    filterButton: {
      width: 44,
      height: 44,

      borderRadius: 10,

      backgroundColor:
        "#EFF6FE",

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 9,
    },

    searchingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      marginTop: -10,
      marginBottom: 14,
    },

    searchingText: {
      marginLeft: 7,

      fontSize: 11,

      color:
        COLORS.textSecondary,
    },

    // SECTION TITLE

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      marginBottom: 6,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",

      color:
        COLORS.primary,
    },

    viewAllText: {
      fontSize: 11,
      fontWeight: "600",

      color: "#1683E8",
    },

    // RECENT SEARCHES

    loadingSection: {
      minHeight: 100,

      alignItems: "center",
      justifyContent: "center",
    },

    recentItem: {
      minHeight: 45,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      borderBottomWidth: 1,
      borderBottomColor:
        "#DFE6EF",
    },

    recentLeft: {
      flex: 1,

      flexDirection: "row",
      alignItems: "center",
    },

    recentText: {
      flex: 1,

      marginLeft: 12,

      fontSize: 12,

      color: "#365779",
    },

    emptyRecent: {
      minHeight: 120,

      alignItems: "center",
      justifyContent: "center",

      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    emptyText: {
      marginTop: 8,

      fontSize: 12,
      fontWeight: "600",

      color:
        COLORS.textSecondary,
    },

    emptySubtext: {
      marginTop: 4,

      fontSize: 10,

      color: "#9CA3AF",
    },

    // CATEGORY

    categoryTitle: {
      marginTop: 25,
      marginBottom: 16,
    },

    categoryContainer: {
      flexDirection: "row",
      flexWrap: "wrap",

      gap: 9,
    },

    categoryChip: {
      minWidth: 104,

      paddingHorizontal: 17,
      paddingVertical: 11,

      borderRadius: 22,

      backgroundColor:
        "#EEF5FC",

      alignItems: "center",
      justifyContent: "center",
    },

    selectedCategoryChip: {
      backgroundColor:
        COLORS.secondary,
    },

    categoryText: {
      fontSize: 10,
      fontWeight: "600",

      color:
        COLORS.primary,
    },

    selectedCategoryText: {
      color:
        COLORS.white,
    },
  });