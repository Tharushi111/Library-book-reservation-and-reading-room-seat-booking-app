import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "../../services/supabase";
import { COLORS } from "../../constants/colors";
import { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AccountSettings"
>;

type ProfileData = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  student_id: string | null;
  phone_number: string | null;
  role: "student" | "staff";
  avatar_url: string | null;
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
    useState<"student" | "staff">(
      "student"
    );

  const [avatarUrl, setAvatarUrl] =
    useState<string | null>(null);

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<ImagePicker.ImagePickerAsset | null>(
      null
    );

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

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
          role,
          avatar_url
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
        profile.first_name ?? ""
      );

      setLastName(
        profile.last_name ?? ""
      );

      setEmail(
        profile.email ??
          user.email ??
          ""
      );

      setStudentId(
        profile.student_id ?? ""
      );

      setPhoneNumber(
        profile.phone_number ?? ""
      );

      setRole(
        profile.role ?? "student"
      );

      setAvatarUrl(
        profile.avatar_url ?? null
      );
    } catch (error: any) {
      console.error(
        "Load profile error:",
        error
      );

      Alert.alert(
        "Unable to Load Profile",
        error?.message ??
          "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // PICK IMAGE
  // =====================================================

  const handlePickImage =
    async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Permission Required",
            "Please allow photo library access to select your profile image."
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            }
          );

        if (
          result.canceled ||
          result.assets.length === 0
        ) {
          return;
        }

        setSelectedImage(
          result.assets[0]
        );
      } catch (error: any) {
        Alert.alert(
          "Image Selection Failed",
          error?.message ||
            "Unable to select an image."
        );
      }
    };

  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  const uploadProfileImage =
    async (
      image: ImagePicker.ImagePickerAsset
    ): Promise<string> => {
      if (!userId) {
        throw new Error(
          "User session not found."
        );
      }

      const arrayBuffer =
        await fetch(
          image.uri
        ).then((response) =>
          response.arrayBuffer()
        );

      const extension =
        image.uri
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const filePath =
        `${userId}/avatar-${Date.now()}.${extension}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("profile-images")
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType:
              image.mimeType ||
              "image/jpeg",

            upsert: false,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    };

  // =====================================================
  // SAVE
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

      let updatedAvatarUrl =
        avatarUrl;

      if (selectedImage) {
        updatedAvatarUrl =
          await uploadProfileImage(
            selectedImage
          );
      }

      const { error } =
        await supabase
          .from("profiles")
          .update({
            first_name:
              firstName.trim(),

            last_name:
              lastName.trim(),

            phone_number:
              phoneNumber.trim() ||
              null,

            avatar_url:
              updatedAvatarUrl,

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", userId);

      if (error) {
        throw error;
      }

      Alert.alert(
        "Profile Updated",
        "Your profile has been updated successfully.",
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
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.primary
          }
        />

        <ActivityIndicator
          size="large"
          color={COLORS.white}
        />
      </SafeAreaView>
    );
  }

  const displayedImage =
    selectedImage?.uri ??
    avatarUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {/* =================================================
            BLUE HEADER
        ================================================= */}

        <View style={styles.topSection}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.goBack()
              }
            >
              <Ionicons
                name="chevron-back"
                size={26}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              Edit Profile
            </Text>

            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* =================================================
            WHITE BODY
        ================================================= */}

        <ScrollView
          style={styles.body}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE IMAGE */}

          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <View style={styles.avatarOuter}>
                {displayedImage ? (
                  <Image
                    source={{
                      uri: displayedImage,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={
                      styles.avatarPlaceholder
                    }
                  >
                    <Ionicons
                      name="person"
                      size={45}
                      color={COLORS.primary}
                    />
                  </View>
                )}

                <View
                  style={styles.cameraButton}
                >
                  <Ionicons
                    name="camera"
                    size={17}
                    color={COLORS.white}
                  />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickImage}
            >
              <Text
                style={
                  styles.changePhotoText
                }
              >
                Change Profile Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* PERSONAL INFO */}

          <Text
            style={styles.sectionTitle}
          >
            Personal Information
          </Text>

          <Text style={styles.label}>
            First Name
          </Text>

          <View
            style={styles.inputContainer}
          >
            <Ionicons
              name="person-outline"
              size={19}
              color={COLORS.primary}
            />

            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              placeholder="First name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <Text style={styles.label}>
            Last Name
          </Text>

          <View
            style={styles.inputContainer}
          >
            <Ionicons
              name="person-outline"
              size={19}
              color={COLORS.primary}
            />

            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

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

          <Text style={styles.helperText}>
            Email cannot be changed.
          </Text>

          {role === "student" && (
            <>
              <Text style={styles.label}>
                Student ID
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  styles.readOnlyInput,
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={19}
                  color="#8B96A8"
                />

                <TextInput
                  value={studentId}
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
                Student ID cannot be changed.
              </Text>
            </>
          )}

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

            <Text style={styles.roleText}>
              {role === "staff"
                ? "Academic Staff"
                : "Student"}
            </Text>
          </View>

          <Text style={styles.label}>
            Phone Number
          </Text>

          <View
            style={styles.inputContainer}
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
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

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
              <>
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />

                <Text
                  style={[
                    styles.saveButtonText,
                    {
                      marginLeft: 8,
                    },
                  ]}
                >
                  Saving...
                </Text>
              </>
            ) : (
              <Text
                style={styles.saveButtonText}
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

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },

  // BLUE HEADER

  topSection: {
    backgroundColor: COLORS.primary,
  },

  header: {
    height: 62,

    paddingHorizontal: 20,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },

  headerSpacer: {
    width: 38,
  },

  // BODY

  body: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 45,
  },

  // AVATAR

  avatarSection: {
    alignItems: "center",
    marginBottom: 30,
  },

  avatarOuter: {
    width: 102,
    height: 102,

    borderRadius: 51,

    backgroundColor: "#FFF0E6",

    alignItems: "center",
    justifyContent: "center",

    position: "relative",
  },

  avatarImage: {
    width: 90,
    height: 90,

    borderRadius: 45,
  },

  avatarPlaceholder: {
    width: 90,
    height: 90,

    borderRadius: 45,

    backgroundColor: COLORS.white,

    alignItems: "center",
    justifyContent: "center",
  },

  cameraButton: {
    position: "absolute",

    right: 0,
    bottom: 1,

    width: 32,
    height: 32,

    borderRadius: 16,

    backgroundColor: COLORS.primary,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 2,
    borderColor: COLORS.white,
  },

  changePhotoText: {
    marginTop: 11,

    fontSize: 12,
    fontWeight: "700",

    color: COLORS.primary,
  },

  // FORM

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: COLORS.primary,

    marginBottom: 20,
  },

  label: {
    fontSize: 12,
    fontWeight: "600",

    color: COLORS.textSecondary,

    marginBottom: 7,
  },

  inputContainer: {
    minHeight: 53,

    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#D7E2F0",

    borderRadius: 10,

    paddingHorizontal: 13,

    backgroundColor: COLORS.white,

    marginBottom: 18,
  },

  input: {
    flex: 1,

    marginLeft: 10,

    fontSize: 14,

    color: COLORS.textPrimary,

    paddingVertical: 12,
  },

  readOnlyInput: {
    backgroundColor: "#F5F7FA",
  },

  readOnlyText: {
    color: COLORS.textSecondary,
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

    color: COLORS.textSecondary,
  },

  // SAVE

  saveButton: {
    height: 54,

    flexDirection: "row",

    borderRadius: 10,

    backgroundColor: COLORS.secondary,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 15,
  },

  disabledButton: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: COLORS.white,

    fontSize: 14,
    fontWeight: "700",
  },
});