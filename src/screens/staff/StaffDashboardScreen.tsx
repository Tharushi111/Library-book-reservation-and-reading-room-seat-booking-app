import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import {
  getStaffDashboardStats,
  getRecentActivities,
  RecentActivityItem,
} from "../../services/staffService";
import { StaffDashboardStats } from "../../types";

const STATS_CARDS: {
  key: keyof StaffDashboardStats;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}[] = [
  {
    key: "totalBooks",
    label: "Total Books",
    icon: "book",
    color: "#0B4DA2",
    bgColor: "#EFF6FF",
  },
  {
    key: "availableBooks",
    label: "Available Books",
    icon: "checkmark-circle",
    color: "#16A34A",
    bgColor: "#F0FDF4",
  },
  {
    key: "activeReservations",
    label: "Active Reservations",
    icon: "bookmark",
    color: "#F58220",
    bgColor: "#FFF7ED",
  },
  {
    key: "pendingPickups",
    label: "Ready for Pickup",
    icon: "time",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
  },
  {
    key: "activeLoans",
    label: "Active Loans",
    icon: "library",
    color: "#2563EB",
    bgColor: "#EFF6FF",
  },
  {
    key: "overdueLoans",
    label: "Overdue Loans",
    icon: "alert-circle",
    color: "#DC2626",
    bgColor: "#FEF2F2",
  },
  {
    key: "todayRoomBookings",
    label: "Today's Rooms",
    icon: "calendar",
    color: "#0D9488",
    bgColor: "#F0FDFA",
  },
];

export default function StaffDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { profile, role, isAdmin, signOut } = useAuth();

  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        getStaffDashboardStats(),
        getRecentActivities(),
      ]);
      setStats(s);
      setActivities(a);
    } catch (error: any) {
      console.error("Staff dashboard load error:", error);
      Alert.alert("Dashboard Error", error?.message || "Could not load stats.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          navigation.replace("Login");
        },
      },
    ]);
  };

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : "Library Staff";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.profileSection}>
            <View style={styles.avatarBox}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.roleBadgeRow}>
                <View style={[styles.roleBadge, isAdmin && styles.adminRoleBadge]}>
                  <Text style={styles.roleBadgeText}>
                    {isAdmin ? "SYSTEM ADMIN" : "LIBRARY STAFF"}
                  </Text>
                </View>
              </View>
              <Text style={styles.staffName} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.studentViewButton}
              onPress={() => navigation.navigate("MainTabs")}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={16} color={COLORS.white} />
              <Text style={styles.studentViewText}>Student App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>SLIIT Library Management Portal</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading dashboard metrics...</Text>
          </View>
        ) : (
          <>
            {/* Quick Actions Shortcuts */}
            <Text style={styles.sectionTitle}>Quick Management Actions</Text>
            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate("StaffAddEditBook")}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="add-circle" size={24} color="#0B4DA2" />
                </View>
                <Text style={styles.quickCardTitle}>Add Book</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate("StaffIssueLoan")}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconBox, { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="arrow-up-circle" size={24} color="#16A34A" />
                </View>
                <Text style={styles.quickCardTitle}>Issue Loan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate("StaffRoomSchedule")}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconBox, { backgroundColor: "#F0FDFA" }]}>
                  <Ionicons name="calendar" size={24} color="#0D9488" />
                </View>
                <Text style={styles.quickCardTitle}>Room Schedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate("StaffAddEditAnnouncement")}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconBox, { backgroundColor: "#FFF7ED" }]}>
                  <Ionicons name="megaphone" size={24} color="#F58220" />
                </View>
                <Text style={styles.quickCardTitle}>Post Notice</Text>
              </TouchableOpacity>
            </View>

            {/* Metrics Overview Grid */}
            <Text style={styles.sectionTitle}>Library Metrics Overview</Text>
            <View style={styles.statsGrid}>
              {STATS_CARDS.map((card) => {
                const value = stats ? stats[card.key] : 0;
                return (
                  <View
                    key={card.key}
                    style={[styles.statCard, { borderLeftColor: card.color }]}
                  >
                    <View style={[styles.statIconBox, { backgroundColor: card.bgColor }]}>
                      <Ionicons name={card.icon} size={22} color={card.color} />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>{value}</Text>
                      <Text style={styles.statLabel}>{card.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Recent Library Activities */}
            <View style={styles.activityHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Activities</Text>
              <Text style={styles.activityCountText}>{activities.length} entries</Text>
            </View>

            {activities.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Recent Activities</Text>
                <Text style={styles.emptySubtitle}>
                  New reservations, loans, and room bookings will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {activities.map((act) => (
                  <View key={act.id} style={styles.activityRow}>
                    <View
                      style={[
                        styles.activityDot,
                        act.type === "reservation" && { backgroundColor: "#F58220" },
                        act.type === "loan" && { backgroundColor: "#2563EB" },
                        act.type === "return" && { backgroundColor: "#16A34A" },
                        act.type === "room_booking" && { backgroundColor: "#0D9488" },
                      ]}
                    />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{act.title}</Text>
                      <View style={styles.activityMetaRow}>
                        <Text style={styles.activitySubtitle}>{act.subtitle}</Text>
                        <Text style={styles.activityTime}>
                          {new Date(act.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  profileInfo: {
    flex: 1,
  },
  roleBadgeRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  roleBadge: {
    backgroundColor: "#F58220",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminRoleBadge: {
    backgroundColor: "#DC2626",
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "800",
  },
  staffName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  studentViewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  studentViewText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSubtitle: {
    color: "#D8E9FF",
    fontSize: 12,
    marginTop: 8,
  },
  scroll: {
    flex: 1,
    backgroundColor: "#F8FAFD",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loaderCenter: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  activityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activityCountText: {
    fontSize: 12,
    color: "#64748B",
  },
  activityList: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  activityMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  activitySubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  activityTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
});
