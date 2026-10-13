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
import {
  signUp,
  validateSliitEmail,
  validatePasswordStrength,
  formatAuthErrorMessage,
} from "../../services/authService";
import { COLORS } from "../../constants/colors";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

export default function SignUpScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanStudentId = studentId.trim();
    const cleanPhone = phoneNumber.trim();

    // Required fields validation
    if (!cleanFirstName) {
      Alert.alert("Missing Name", "Please enter your first name.");
      return;
    }
    if (!cleanLastName) {
      Alert.alert("Missing Name", "Please enter your last name.");
      return;
    }
    if (!cleanEmail) {
      Alert.alert("Missing Email", "Please enter your official SLIIT email address.");
      return;
    }

    // Email domain validation
    if (!validateSliitEmail(cleanEmail)) {
      Alert.alert(
        "Invalid Email Domain",
        "Registration requires an official SLIIT student or staff email address (@my.sliit.lk or @sliit.lk)."
      );
      return;
    }

    // Password validations
    if (!password) {
      Alert.alert("Missing Password", "Please enter a secure password.");
      return;
    }

    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      Alert.alert("Weak Password", strength.message || "Password is not strong enough.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match. Please re-type your password.");
      return;
    }

    try {
      setLoading(true);

      const data = await signUp(
        cleanEmail,
        password,
        cleanFirstName,
        cleanLastName,
        cleanStudentId || undefined,
        cleanPhone || undefined
      );

      // Check if email confirmation is required by Supabase
      if (data?.session) {
        Alert.alert(
          "Account Created",
          "Your SLIIT Library account has been successfully created!",
          [
            {
              text: "Sign In",
              onPress: () => navigation.replace("Login"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Verification Required",
          "A verification link has been sent to your SLIIT email address. Please confirm your email and then sign in.",
          [
            {
              text: "Go to Login",
              onPress: () => navigation.replace("Login"),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert(
        "Registration Failed",
        formatAuthErrorMessage(error)
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
            <Text style={styles.headerTitle}>Create Account</Text>
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
            <Text style={styles.welcomeTitle}>Student Registration</Text>
            <Text style={styles.subtitle}>
              Sign up using your institutional SLIIT email address
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* First Name & Last Name */}
            <View style={styles.nameRow}>
              <View style={[styles.nameCol, { marginRight: 8 }]}>
                <Text style={styles.label}>First Name *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={[styles.nameCol, { marginLeft: 8 }]}>
                <Text style={styles.label}>Last Name *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <Text style={styles.label}>SLIIT Email Address *</Text>
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
                placeholder="it12345678@my.sliit.lk"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            {/* Student ID */}
            <Text style={styles.label}>Student ID / Registration No. (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="card-outline"
                size={20}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                value={studentId}
                onChangeText={setStudentId}
                placeholder="IT12345678"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="call-outline"
                size={20}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+94 7X XXX XXXX"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            {/* Password */}
            <Text style={styles.label}>Password *</Text>
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
                placeholder="Min. 8 characters (letters & numbers)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-type your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.signupButton, loading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Link to Login */}
            <View style={styles.loginRedirect}>
              <Text style={styles.loginRedirectText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    marginBottom: 16,
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
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 6,
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nameCol: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD9EA",
    borderRadius: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 10,
  },
  eyeButton: {
    padding: 6,
  },
  signupButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.65,
  },
  signupButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  loginRedirect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  loginRedirectText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
