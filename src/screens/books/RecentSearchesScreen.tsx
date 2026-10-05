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
    "RecentSearches"
  >;

type RecentSearch = {
  id: string;
  search_query: string;
  created_at: string;
};

export default function RecentSearchesScreen({
  navigation,
}: Props) {
  const [
    recentSearches,
    setRecentSearches,
  ] = useState<RecentSearch[]>([]);

  const [loading, setLoading] =
    useState(true);

  // =====================================================
  // READ ALL RECENT SEARCHES
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
          Alert.alert(
            "Session Error",
            "Please login again."
          );

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
          });

        if (error) {
          throw error;
        }

        setRecentSearches(
          (data ?? []) as RecentSearch[]
        );
      } catch (error: any) {
        console.error(
          "Recent searches error:",
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
  // OPEN SEARCH RESULT
  // =====================================================

  const handleSearchPress = (
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
  // DELETE ONE
  // =====================================================

  const handleDelete = (
    id: string
  ) => {
    Alert.alert(
      "Delete Search",
      "Remove this search from your history?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            try {
              const {
                error,
              } = await supabase
                .from(
                  "recent_searches"
                )
                .delete()
                .eq("id", id);

              if (error) {
                throw error;
              }

              setRecentSearches(
                (current) =>
                  current.filter(
                    (item) =>
                      item.id !== id
                  )
              );
            } catch (error: any) {
              Alert.alert(
                "Delete Failed",
                error?.message ||
                  "Please try again."
              );
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // DELETE ALL
  // =====================================================

  const handleClearAll = () => {
    if (
      recentSearches.length === 0
    ) {
      return;
    }

    Alert.alert(
      "Clear Search History",
      "Are you sure you want to remove all recent searches?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",

          onPress: async () => {
            try {
              const {
                data: { user },
                error:
                  userError,
              } =
                await supabase.auth.getUser();

              if (userError) {
                throw userError;
              }

              if (!user) {
                return;
              }

              const {
                error,
              } = await supabase
                .from(
                  "recent_searches"
                )
                .delete()
                .eq(
                  "user_id",
                  user.id
                );

              if (error) {
                throw error;
              }

              setRecentSearches(
                []
              );
            } catch (error: any) {
              Alert.alert(
                "Clear Failed",
                error?.message ||
                  "Please try again."
              );
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (
    date: string
  ) => {
    return new Date(
      date
    ).toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

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
          HEADER
      ================================================= */}

      <View style={styles.header}>
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
          style={styles.headerTitle}
        >
          Recent Searches
        </Text>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearAll}
          disabled={
            recentSearches.length ===
            0
          }
        >
          <Text
            style={[
              styles.clearText,

              recentSearches.length ===
                0 &&
                styles.disabledClearText,
            ]}
          >
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <ScrollView
        style={styles.body}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
              size="large"
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading searches...
            </Text>
          </View>
        ) : recentSearches.length ===
          0 ? (
          <View
            style={
              styles.emptyContainer
            }
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="time-outline"
                size={34}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No Recent Searches
            </Text>

            <Text
              style={
                styles.emptySubtitle
              }
            >
              Your previous book
              searches will appear
              here.
            </Text>
          </View>
        ) : (
          recentSearches.map(
            (item) => (
              <TouchableOpacity
                key={item.id}
                style={
                  styles.searchItem
                }
                onPress={() =>
                  handleSearchPress(
                    item.search_query
                  )
                }
                activeOpacity={0.75}
              >
                <View
                  style={
                    styles.searchLeft
                  }
                >
                  <View
                    style={
                      styles.historyIcon
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={19}
                      color={
                        COLORS.secondary
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.searchInfo
                    }
                  >
                    <Text
                      style={
                        styles.searchText
                      }
                      numberOfLines={1}
                    >
                      {
                        item.search_query
                      }
                    </Text>

                    <Text
                      style={
                        styles.searchDate
                      }
                    >
                      {formatDate(
                        item.created_at
                      )}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={
                    styles.deleteButton
                  }
                  onPress={() =>
                    handleDelete(
                      item.id
                    )
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color={
                      COLORS.danger
                    }
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            )
          )
        )}
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

    header: {
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
      width: 55,
      height: 40,

      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "700",

      color: COLORS.white,
    },

    clearButton: {
      width: 55,

      alignItems: "flex-end",
    },

    clearText: {
      fontSize: 12,
      fontWeight: "700",

      color: COLORS.white,
    },

    disabledClearText: {
      opacity: 0.4,
    },

    body: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    scrollContent: {
      flexGrow: 1,

      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },

    // LOADING

    loadingContainer: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingBottom: 70,
    },

    loadingText: {
      marginTop: 10,

      fontSize: 12,

      color:
        COLORS.textSecondary,
    },

    // ITEM

    searchItem: {
      minHeight: 68,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      backgroundColor:
        COLORS.white,

      borderWidth: 1,
      borderColor:
        "#D9E3F0",

      borderRadius: 11,

      paddingHorizontal: 12,

      marginBottom: 10,
    },

    searchLeft: {
      flex: 1,

      flexDirection: "row",
      alignItems: "center",
    },

    historyIcon: {
      width: 38,
      height: 38,

      borderRadius: 19,

      backgroundColor:
        "#FFF3E9",

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,
    },

    searchInfo: {
      flex: 1,
    },

    searchText: {
      fontSize: 13,
      fontWeight: "600",

      color:
        COLORS.primary,
    },

    searchDate: {
      marginTop: 4,

      fontSize: 10,

      color:
        COLORS.textSecondary,
    },

    deleteButton: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",
    },

    // EMPTY

    emptyContainer: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingBottom: 70,
    },

    emptyIcon: {
      width: 70,
      height: 70,

      borderRadius: 35,

      backgroundColor:
        "#EEF5FC",

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 15,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",

      color:
        COLORS.primary,
    },

    emptySubtitle: {
      maxWidth: 220,

      marginTop: 6,

      textAlign: "center",

      fontSize: 11,

      color:
        COLORS.textSecondary,

      lineHeight: 17,
    },
  });