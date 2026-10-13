import { supabase } from "./supabase";
import { Notification, NotificationType } from "../types";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}

/**
 * Creates an in-app notification for a user.
 * Dispatches safely without breaking callers if network or permissions fail.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        is_read: false,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[createNotification] Warning:", error.message);
      return null;
    }

    return (data as Notification) || null;
  } catch (err: any) {
    console.warn("[createNotification] Error:", err?.message || err);
    return null;
  }
}

/**
 * Fetches unread notification count for the signed-in user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
