import React from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import {
  NavigationContainer,
} from "@react-navigation/native";

import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  StatusBar,
} from "expo-status-bar";

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
// APP CONTENT
// =========================================================

function AppContent() {
  const insets =
    useSafeAreaInsets();

  return (
    <View
      style={
        styles.container
      }
    >
      {/* PHONE STATUS BAR AREA */}
      <StatusBar
        style="light"
        hidden={false}
      />

      <View
        style={[
          styles.statusBarBackground,
          {
            height:
              insets.top,
          },
        ]}
      />

      {/* APPLICATION */}
      <View
        style={
          styles.appContent
        }
      >
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </View>
    </View>
  );
}

// =========================================================
// ROOT APP
// =========================================================

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#0B4DA2",
    },

    statusBarBackground: {
      backgroundColor:
        "#0B4DA2",
    },

    appContent: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },
  });