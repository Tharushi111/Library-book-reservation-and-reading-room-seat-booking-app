import { supabase } from "../services/supabase";

/**
 * TEMPORARY helper for local testing only.
 * Signs in with the test account from your local .env until Member 1's real
 * Login screen is merged. If the .env values are missing it does nothing, so
 * it is safe for teammates. If you change the email in .env it switches to
 * that account. Delete this file (and its calls in roomService.ts) once the
 * real Login works.
 */
let pending: Promise<void> | null = null;

async function run(): Promise<void> {
  const email = process.env.EXPO_PUBLIC_DEV_EMAIL;
  const password = process.env.EXPO_PUBLIC_DEV_PASSWORD;
  if (!email || !password) return;

  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.email?.toLowerCase() === email.toLowerCase()) return;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export function ensureDevSession(): Promise<void> {
  if (!pending) {
    pending = run().finally(() => {
      pending = null;
    });
  }
  return pending;
}
