import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { supabase } from "../../services/supabase";
import { COLORS } from "../../constants/colors";
import type { BottomTabParamList, RootStackParamList } from "../../navigation/types";

type Props = BottomTabScreenProps<BottomTabParamList, "Home">;

type ProfileData = {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: "student" | "staff";
};

const UI = {
  blue: COLORS.primary,
  orange: COLORS.secondary,
  page: "#F8FAFD",
  white: "#FFFFFF",
  ink: "#13213D",
  muted: "#738198",
  line: "#E7ECF3",
  paleBlue: "#EBF5FF",
  paleOrange: "#FFF0E7",
  paleGreen: "#E8F8EE",
  palePurple: "#F1ECFF",
};

type LibraryRowProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  onPress: () => void;
  last?: boolean;
};

function LibraryRow({
  title,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  onPress,
  last = false,
}: LibraryRowProps) {
  return (
    <TouchableOpacity
      style={[styles.libraryRow, last && styles.lastLibraryRow]}
      onPress={onPress}
      activeOpacity={0.76}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.libraryIconBox, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.libraryRowText}>
        <Text style={styles.libraryRowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.libraryRowSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8492A7" />
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  // Keep the existing Supabase profile and unread-notification logic.
  const loadHomeData = useCallback(async () => {
    try {
      setLoadError(false);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No active user session.");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url, role")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData as ProfileData);

      const { count, error: notificationError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (notificationError) throw notificationError;
      setUnreadNotifications(count ?? 0);
    } catch (error) {
      console.error("Home screen error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  // Preserve every navigation destination from the original Home screen.
  const openSearchBooks = () => rootNavigation?.navigate("BookSearch");
  const openSeatBooking = () => rootNavigation?.navigate("SpaceReservation");
  const openReservations = () => rootNavigation?.navigate("MyBookReservations");
  const openSeatBookings = () => rootNavigation?.navigate("MyStudyRoomBookings");
  const openBorrowedBooks = () => rootNavigation?.navigate("BorrowedBooks");
  const openNotifications = () => navigation.navigate("Notifications");
  const openProfile = () => navigation.navigate("Profile");

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning," : hour < 17 ? "Good Afternoon," : "Good Evening,";
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Library User";

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor={UI.page} />
        <ActivityIndicator size="large" color={UI.blue} />
        <Text style={styles.loadingText}>Loading library...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={UI.blue} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadHomeData();
            }}
            tintColor={UI.blue}
            colors={[UI.blue]}
          />
        }
      >
        {/* Compact blue header: greeting + bell + search, no extra text */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={openProfile}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={21} color={UI.blue} />
                </View>
              )}
              <View style={styles.greetingBlock}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bellButton}
              onPress={openNotifications}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={23} color={UI.blue} />
              {unreadNotifications > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.searchBar}
            onPress={openSearchBooks}
            activeOpacity={0.87}
            accessibilityRole="button"
            accessibilityLabel="Search books, authors or topics"
          >
            <Ionicons name="search-outline" size={21} color="#8594A8" />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              Search for books, authors, or topics...
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {loadError && (
            <TouchableOpacity
              style={styles.connectionNotice}
              activeOpacity={0.8}
              onPress={() => {
                setRefreshing(true);
                loadHomeData();
              }}
            >
              <Ionicons name="cloud-offline-outline" size={18} color="#A3651F" />
              <Text style={styles.connectionText}>
                Couldn't connect to the library. Tap to retry.
              </Text>
              <Ionicons name="refresh-outline" size={17} color="#A3651F" />
            </TouchableOpacity>
          )}

          {/* Two soft, illustrated feature cards matching the reference */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionCard, styles.booksCard]}
              onPress={openSearchBooks}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Search Books"
            >
              <View style={[styles.cardDecor, styles.blueDecor]} />
              <View style={[styles.featureIcon, styles.featureIconBlue]}>
                <Ionicons name="book-outline" size={27} color={UI.white} />
              </View>
              <Image
                source={require("../../assets/images/search-books.png")}
                style={styles.featureIllustration}
                resizeMode="contain"
              />
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>Search Books</Text>
                <Text style={styles.featureSubtitle}>
                  Find and explore library books
                </Text>
              </View>
              <View style={styles.featureArrow}>
                <Ionicons name="arrow-forward" size={19} color={UI.blue} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.seatsCard]}
              onPress={openSeatBooking}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Reserve a Seat"
            >
              <View style={[styles.cardDecor, styles.orangeDecor]} />
              <View style={[styles.featureIcon, styles.featureIconOrange]}>
                <Ionicons name="desktop-outline" size={27} color={UI.white} />
              </View>
              <Image
                source={require("../../assets/images/reserve-seat.png")}
                style={styles.featureIllustration}
                resizeMode="contain"
              />
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>Reserve a Seat</Text>
                <Text style={styles.featureSubtitle}>
                  Book study rooms and seats
                </Text>
              </View>
              <View style={styles.featureArrow}>
                <Ionicons name="arrow-forward" size={19} color={UI.orange} />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>My Library</Text>
          {/* Keep all four options in the original vertical list format. */}
          <View style={styles.libraryPanel}>
            <LibraryRow
              title="My Reservations"
              subtitle="View your book reservations and waiting list"
              icon="bookmark-outline"
              iconColor="#176BD1"
              iconBackground={UI.paleBlue}
              onPress={openReservations}
            />
            <LibraryRow
              title="My Seat Bookings"
              subtitle="View your study room and seat bookings"
              icon="calendar-outline"
              iconColor="#F0712E"
              iconBackground={UI.paleOrange}
              onPress={openSeatBookings}
            />
            <LibraryRow
              title="Borrowed Books"
              subtitle="Check your current loans and due dates"
              icon="book-outline"
              iconColor="#149E65"
              iconBackground={UI.paleGreen}
              onPress={openBorrowedBooks}
            />
            <LibraryRow
              title="Notifications"
              subtitle="View latest updates and reminders"
              icon="notifications-outline"
              iconColor="#6946C9"
              iconBackground={UI.palePurple}
              onPress={openNotifications}
              last
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: UI.blue },
  scrollView: { flex: 1, backgroundColor: UI.page },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  loadingContainer: {
    flex: 1,
    backgroundColor: UI.page,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 13, color: UI.muted },

  header: {
    backgroundColor: UI.blue,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  profileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: UI.white,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.white,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingBlock: { flex: 1, marginLeft: 10 },
  greeting: { color: "#D8E9FF", fontSize: 12, marginBottom: 3 },
  profileName: {
    color: UI.white,
    fontSize: 16,
    fontWeight: "800",
  },
  bellButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: UI.white,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 3,
    borderRadius: 10,
    backgroundColor: UI.orange,
    borderWidth: 2,
    borderColor: UI.white,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { color: UI.white, fontSize: 9, fontWeight: "800" },
  searchBar: {
    height: 48,
    borderRadius: 11,
    backgroundColor: UI.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 10,
    color: "#8B99AC",
    fontSize: 12,
  },

  body: { paddingHorizontal: 18, paddingTop: 18 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionCard: {
    flex: 1,
    height: 190,
    borderRadius: 19,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#173D68",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  booksCard: {
    backgroundColor: "#EEF7FF",
    borderColor: "#DCEBFC",
  },
  seatsCard: {
    backgroundColor: "#FFF1E9",
    borderColor: "#FFDECD",
  },
  cardDecor: {
    position: "absolute",
    width: 155,
    height: 155,
    borderRadius: 80,
    right: -65,
    top: -26,
  },
  blueDecor: { backgroundColor: "#DFEFFF" },
  orangeDecor: { backgroundColor: "#FFE3D4" },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  featureIconBlue: { backgroundColor: "#0867D8" },
  featureIconOrange: { backgroundColor: "#FF722D" },
  featureIllustration: {
    position: "absolute",
    right: -9,
    top: 28,
    width: 94,
    height: 98,
    opacity: 0.92,
  },
  featureCopy: {
    position: "absolute",
    left: 14,
    right: 30,
    bottom: 18,
  },
  featureTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
    color: UI.ink,
    letterSpacing: -0.3,
  },
  featureSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    color: "#61728B",
    marginTop: 5,
    maxWidth: 120,
  },
  featureArrow: {
    position: "absolute",
    right: 11,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: UI.white,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 14,
    color: UI.ink,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  libraryPanel: {
    backgroundColor: UI.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0F2F7",
    paddingHorizontal: 15,
    shadowColor: "#183153",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  libraryRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 81,
    borderBottomWidth: 1,
    borderBottomColor: UI.line,
  },
  lastLibraryRow: { borderBottomWidth: 0 },
  libraryIconBox: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  libraryRowText: { flex: 1, paddingRight: 8 },
  libraryRowTitle: {
    color: UI.ink,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  libraryRowSubtitle: {
    color: UI.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  connectionNotice: {
    backgroundColor: "#FFF6E9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },
  connectionText: { flex: 1, color: "#956023", fontSize: 11 },
});
