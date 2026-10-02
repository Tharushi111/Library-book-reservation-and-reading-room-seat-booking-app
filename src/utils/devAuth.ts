import { supabase } from "../services/supabase";

/**
 * TEMPORARY helper for local testing only.
 * Signs in with the test account from your local .env until Member 1's
 * real Login screen is merged. If the .env values are missing it does nothing,
 * so it is safe for teammates. Delete this file (and its call in roomService.ts)
 * once the real Login works.
 */
export async function ensureDevSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  const email = process.env.EXPO_PUBLIC_DEV_EMAIL;
  const password = process.env.EXPO_PUBLIC_DEV_PASSWORD;
  if (!email || !password) return;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
