import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Load configuration strictly from Expo environment variables (.env)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

// Diagnostic check to ensure environment variables are loaded
if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    "⚠️ [Supabase Dev Warning] Missing Supabase development credentials.\n" +
    "Please ensure your .env file in the Desktop project contains:\n" +
    "  EXPO_PUBLIC_SUPABASE_URL=https://<your-dev-project>.supabase.co\n" +
    "  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-dev-key>\n"
  );
} else {
  try {
    const urlObj = new URL(supabaseUrl);
    console.log(`[Supabase Dev] Initialized connecting to project host: ${urlObj.hostname}`);
  } catch {
    console.log(`[Supabase Dev] Initialized connecting to: ${supabaseUrl}`);
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Keep authentication tokens refreshed while the mobile app is active
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}