import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";

import PlaceholderScreen from "../screens/PlaceholderScreen";
import { BottomTabParamList, RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  const navigation = useNavigation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home">
        {() => <PlaceholderScreen title="Home" />}
      </Tab.Screen>

      <Tab.Screen
        name="Books"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();

            navigation.navigate("BookCatalogue" as never);
          },
        }}
      >
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