import React from "react";

import {
  NavigationContainer,
} from "@react-navigation/native";

import * as SplashScreen from "expo-splash-screen";

import RootNavigator from "./src/navigation/RootNavigator";

import "./src/services/supabase";

// =========================================================
// SPLASH SCREEN ANIMATION
// =========================================================

SplashScreen.setOptions({
  duration: 700,
  fade: true,
});

// =========================================================
// APP
// =========================================================

export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}