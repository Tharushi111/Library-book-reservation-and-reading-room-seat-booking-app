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

  // Refresh profile every time user returns from Account Settings
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
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  // =====================================================
  // DISPLAY VALUES
  // =====================================================

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

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.navigate(
                "Home"
              )
            }
          >
            <Ionicons
              name="chevron-back"
              size={25}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            My Profile
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        {/* =================================================
            PROFILE INFO
        ================================================= */}

        <View
          style={styles.profileSection}
        >
          <View
            style={
              styles.avatarOuter
            }
          >
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
                  size={42}
                  color={
                    COLORS.primary
                  }
                />
              </View>
            )}
          </View>

          <Text
            style={styles.nameText}
          >
            {displayName}
          </Text>

          <Text
            style={
              styles.studentIdText
            }
          >
            {identification}
          </Text>

          <Text
            style={styles.emailText}
          >
            {profile?.email ||
              "No email"}
          </Text>
        </View>

        {/* =================================================
            MENU
        ================================================= */}

        <View
          style={styles.menuSection}
        >
          <ProfileMenuItem
            icon="person-outline"
            title="Edit Profile"
            onPress={
              openAccountSettings
            }
          />

          <ProfileMenuItem
            icon="lock-closed-outline"
            title="Change Password"
            onPress={
              handleChangePassword
            }
          />

          <ProfileMenuItem
            icon="notifications-outline"
            title="Notification Settings"
            onPress={
              handleNotificationSettings
            }
          />

          <ProfileMenuItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={
              handleHelpSupport
            }
          />

          <ProfileMenuItem
            icon="information-circle-outline"
            title="About App"
            onPress={handleAbout}
          />
        </View>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.logoutText
            }
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================================================
// PROFILE MENU ITEM
// =========================================================

type MenuProps = {
  icon:
    | "person-outline"
    | "lock-closed-outline"
    | "notifications-outline"
    | "help-circle-outline"
    | "information-circle-outline";

  title: string;
  onPress: () => void;
};

function ProfileMenuItem({
  icon,
  title,
  onPress,
}: MenuProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={
          styles.menuLeft
        }
      >
        <View
          style={
            styles.menuIconContainer
          }
        >
          <Ionicons
            name={icon}
            size={19}
            color={
              COLORS.primary
            }
          />
        </View>

        <Text
          style={styles.menuText}
        >
          {title}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
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
      COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,

    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 35,
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
    height: 55,

    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
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

    color:
      COLORS.primary,
  },

  headerSpacer: {
    width: 38,
  },

  // =====================================================
  // PROFILE
  // =====================================================

  profileSection: {
    alignItems: "center",

    marginTop: 13,
    marginBottom: 37,
  },

  avatarOuter: {
    width: 84,
    height: 84,

    borderRadius: 42,

    backgroundColor:
      "#FFF0E5",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 15,
  },

  avatar: {
    width: 72,
    height: 72,

    borderRadius: 36,
  },

  avatarPlaceholder: {
    width: 72,
    height: 72,

    borderRadius: 36,

    backgroundColor:
      COLORS.white,

    alignItems: "center",
    justifyContent: "center",
  },

  nameText: {
    fontSize: 19,
    fontWeight: "700",

    color:
      COLORS.primary,

    marginBottom: 5,
  },

  studentIdText: {
    fontSize: 12,

    color:
      COLORS.textSecondary,

    marginBottom: 4,
  },

  emailText: {
    fontSize: 11,

    color: "#8B96A8",
  },

  // =====================================================
  // MENU
  // =====================================================

  menuSection: {
    width: "100%",
  },

  menuItem: {
    minHeight: 56,

    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",

    backgroundColor:
      COLORS.white,

    borderWidth: 1,
    borderColor:
      "#D7E2F0",

    borderRadius: 9,

    paddingHorizontal: 11,

    marginBottom: 10,
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuIconContainer: {
    width: 30,
    height: 30,

    borderRadius: 15,

    backgroundColor:
      "#F0F6FD",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  menuText: {
    fontSize: 12.5,
    fontWeight: "600",

    color:
      COLORS.primary,
  },

  // =====================================================
  // LOGOUT
  // =====================================================

  logoutButton: {
    height: 52,

    backgroundColor:
      "#FFF0E6",

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 10,
  },

  logoutText: {
    fontSize: 13,
    fontWeight: "700",

    color:
      COLORS.secondary,
  },
});