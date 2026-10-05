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
import { signIn } from "../../services/authService";
import { COLORS } from "../../constants/colors";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Login"
>;

export default function LoginScreen({
  navigation,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // EMAIL + PASSWORD LOGIN

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        "Missing Email",
        "Please enter your email address."
      );
      return;
    }

    if (!cleanEmail.includes("@")) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );
      return;
    }

    if (!password) {
      Alert.alert(
        "Missing Password",
        "Please enter your password."
      );
      return;
    }

    try {
      setLoading(true);

      await signIn(
        cleanEmail,
        password
      );

      navigation.replace("MainTabs");
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error?.message ||
          "Unable to login. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Password reset functionality will be added next."
    );
  };

  // SLIIT / GOOGLE ACCOUNT LOGIN
  const handleSLIITAccount = () => {
    Alert.alert(
      "SLIIT Account",
      "SLIIT account sign-in will be added later."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* =================================================
              SLIIT LOGO + HEADER
          ================================================= */}

          <View style={styles.logoSection}>
            <Image
              source={require(
                "../../assets/images/sliit-logo.png"
              )}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.libraryTitle}>
              SLIIT Library
            </Text>

            <Text style={styles.welcomeTitle}>
              Welcome Back!
            </Text>

            <Text style={styles.subtitle}>
              Sign in to continue
            </Text>
          </View>

          {/* =================================================
              LOGIN FORM
          ================================================= */}

          <View style={styles.form}>
            {/* EMAIL */}

            <Text style={styles.label}>
              Email
            </Text>

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
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                style={styles.input}
              />
            </View>

            {/* PASSWORD */}

            <Text style={styles.label}>
              Password
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.primary}
                style={styles.inputIcon}
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                style={styles.eyeButton}
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-outline"
                      : "eye-off-outline"
                  }
                  size={21}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* FORGOT PASSWORD */}

            <TouchableOpacity
              onPress={
                handleForgotPassword
              }
              style={
                styles.forgotPasswordContainer
              }
              activeOpacity={0.7}
            >
              <Text
                style={
                  styles.forgotPasswordText
                }
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* =================================================
                LOGIN BUTTON
            ================================================= */}

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading &&
                  styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={
                    styles.loginButtonText
                  }
                >
                  Login
                </Text>
              )}
            </TouchableOpacity>

            {/*DIVIDER*/}

            <View style={styles.dividerSection}>
              <View style={styles.divider} />

              <Text style={styles.dividerText}>
                or continue with
              </Text>

              <View style={styles.divider} />
            </View>

            {/*SLIIT ACCOUNT / GOOGLE BUTTON*/}

            <TouchableOpacity
              style={styles.sliitButton}
              onPress={
                handleSLIITAccount
              }
              activeOpacity={0.8}
            >
              <View
                style={
                  styles.sliitButtonContent
                }
              >
                <Image
                  source={require(
                    "../../assets/images/google-logo.png"
                  )}
                  style={styles.googleLogo}
                  resizeMode="contain"
                />

                <Text
                  style={
                    styles.sliitButtonText
                  }
                >
                  Continue with SLIIT Account
                </Text>
              </View>
            </TouchableOpacity>

            {/*SECURITY TEXT */}

            <View style={styles.secureContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#9CA3AF"
              />

              <Text style={styles.secureText}>
                Secure access to your library
                services
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========================================================
// STYLES

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 40,
  },

  // LOGO
  logoSection: {
    alignItems: "center",
    marginBottom: 34,
  },

  logo: {
    width: 105,
    height: 105,
    marginBottom: 3,
  },

  libraryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 2,
    marginBottom: 15,
  },

  welcomeTitle: {
    fontSize: 25,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // FORM

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
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD9EA",
    borderRadius: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 13,
    marginBottom: 18,
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

  eyeButton: {
    padding: 5,
  },

  // FORGOT PASSWORD

  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: -7,
    marginBottom: 21,
  },

  forgotPasswordText: {
    color: "#1769D2",
    fontSize: 12,
    fontWeight: "600",
  },

  
  // LOGIN BUTTON
  
  loginButton: {
    height: 54,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.65,
  },

  loginButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },

  
  // DIVIDER
  dividerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    marginHorizontal: 12,
    color: "#9CA3AF",
    fontSize: 11,
  },

  // SLIIT ACCOUNT BUTTON

  sliitButton: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#CBD9EA",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },

  sliitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  googleLogo: {
    width: 21,
    height: 21,
    marginRight: 10,
  },

  sliitButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  
  // SECURITY TEXT
  secureContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 29,
  },

  secureText: {
    color: "#9CA3AF",
    fontSize: 11,
    marginLeft: 5,
  },
});