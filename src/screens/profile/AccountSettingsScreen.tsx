import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
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

import {
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

import { supabase } from "../../services/supabase";
import { COLORS } from "../../constants/colors";

import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AccountSettings"
>;

type ProfileData = {
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  phone_number: string;
  role: "student" | "staff";
};

export default function AccountSettingsScreen({
  navigation,
}: Props) {
  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [studentId, setStudentId] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [role, setRole] =
    useState<
      "student" | "staff"
    >("student");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [userId, setUserId] =
    useState<string | null>(null);

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        Alert.alert(
          "Session Error",
          "Please login again."
        );
        return;
      }

      setUserId(user.id);

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          `
          first_name,
          last_name,
          email,
          student_id,
          phone_number,
          role
          `
        )
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

      const profile =
        data as ProfileData;

      setFirstName(
        profile.first_name || ""
      );

      setLastName(
        profile.last_name || ""
      );

      setEmail(
        profile.email ||
          user.email ||
          ""
      );

      setStudentId(
        profile.student_id || ""
      );

      setPhoneNumber(
        profile.phone_number || ""
      );

      setRole(
        profile.role || "student"
      );
    } catch (error: any) {
      console.error(
        "Account settings error:",
        error
      );

      Alert.alert(
        "Unable to Load Profile",
        error?.message ||
          "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert(
        "Missing First Name",
        "Please enter your first name."
      );
      return;
    }

    if (!lastName.trim()) {
      Alert.alert(
        "Missing Last Name",
        "Please enter your last name."
      );
      return;
    }

    if (!userId) {
      return;
    }

    try {
      setSaving(true);

      const {
        error,
      } = await supabase
        .from("profiles")
        .update({
          first_name:
            firstName.trim(),

          last_name:
            lastName.trim(),

          student_id:
            role === "student"
              ? studentId.trim() ||
                null
              : null,

          phone_number:
            phoneNumber.trim() ||
            null,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      Alert.alert(
        "Profile Updated",
        "Your profile information has been updated successfully.",
        [
          {
            text: "OK",

            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error(
        "Profile update error:",
        error
      );

      Alert.alert(
        "Update Failed",
        error?.message ||
          "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
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
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* HEADER */}

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.goBack()
              }
            >
              <Ionicons
                name="chevron-back"
                size={25}
                color={COLORS.primary}
              />
            </TouchableOpacity>

            <Text
              style={
                styles.headerTitle
              }
            >
              Account Settings
            </Text>

            <View
              style={
                styles.headerSpacer
              }
            />
          </View>

          {/* DESCRIPTION */}

          <Text
            style={
              styles.description
            }
          >
            Update your personal
            information.
          </Text>

          {/* FIRST NAME */}

          <Text style={styles.label}>
            First Name
          </Text>

          <View
            style={
              styles.inputContainer
            }
          >
            <Ionicons
              name="person-outline"
              size={19}
              color={COLORS.primary}
            />

            <TextInput
              value={firstName}
              onChangeText={
                setFirstName
              }
              style={styles.input}
              placeholder="First name"
            />
          </View>

          {/* LAST NAME */}

          <Text style={styles.label}>
            Last Name
          </Text>

          <View
            style={
              styles.inputContainer
            }
          >
            <Ionicons
              name="person-outline"
              size={19}
              color={COLORS.primary}
            />

            <TextInput
              value={lastName}
              onChangeText={
                setLastName
              }
              style={styles.input}
              placeholder="Last name"
            />
          </View>

          {/* EMAIL */}

          <Text style={styles.label}>
            Email
          </Text>

          <View
            style={[
              styles.inputContainer,
              styles.readOnlyInput,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={19}
              color="#8B96A8"
            />

            <TextInput
              value={email}
              editable={false}
              style={[
                styles.input,
                styles.readOnlyText,
              ]}
            />
          </View>

          <Text
            style={styles.helperText}
          >
            Email cannot be changed
            here.
          </Text>

          {/* STUDENT ID */}

          {role === "student" && (
            <>
              <Text
                style={styles.label}
              >
                Student ID
              </Text>

              <View
                style={
                  styles.inputContainer
                }
              >
                <Ionicons
                  name="card-outline"
                  size={19}
                  color={
                    COLORS.primary
                  }
                />

                <TextInput
                  value={studentId}
                  onChangeText={
                    setStudentId
                  }
                  style={styles.input}
                  placeholder="Student ID"
                  autoCapitalize="characters"
                />
              </View>
            </>
          )}

          {/* ACCOUNT TYPE */}

          <Text style={styles.label}>
            Account Type
          </Text>

          <View
            style={[
              styles.inputContainer,
              styles.readOnlyInput,
            ]}
          >
            <Ionicons
              name={
                role === "staff"
                  ? "school-outline"
                  : "person-circle-outline"
              }
              size={19}
              color="#8B96A8"
            />

            <Text
              style={
                styles.roleText
              }
            >
              {role === "staff"
                ? "Academic Staff"
                : "Student"}
            </Text>
          </View>

          {/* PHONE */}

          <Text style={styles.label}>
            Phone Number
          </Text>

          <View
            style={
              styles.inputContainer
            }
          >
            <Ionicons
              name="call-outline"
              size={19}
              color={COLORS.primary}
            />

            <TextInput
              value={phoneNumber}
              onChangeText={
                setPhoneNumber
              }
              style={styles.input}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
          </View>

          {/* SAVE */}

          <TouchableOpacity
            style={[
              styles.saveButton,

              saving &&
                styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator
                color={COLORS.white}
              />
            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,

    backgroundColor:
      COLORS.background,
  },

  loadingContainer: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor:
      COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 22,

    paddingTop: 10,
    paddingBottom: 40,
  },

  header: {
    height: 55,

    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",

    marginBottom: 13,
  },

  backButton: {
    width: 38,
    height: 38,

    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",

    color:
      COLORS.primary,
  },

  headerSpacer: {
    width: 38,
  },

  description: {
    textAlign: "center",

    fontSize: 12,

    color:
      COLORS.textSecondary,

    marginBottom: 27,
  },

  label: {
    fontSize: 12,
    fontWeight: "600",

    color:
      COLORS.textSecondary,

    marginBottom: 7,
  },

  inputContainer: {
    minHeight: 53,

    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor:
      "#D7E2F0",

    borderRadius: 9,

    paddingHorizontal: 13,

    backgroundColor:
      COLORS.white,

    marginBottom: 18,
  },

  input: {
    flex: 1,

    marginLeft: 10,

    fontSize: 14,

    color:
      COLORS.textPrimary,
  },

  readOnlyInput: {
    backgroundColor:
      "#F7F9FC",
  },

  readOnlyText: {
    color:
      COLORS.textSecondary,
  },

  helperText: {
    fontSize: 10,

    color: "#9CA3AF",

    marginTop: -12,
    marginBottom: 18,
  },

  roleText: {
    marginLeft: 10,

    fontSize: 14,

    color:
      COLORS.textSecondary,
  },

  saveButton: {
    height: 54,

    borderRadius: 9,

    backgroundColor:
      COLORS.secondary,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 13,
  },

  disabledButton: {
    opacity: 0.65,
  },

  saveButtonText: {
    color:
      COLORS.white,

    fontSize: 14,
    fontWeight: "700",
  },
});