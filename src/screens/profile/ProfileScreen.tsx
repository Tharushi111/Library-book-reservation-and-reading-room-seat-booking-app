import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
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
  "Profile"
>;

type ProfileData = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  student_id: string | null;
  phone_number: string | null;
  role: "student" | "staff";
  avatar_url: string | null;
};

export default function ProfileScreen({
  navigation,
}: Props) {
  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const rootNavigation =
    navigation.getParent<
      NativeStackNavigationProp<RootStackParamList>
    >();

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  const loadProfile = useCallback(
    async () => {
      try {
        setLoading(true);

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

          rootNavigation?.reset({
            index: 0,
            routes: [
              {
                name: "Login",
              },
            ],
          });

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(
            `
            id,
            first_name,
            last_name,
            email,
            student_id,
            phone_number,
            role,
            avatar_url
            `
          )
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(
          data as ProfileData
        );
      } catch (error: any) {
        console.error(
          "Profile error:",
          error
        );

        Alert.alert(
          "Unable to Load Profile",
          error?.message ||
            "Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [rootNavigation]
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",

          onPress: async () => {
            try {
              const { error } =
                await supabase.auth.signOut();

              if (error) {
                throw error;
              }

              rootNavigation?.reset({
                index: 0,
                routes: [
                  {
                    name: "Login",
                  },
                ],
              });
            } catch (error: any) {
              Alert.alert(
                "Logout Failed",
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
  // NAVIGATION
  // =====================================================

  const openAccountSettings = () => {
    rootNavigation?.navigate(
      "AccountSettings"
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      "Change Password",
      "Password change functionality will be implemented next."
    );
  };

  const handleNotificationSettings = () => {
    navigation.navigate(
      "Notifications"
    );
  };

  const handleHelpSupport = () => {
    Alert.alert(
      "Help & Support",
      "For library assistance, please contact the SLIIT Library support team."
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About App",
      "SLIIT Library mobile application for book reservations and study-space bookings."
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.primary}
        />

        <ActivityIndicator
          size="large"
          color={COLORS.white}
        />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  const fullName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const displayName =
    fullName || "Library User";

  const identification =
    profile?.role === "staff"
      ? "Academic Staff"
      : profile?.student_id ||
        "Student";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />

      <View style={styles.container}>
        {/* =================================================
            BLUE HEADER
        ================================================= */}

        <View style={styles.topSection}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.navigate("Home")
              }
            >
              <Ionicons
                name="chevron-back"
                size={26}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              My Profile
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* PROFILE IMAGE */}

          <View style={styles.profileSection}>
            <View style={styles.avatarOuter}>
              {profile?.avatar_url ? (
                <Image
                  source={{
                    uri: profile.avatar_url,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={
                    styles.avatarPlaceholder
                  }
                >
                  <Ionicons
                    name="person"
                    size={44}
                    color={COLORS.primary}
                  />
                </View>
              )}
            </View>

            <Text style={styles.nameText}>
              {displayName}
            </Text>

            <Text style={styles.studentIdText}>
              {identification}
            </Text>

            <Text style={styles.emailText}>
              {profile?.email ||
                "No email"}
            </Text>
          </View>
        </View>

        {/* =================================================
            WHITE CONTENT
        ================================================= */}

        <ScrollView
          style={styles.body}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.menuSection}>
            <ProfileMenuItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={openAccountSettings}
            />

            <ProfileMenuItem
              icon="lock-closed-outline"
              title="Change Password"
              subtitle="Update your account password"
              onPress={handleChangePassword}
            />

            <ProfileMenuItem
              icon="notifications-outline"
              title="Notification Settings"
              subtitle="Manage notification preferences"
              onPress={
                handleNotificationSettings
              }
            />

            <ProfileMenuItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get assistance"
              onPress={handleHelpSupport}
            />

            <ProfileMenuItem
              icon="information-circle-outline"
              title="About App"
              subtitle="Learn more about SLIIT Library"
              onPress={handleAbout}
            />
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={COLORS.secondary}
            />

            <Text style={styles.logoutText}>
              Logout
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// =========================================================
// MENU ITEM
// =========================================================

type MenuProps = {
  icon:
    | "person-outline"
    | "lock-closed-outline"
    | "notifications-outline"
    | "help-circle-outline"
    | "information-circle-outline";

  title: string;
  subtitle: string;
  onPress: () => void;
};

function ProfileMenuItem({
  icon,
  title,
  subtitle,
  onPress,
}: MenuProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.menuLeft}>
        <View
          style={styles.menuIconContainer}
        >
          <Ionicons
            name={icon}
            size={20}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.menuTextArea}>
          <Text style={styles.menuText}>
            {title}
          </Text>

          <Text
            style={styles.menuSubtitle}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
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
    backgroundColor: COLORS.primary,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // LOADING

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.white,
  },

  // BLUE HEADER

  topSection: {
    backgroundColor: COLORS.primary,
    paddingBottom: 26,
  },

  header: {
    height: 55,
    paddingHorizontal: 20,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 38,
    height: 38,

    alignItems: "flex-start",
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

  // PROFILE INFORMATION

  profileSection: {
    alignItems: "center",
    paddingTop: 8,
  },

  avatarOuter: {
    width: 94,
    height: 94,
    borderRadius: 47,

    backgroundColor: "#FFF0E6",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 3,
    borderColor: COLORS.white,

    marginBottom: 12,
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },

  avatarPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 41,

    backgroundColor: COLORS.white,

    alignItems: "center",
    justifyContent: "center",
  },

  nameText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 4,
  },

  studentIdText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#DDE8F7",
    marginBottom: 3,
  },

  emailText: {
    fontSize: 11,
    color: "#C5D6EB",
  },

  // BODY

  body: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 35,
  },

  // MENU

  menuSection: {
    width: "100%",
  },

  menuItem: {
    minHeight: 66,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: "#D7E2F0",

    borderRadius: 11,

    paddingHorizontal: 12,

    marginBottom: 10,
  },

  menuLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  menuIconContainer: {
    width: 38,
    height: 38,

    borderRadius: 19,

    backgroundColor: "#EFF5FC",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 11,
  },

  menuTextArea: {
    flex: 1,
  },

  menuText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },

  menuSubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  // LOGOUT

  logoutButton: {
    height: 54,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFF0E6",

    borderRadius: 10,

    marginTop: 10,
  },

  logoutText: {
    marginLeft: 7,

    fontSize: 14,
    fontWeight: "700",

    color: COLORS.secondary,
  },
});