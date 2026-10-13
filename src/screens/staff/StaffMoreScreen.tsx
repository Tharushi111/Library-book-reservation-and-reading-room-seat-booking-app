import React from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import { RootStackParamList } from "../../navigation/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  onPress: () => void;
  show?: boolean;
  badge?: string;
}

export const StaffMoreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, role, isAdmin, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of the SLIIT Library staff portal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error: any) {
            Alert.alert("Error", error?.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  const handleSwitchToStudent = () => {
    navigation.navigate("MainTabs");
  };

  const menuSections: { title: string; items: MenuOption[] }[] = [
    {
      title: "Library Operations",
      items: [
        {
          id: "rooms",
          title: "Study & Conference Rooms",
          subtitle: "Manage room capacity, bookings & schedules",
          icon: "business-outline",
          color: "#0B4DA2",
          bgColor: "#EFF6FF",
          onPress: () => navigation.navigate("StaffRoomManagement"),
        },
        {
          id: "announcements",
          title: "Library Announcements",
          subtitle: "Publish news, updates & library notices",
          icon: "megaphone-outline",
          color: "#D97706",
          bgColor: "#FFFBEB",
          onPress: () => navigation.navigate("StaffAnnouncement"),
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          id: "admin-users",
          title: "User Management",
          subtitle: "View students, assign staff/admin roles",
          icon: "people-outline",
          color: "#7C3AED",
          bgColor: "#F5F3FF",
          badge: "Admin Only",
          show: isAdmin,
          onPress: () => navigation.navigate("AdminUserManagement"),
        },
      ],
    },
    {
      title: "Application",
      items: [
        {
          id: "student-portal",
          title: "Switch to Student Portal",
          subtitle: "Browse catalog and reservations as a student",
          icon: "swap-horizontal-outline",
          color: "#0284C7",
          bgColor: "#F0F9FF",
          onPress: handleSwitchToStudent,
        },
      ],
    },
    {
      title: "Account & Security",
      items: [
        {
          id: "reset-password",
          title: "Update Password",
          subtitle: "Change your portal account password",
          icon: "key-outline",
          color: "#4B5563",
          bgColor: "#F3F4F6",
          onPress: () => navigation.navigate("ResetPassword"),
        },
        {
          id: "sign-out",
          title: "Sign Out",
          subtitle: "Safely end your current session",
          icon: "log-out-outline",
          color: "#DC2626",
          bgColor: "#FEF2F2",
          onPress: handleSignOut,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Settings & More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {(() => {
          const staffDisplayName =
            profile?.fullName ||
            [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
            user?.email ||
            "Library Staff";

          return (
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {staffDisplayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {staffDisplayName}
                  </Text>
              <View
                style={[
                  styles.roleBadge,
                  isAdmin ? styles.adminBadge : styles.staffBadge,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    isAdmin ? styles.adminBadgeText : styles.staffBadgeText,
                  ]}
                >
                  {isAdmin ? "Admin" : "Staff"}
                </Text>
              </View>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || "staff@sliit.lk"}
            </Text>
            {profile?.studentId ? (
              <Text style={styles.studentIdText}>ID: {profile.studentId}</Text>
            ) : null}
          </View>
        </View>
        );
      })()}

        {/* Menu Sections */}
        {menuSections.map((section) => {
          const visibleItems = section.items.filter((item) => item.show !== false);
          if (visibleItems.length === 0) return null;

          return (
            <View key={section.title} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {visibleItems.map((item, index) => {
                  const isLast = index === visibleItems.length - 1;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
                      onPress={item.onPress}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: item.bgColor }]}>
                        <Ionicons name={item.icon} size={22} color={item.color} />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <View style={styles.menuTitleRow}>
                          <Text style={styles.menuTitle}>{item.title}</Text>
                          {item.badge ? (
                            <View style={styles.itemBadge}>
                              <Text style={styles.itemBadgeText}>{item.badge}</Text>
                            </View>
                          ) : null}
                        </View>
                        {item.subtitle ? (
                          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* System Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SLIIT Library Management System</Text>
          <Text style={styles.footerSubText}>Version 1.0.0 (Expo & Supabase)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 8,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  staffBadge: {
    backgroundColor: "#EFF6FF",
  },
  adminBadge: {
    backgroundColor: "#F5F3FF",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  staffBadgeText: {
    color: "#0B4DA2",
  },
  adminBadgeText: {
    color: "#7C3AED",
  },
  userEmail: {
    fontSize: 13,
    color: "#64748B",
  },
  studentIdText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  itemBadge: {
    marginLeft: 8,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6D28D9",
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  footerSubText: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 2,
  },
});

export default StaffMoreScreen;
