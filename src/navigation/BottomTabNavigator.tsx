import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import PlaceholderScreen from "../screens/PlaceholderScreen";
import { BottomTabParamList } from "./types";

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home">
        {() => <PlaceholderScreen title="Home" />}
      </Tab.Screen>

      <Tab.Screen name="Books">
        {() => <PlaceholderScreen title="Books" />}
      </Tab.Screen>

      <Tab.Screen name="Spaces">
        {() => <PlaceholderScreen title="Study Spaces" />}
      </Tab.Screen>

      <Tab.Screen name="Notifications">
        {() => <PlaceholderScreen title="Notifications" />}
      </Tab.Screen>

      <Tab.Screen name="Profile">
        {() => <PlaceholderScreen title="Profile" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}