import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
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

import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { supabase } from "../../services/supabase";
import { COLORS } from "../../constants/colors";

import {
  BottomTabParamList,
  RootStackParamList,
} from "../../navigation/types";

type Props = BottomTabScreenProps<
  BottomTabParamList,
  "Home"
>;

type ProfileData = {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: "student" | "staff";
};

export default function HomeScreen({
  navigation,
}: Props) {
  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  const [searchText, setSearchText] =
    useState("");

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const rootNavigation =
    navigation.getParent<
      NativeStackNavigationProp<RootStackParamList>
    >();

  // =====================================================
  // LOAD PROFILE + NOTIFICATION COUNT
  // =====================================================

  const loadHomeData = useCallback(
    async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

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

        // PROFILE
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "first_name, last_name, avatar_url, role"
          )
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        setProfile(
          profileData as ProfileData
        );

        // UNREAD NOTIFICATIONS
        const {
          count,
          error: notificationError,
        } = await supabase
          .from("notifications")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("user_id", user.id)
          .eq("is_read", false);

        if (notificationError) {
          throw notificationError;
        }

        setUnreadNotifications(
          count ?? 0
        );
      } catch (error: any) {
        console.error(
          "Home screen error:",
          error
        );

        Alert.alert(
          "Unable to Load Home",
          error?.message ||
            "Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  // =====================================================
  // GREETING
  // =====================================================

  const getGreeting = () => {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return "Good Morning,";
    }

    if (hour < 17) {
      return "Good Afternoon,";
    }

    return "Good Evening,";
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = () => {
    const query =
      searchText.trim();

    if (!query) {
      return;
    }

    rootNavigation?.navigate(
      "SearchResults",
      {
        query,
      }
    );
  };

  // =====================================================
  // NAVIGATION
  // =====================================================

  const openSearchBooks = () => {
    rootNavigation?.navigate(
      "BookCatalogue"
    );
  };

  const openSeatBooking = () => {
    rootNavigation?.navigate(
      "SpaceReservation"
    );
  };

  const openReservations = () => {
    rootNavigation?.navigate(
      "MyBookReservations"
    );
  };

  const openSeatBookings = () => {
    rootNavigation?.navigate(
      "MyStudyRoomBookings"
    );
  };

  const openBorrowedBooks = () => {
    rootNavigation?.navigate(
      "BorrowedBooks"
    );
  };

  const openNotifications = () => {
    navigation.navigate(
      "Notifications"
    );
  };

  const openProfile = () => {
    navigation.navigate(
      "Profile"
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text
          style={styles.loadingText}
        >
          Loading library...
        </Text>
      </View>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.primary
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={
              COLORS.primary
            }
          />
        }
      >
        {/* =================================================
            BLUE HEADER
        ================================================= */}

        <View style={styles.header}>
          <View
            style={
              styles.headerTopRow
            }
          >
            {/* PROFILE + NAME */}

            <TouchableOpacity
              style={
                styles.profileSection
              }
              onPress={openProfile}
              activeOpacity={0.8}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{
                    uri: profile.avatar_url,
                  }}
                  style={
                    styles.profileImage
                  }
                />
              ) : (
                <View
                  style={
                    styles.profilePlaceholder
                  }
                >
                  <Ionicons
                    name="person"
                    size={20}
                    color={
                      COLORS.primary
                    }
                  />
                </View>
              )}

              <View
                style={
                  styles.greetingContainer
                }
              >
                <Text
                  style={
                    styles.greetingText
                  }
                >
                  {getGreeting()}
                </Text>

                <Text
                  style={
                    styles.userName
                  }
                  numberOfLines={1}
                >
                  {profile?.first_name ||
                    "User"}{" "}
                  {profile?.last_name ||
                    ""}
                </Text>
              </View>
            </TouchableOpacity>

            {/* NOTIFICATION ICON */}

            <TouchableOpacity
              style={
                styles.notificationButton
              }
              onPress={
                openNotifications
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={
                  COLORS.primary
                }
              />

              {unreadNotifications >
                0 && (
                <View
                  style={
                    styles.notificationBadge
                  }
                >
                  <Text
                    style={
                      styles.notificationBadgeText
                    }
                  >
                    {unreadNotifications >
                    9
                      ? "9+"
                      : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* SEARCH BAR */}

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
              placeholder="Search for books, authors, or topics..."
              placeholderTextColor="#8E99AB"
              style={
                styles.searchInput
              }
              returnKeyType="search"
              onSubmitEditing={
                handleSearch
              }
            />
          </View>
        </View>

        {/* =================================================
            MAIN BODY
        ================================================= */}

        <View style={styles.content}>
          {/* TOP ACTION CARDS */}

          <View
            style={
              styles.actionRow
            }
          >
            {/* SEARCH BOOKS */}

            <TouchableOpacity
              style={[
                styles.actionCard,
                styles.searchCard,
              ]}
              onPress={
                openSearchBooks
              }
              activeOpacity={0.85}
            >
              <Image
                source={require(
                  "../../assets/images/search-books.png"
                )}
                style={
                  styles.actionImage
                }
                resizeMode="contain"
              />

              <Text
                style={
                  styles.actionCardText
                }
              >
                Search Books
              </Text>
            </TouchableOpacity>

            {/* RESERVE SEAT */}

            <TouchableOpacity
              style={[
                styles.actionCard,
                styles.reserveCard,
              ]}
              onPress={
                openSeatBooking
              }
              activeOpacity={0.85}
            >
              <Image
                source={require(
                  "../../assets/images/reserve-seat.png"
                )}
                style={
                  styles.actionImage
                }
                resizeMode="contain"
              />

              <Text
                style={
                  styles.actionCardText
                }
              >
                Reserve a Seat
              </Text>
            </TouchableOpacity>
          </View>

          {/* =================================================
              MENU LIST
          ================================================= */}

          <View
            style={
              styles.menuContainer
            }
          >
            <HomeMenuItem
              icon="calendar-outline"
              title="My Reservations"
              subtitle="View your book reservations"
              onPress={
                openReservations
              }
            />

            <HomeMenuItem
              icon="desktop-outline"
              title="My Seat Bookings"
              subtitle="View your seat bookings"
              onPress={
                openSeatBookings
              }
            />

            <HomeMenuItem
              icon="book-outline"
              title="Borrowed Books"
              subtitle="Check due dates"
              onPress={
                openBorrowedBooks
              }
            />

            <HomeMenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Check latest updates"
              onPress={
                openNotifications
              }
              isLast
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================================================
// HOME MENU ITEM
// =========================================================

type HomeMenuItemProps = {
  icon:
    | "calendar-outline"
    | "desktop-outline"
    | "book-outline"
    | "notifications-outline";

  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
};

function HomeMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  isLast = false,
}: HomeMenuItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        isLast &&
          styles.lastMenuItem,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={
          styles.menuIconContainer
        }
      >
        <Ionicons
          name={icon}
          size={20}
          color={COLORS.primary}
        />
      </View>

      <View
        style={
          styles.menuTextContainer
        }
      >
        <Text
          style={
            styles.menuTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.menuSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#0B67D1"
      />
    </TouchableOpacity>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      COLORS.primary,
  },

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor:
      COLORS.background,
  },

  // =====================================================
  // LOADING
  // =====================================================

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  // =====================================================
  // HEADER
  // =====================================================

  header: {
    backgroundColor:
      COLORS.primary,

    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 20,
  },

  profileSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,

    borderWidth: 2,
    borderColor:
      COLORS.white,
  },

  profilePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor:
      COLORS.white,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 2,
    borderColor: "#E6EDF7",
  },

  greetingContainer: {
    marginLeft: 10,
    flex: 1,
  },

  greetingText: {
    fontSize: 11,
    color: "#E7EEFA",
    marginBottom: 2,
  },

  userName: {
    fontSize: 17,
    fontWeight: "700",
    color:
      COLORS.white,
  },

  // =====================================================
  // NOTIFICATION
  // =====================================================

  notificationButton: {
    width: 39,
    height: 39,

    borderRadius: 20,

    backgroundColor:
      COLORS.white,

    alignItems: "center",
    justifyContent: "center",

    position: "relative",
  },

  notificationBadge: {
    position: "absolute",

    top: -5,
    right: -4,

    minWidth: 17,
    height: 17,

    borderRadius: 9,

    paddingHorizontal: 4,

    backgroundColor:
      COLORS.secondary,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1.5,
    borderColor:
      COLORS.white,
  },

  notificationBadgeText: {
    color:
      COLORS.white,

    fontSize: 9,
    fontWeight: "700",
  },

  // =====================================================
  // SEARCH
  // =====================================================

  searchContainer: {
    height: 50,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor:
      COLORS.white,

    borderRadius: 10,

    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,

    marginLeft: 9,

    fontSize: 12,

    color:
      COLORS.textPrimary,
  },

  // =====================================================
  // CONTENT
  // =====================================================

  content: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 35,
  },

  // =====================================================
  // ACTION CARDS
  // =====================================================

  actionRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",

    marginBottom: 22,
  },

  actionCard: {
    width: "48%",

    height: 125,

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 10,
  },

  searchCard: {
    backgroundColor:
      "#0B67D1",
  },

  reserveCard: {
    backgroundColor:
      COLORS.secondary,
  },

  actionImage: {
    width: 65,
    height: 65,

    marginBottom: 8,
  },

  actionCardText: {
    color:
      COLORS.white,

    fontSize: 14,
    fontWeight: "700",
  },

  // =====================================================
  // MENU
  // =====================================================

  menuContainer: {
    width: "100%",
  },

  menuItem: {
    minHeight: 63,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor:
      COLORS.white,

    borderWidth: 1,
    borderColor:
      "#D9E3F0",

    borderRadius: 10,

    paddingHorizontal: 12,

    marginBottom: 9,
  },

  lastMenuItem: {
    marginBottom: 0,
  },

  menuIconContainer: {
    width: 36,
    height: 36,

    borderRadius: 18,

    backgroundColor:
      "#EFF5FC",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 11,
  },

  menuTextContainer: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 13,
    fontWeight: "700",

    color:
      COLORS.primary,

    marginBottom: 3,
  },

  menuSubtitle: {
    fontSize: 10,

    color:
      COLORS.textSecondary,
  },
});