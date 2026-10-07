import React from "react";

import {
  Platform,
  StyleSheet,
  View,
} from "react-native";

import {
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  BottomTabParamList,
  RootStackParamList,
} from "./types";

import {
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import { COLORS } from "../constants/colors";

// =========================================================
// MEMBER 1
// =========================================================

import HomeScreen from "../screens/home/HomeScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

// =========================================================
// MEMBER 2
// =========================================================

import BookCatalogueScreen from "../screens/books/bookCatalogueScreen";;

// =========================================================
// MEMBER 3
// =========================================================

import StudyRoomsScreen from "../screens/spaces/StudyRoomsScreen";

const Tab =
  createBottomTabNavigator<BottomTabParamList>();

type TabName =
  keyof BottomTabParamList;

type IconName =
  React.ComponentProps<
    typeof Ionicons
  >["name"];

type RootNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

// =========================================================
// ICONS
// =========================================================

const getTabIcon = (
  routeName: TabName,
  focused: boolean
): IconName => {
  switch (routeName) {
    case "Home":
      return focused
        ? "home"
        : "home-outline";

    case "Books":
      return focused
        ? "book"
        : "book-outline";

    case "Spaces":
      return focused
        ? "desktop"
        : "desktop-outline";

    case "Notifications":
      return focused
        ? "notifications"
        : "notifications-outline";

    case "Profile":
      return focused
        ? "person"
        : "person-outline";

    default:
      return "ellipse-outline";
  }
};

// =========================================================
// BOTTOM TAB NAVIGATOR
// =========================================================

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor:
          COLORS.secondary,

        tabBarInactiveTintColor:
          "#0B67C8",

        // ===============================================
        // ICON
        // ===============================================

        tabBarIcon: ({
          focused,
          color,
        }) => {
          const iconName =
            getTabIcon(
              route.name,
              focused
            );

          return (
            <View
              style={[
                styles.iconWrapper,

                focused &&
                  styles.activeIconWrapper,
              ]}
            >
              <Ionicons
                name={iconName}
                size={
                  focused ? 23 : 22
                }
                color={color}
              />
            </View>
          );
        },

        // ===============================================
        // LABEL
        // ===============================================

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",

          marginTop:
            Platform.OS === "ios"
              ? -2
              : 1,

          marginBottom:
            Platform.OS === "ios"
              ? 3
              : 5,
        },

        // ===============================================
        // TAB ITEM
        // ===============================================

        tabBarItemStyle: {
          paddingTop: 7,
        },

        // ===============================================
        // MAIN NAV BAR
        // ===============================================

        tabBarStyle: {
          height:
            Platform.OS === "ios"
              ? 82
              : 72,

          backgroundColor:
            COLORS.white,

          borderTopWidth: 0,

          paddingHorizontal: 8,

          paddingTop: 4,

          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,

          // Shadow - iOS
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.08,
          shadowRadius: 10,

          // Shadow - Android
          elevation: 12,
        },
      })}
    >
      {/* =================================================
          HOME - MEMBER 1
      ================================================= */}

      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
        }}
      />

      {/* =================================================
          BOOKS - MEMBER 2
      ================================================= */}

      <Tab.Screen
        name="Books"
        component={BookCatalogueScreen}
        options={{
          tabBarLabel: "Books",
        }}
      />

      {/* =================================================
          STUDY SPACES - MEMBER 3
      ================================================= */}

      <Tab.Screen
        name="Spaces"
        component={StudyRoomsScreen}
        options={{
          tabBarLabel: "Seats",
        }}
      />

      {/* =================================================
          NOTIFICATIONS - MEMBER 1
      ================================================= */}

      <Tab.Screen
        name="Notifications"
        component={
          NotificationsScreen
        }
        options={{
          tabBarLabel:
            "Notifications",
        }}
      />

      {/* =================================================
          PROFILE - MEMBER 1
      ================================================= */}

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({
    iconWrapper: {
      width: 40,
      height: 31,

      borderRadius: 16,

      alignItems: "center",
      justifyContent: "center",
    },

    activeIconWrapper: {
      backgroundColor:
        "#FFF0E6",
    },
  });