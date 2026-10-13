import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { sendPasswordResetEmail, validateSliitEmail } from "../../services/authService";
import { COLORS } from "../../constants/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Missing Email", "Please enter your registered SLIIT email address.");
      return;
    }

    if (!validateSliitEmail(cleanEmail)) {
      Alert.alert(
        "Invalid Email Domain",
        "Please enter your official SLIIT email address (@my.sliit.lk or @sliit.lk)."
      );
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(cleanEmail);
      setSubmitted(true);
    } catch (error: any) {
      console.error("Reset password error:", error);
      Alert.alert(
        "Request Failed",
        error?.message || "Unable to send password reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reset Password</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require("../../assets/images/sliit-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.libraryTitle}>SLIIT Library</Text>
            <Text style={styles.welcomeTitle}>Forgot Your Password?</Text>
            <Text style={styles.subtitle}>
              Enter your registered email address and we'll send you instructions to reset your password.
            </Text>
          </View>

          {submitted ? (
            <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <Ionicons name="mail-open-outline" size={40} color={COLORS.success} />
              </View>
              <Text style={styles.successTitle}>Check Your Inbox</Text>
              <Text style={styles.successDescription}>
                We have sent a password reset link to:{"\n"}
                <Text style={styles.emailHighlight}>{email.trim()}</Text>
              </Text>
              <Text style={styles.successInstructions}>
                Click the link in the email to set a new password, then return here to log in.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.replace("Login")}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Back to Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => setSubmitted(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.resendText}>Didn't receive email? Try another address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>SLIIT Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your registered email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <View style={styles.backToLogin}>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.backToLoginText}>Return to Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    width: 85,
    height: 85,
    marginBottom: 8,
  },
  libraryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 7,
  },
  inputContainer: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD9EA",
    borderRadius: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 13,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 11,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  backToLogin: {
    alignItems: "center",
    marginTop: 20,
  },
  backToLoginText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  successCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 10,
  },
  emailHighlight: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  successInstructions: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  resendButton: {
    marginTop: 14,
  },
  resendText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
