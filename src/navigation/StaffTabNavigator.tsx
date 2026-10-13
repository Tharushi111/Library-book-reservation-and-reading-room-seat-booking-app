import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StaffTabParamList } from "./types";
import { COLORS } from "../constants/colors";

// Staff Screens
import StaffDashboardScreen from "../screens/staff/StaffDashboardScreen";
import StaffBookListScreen from "../screens/staff/StaffBookListScreen";
import StaffReservationManagementScreen from "../screens/staff/StaffReservationManagementScreen";
import StaffLoanManagementScreen from "../screens/staff/StaffLoanManagementScreen";
import StaffMoreScreen from "../screens/staff/StaffMoreScreen";

const Tab = createBottomTabNavigator<StaffTabParamList>();

type TabName = keyof StaffTabParamList;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const getTabIcon = (routeName: TabName, focused: boolean): IconName => {
  switch (routeName) {
    case "StaffDashboard":
      return focused ? "grid" : "grid-outline";
    case "StaffBooks":
      return focused ? "book" : "book-outline";
    case "StaffReservations":
      return focused ? "bookmark" : "bookmark-outline";
    case "StaffLoans":
      return focused ? "swap-horizontal" : "swap-horizontal-outline";
    case "StaffMore":
      return focused ? "ellipsis-horizontal-circle" : "ellipsis-horizontal-circle-outline";
    default:
      return "ellipse-outline";
  }
};

export default function StaffTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="StaffDashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: "#64748B",
        tabBarIcon: ({ focused, color }) => {
          const iconName = getTabIcon(route.name, focused);
          return (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Ionicons name={iconName} size={focused ? 23 : 21} color={color} />
            </View>
          );
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: Platform.OS === "ios" ? -2 : 1,
          marginBottom: Platform.OS === "ios" ? 3 : 5,
        },
        tabBarItemStyle: {
          paddingTop: 7,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 82 : 72,
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          paddingHorizontal: 8,
          paddingTop: 4,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 12,
        },
      })}
    >
      <Tab.Screen
        name="StaffDashboard"
        component={StaffDashboardScreen}
        options={{ tabBarLabel: "Overview" }}
      />
      <Tab.Screen
        name="StaffBooks"
        component={StaffBookListScreen}
        options={{ tabBarLabel: "Books" }}
      />
      <Tab.Screen
        name="StaffReservations"
        component={StaffReservationManagementScreen}
        options={{ tabBarLabel: "Reservations" }}
      />
      <Tab.Screen
        name="StaffLoans"
        component={StaffLoanManagementScreen}
        options={{ tabBarLabel: "Loans" }}
      />
      <Tab.Screen
        name="StaffMore"
        component={StaffMoreScreen}
        options={{ tabBarLabel: "More" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 3,
    paddingBottom: 2,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  activeIconWrapper: {
    backgroundColor: "#EFF6FF",
  },
});
