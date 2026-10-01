import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import PlaceholderScreen from "../screens/PlaceholderScreen";
import { BottomTabParamList } from "./types";
import HomeScreen from "../screens/home/HomeScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import BookSearchScreen from "../screens/books/BookSearchScreen";

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />

      <Tab.Screen name="Books">
        {() => <PlaceholderScreen title="Books" />}
      </Tab.Screen>

      <Tab.Screen name="Spaces">
        {() => <PlaceholderScreen title="Study Spaces" />}
      </Tab.Screen>

      <Tab.Screen name="Notifications">
        {() => <PlaceholderScreen title="Notifications" />}
      </Tab.Screen>

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}