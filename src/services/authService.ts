import { Linking } from "react-native";
import { supabase } from "./supabase";
import { UserProfile } from "../types";

export type UserRole = "student" | "staff" | "admin";

/**
 * Validates that an email belongs to the SLIIT institution domain.
 * Acceptable domains: @my.sliit.lk (students) or @sliit.lk (staff/faculty).
 */
export const validateSliitEmail = (email: string): boolean => {
  const clean = email.trim().toLowerCase();
  return clean.endsWith("@my.sliit.lk") || clean.endsWith("@sliit.lk");
};

/**
 * Validates password strength (min 8 chars, at least 1 letter and 1 number).
 */
export const validatePasswordStrength = (
  password: string
): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long.",
    };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one letter.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number.",
    };
  }
  return { isValid: true };
};

/**
 * Translates raw network / Supabase errors into clear, friendly guidance.
 */
export const formatAuthErrorMessage = (error: any): string => {
  if (!error) return "An unexpected error occurred. Please try again.";
  const msg = typeof error === "string" ? error : error?.message || "";

  if (
    msg.includes("UnknownHostException") ||
    msg.includes("Network request failed") ||
    msg.includes("fetch failed") ||
    msg.includes("Failed to fetch") ||
    msg.includes("AuthRetryableFetchError")
  ) {
    return "Cannot reach the library server. Please check your device's internet connection (Wi-Fi or mobile data) and try again.";
  }

  if (msg.includes("User already registered") || msg.includes("already registered")) {
    return "An account with this email address already exists. Please sign in instead.";
  }

  if (msg.includes("Invalid login credentials")) {
    return "Incorrect email or password. Please double-check your credentials.";
  }

  return msg || "An error occurred. Please try again.";
};

/**
 * Sign up a new student account.
 * Client metadata role is always hardcoded to 'student'.
 */
export const signUp = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  studentId?: string,
  phoneNumber?: string
) => {
  const cleanEmail = email.trim().toLowerCase();

  if (!validateSliitEmail(cleanEmail)) {
    throw new Error(
      "Registration requires an official SLIIT email address (@my.sliit.lk or @sliit.lk)."
    );
  }

  const strength = validatePasswordStrength(password);
  if (!strength.isValid) {
    throw new Error(strength.message);
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        student_id: studentId?.trim() || null,
        phone_number: phoneNumber?.trim() || null,
        role: "student",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Sign in with email and password.
 */
export const signIn = async (email: string, password: string) => {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Initiates Supabase Google OAuth flow with deep link redirect.
 */
export const signInWithGoogle = async () => {
  const redirectUrl = "sliitlibrary://auth/callback";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    const supported = await Linking.canOpenURL(data.url);
    if (supported) {
      await Linking.openURL(data.url);
    } else {
      throw new Error("Unable to open browser for Google authentication.");
    }
  }

  return data;
};

/**
 * Send password reset email with deep link redirect to reset-password screen.
 */
export const sendPasswordResetEmail = async (email: string) => {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    throw new Error("Please enter your registered email address.");
  }

  const redirectUrl = "sliitlibrary://reset-password";

  const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectUrl,
  });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Update password for the currently signed-in user or after reset token.
 */
export const updatePassword = async (newPassword: string) => {
  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    throw new Error(strength.message);
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Sign out from Supabase Auth.
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

/**
 * Get currently authenticated auth.users session.
 */
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
};

/**
 * Fetch profile data including user role.
 */
export const getUserProfile = async (
  userId?: string
): Promise<UserProfile & { department?: string; academicYear?: string } | null> => {
  let targetId = userId;

  if (!targetId) {
    const user = await getCurrentUser();
    if (!user) return null;
    targetId = user.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      student_id,
      phone_number,
      role,
      department,
      academic_year,
      avatar_url,
      is_active
    `
    )
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    console.warn("Error fetching user profile:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email ?? "",
    studentId: data.student_id ?? undefined,
    phoneNumber: data.phone_number ?? undefined,
    role: (data.role ?? "student") as any,
    department: data.department ?? undefined,
    academicYear: data.academic_year ?? undefined,
  };
};