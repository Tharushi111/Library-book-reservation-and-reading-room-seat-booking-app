import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../../constants/colors";
import { createRoom, updateRoom, getAllRooms, deleteRoom } from "../../services/staffService";
import { Room } from "../../types";

export default function StaffAddEditRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const roomId = route.params?.roomId;
  const isEditing = Boolean(roomId);

  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState<Room["roomType"]>("study_room");
  const [capacity, setCapacity] = useState("6");
  const [location, setLocation] = useState("");
  const [facilitiesText, setFacilitiesText] = useState("Whiteboard, Wi-Fi, Power Outlets");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  useEffect(() => {
    if (isEditing) {
      getAllRooms()
        .then((rooms) => {
          const r = rooms.find((x) => x.id === roomId);
          if (r) {
            setName(r.name);
            setRoomNumber(r.roomNumber || "");
            setRoomType(r.roomType);
            setCapacity(String(r.capacity));
            setLocation(r.location || "");
            setFacilitiesText((r.facilities || []).join(", "));
            setDescription(r.description || "");
            if (r.imageUrl) setImageUri(r.imageUrl);
          }
        })
        .finally(() => setFetching(false));
    }
  }, [roomId, isEditing]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Media library access required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Please provide a room name.");
      return;
    }

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum)) {
      Alert.alert("Validation", "Please enter a valid numeric capacity.");
      return;
    }

    // SLIIT Rule: Study & Collaborative Rooms min 5, Conference Rooms min 10
    if ((roomType === "study_room" || roomType === "collaborative_space") && capNum < 5) {
      Alert.alert(
        "SLIIT Requirement",
        `SLIIT ${roomType === "study_room" ? "study rooms" : "collaborative spaces"} require a minimum capacity of at least 5 student participants.`
      );
      return;
    }
    if (roomType === "conference_room" && capNum < 10) {
      Alert.alert(
        "SLIIT Requirement",
        "SLIIT conference rooms require a minimum capacity of at least 10 staff participants."
      );
      return;
    }

    const facilities = facilitiesText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      setLoading(true);
      if (isEditing) {
        await updateRoom(roomId, {
          name,
          roomNumber,
          roomType,
          capacity: capNum,
          location,
          facilities,
          description,
          status: "available",
          imageUri: imageUri || undefined,
        });
        Alert.alert("Success", "Room updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        await createRoom({
          name,
          roomNumber,
          roomType,
          capacity: capNum,
          location,
          facilities,
          description,
          imageUri: imageUri || undefined,
        });
        Alert.alert("Success", "Room created successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save room.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!roomId) return;
    Alert.alert(
      "Delete Room",
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteRoom(roomId);
              Alert.alert("Success", "Room deleted successfully.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not delete room.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Room Details" : "Add Study / Conference Room"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Room Image */}
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={handlePickImage}
            activeOpacity={0.8}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                <Text style={styles.imagePlaceholderText}>Upload Room Photo (Optional)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Room Type Selector */}
          <Text style={styles.label}>Room Classification *</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                roomType === "study_room" && styles.typeOptionActive,
              ]}
              onPress={() => {
                setRoomType("study_room");
                if (parseInt(capacity, 10) < 5) setCapacity("6");
              }}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  roomType === "study_room" && styles.typeOptionTextActive,
                ]}
              >
                Study{"\n"}(Students, 5+)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                roomType === "collaborative_space" && styles.typeOptionActive,
              ]}
              onPress={() => {
                setRoomType("collaborative_space");
                if (parseInt(capacity, 10) < 5) setCapacity("8");
              }}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  roomType === "collaborative_space" && styles.typeOptionTextActive,
                ]}
              >
                Collaborative{"\n"}(Students, 5+)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                roomType === "conference_room" && styles.typeOptionActive,
                { marginRight: 0 },
              ]}
              onPress={() => {
                setRoomType("conference_room");
                if (parseInt(capacity, 10) < 10) setCapacity("12");
              }}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  roomType === "conference_room" && styles.typeOptionTextActive,
                ]}
              >
                Conference{"\n"}(Staff, 10+)
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Room Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Discussion Room 101"
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>Room Number</Text>
              <TextInput
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="e.g. R-101"
                style={styles.input}
              />
            </View>

            <View style={[styles.col, { marginLeft: 8 }]}>
              <Text style={styles.label}>
                Capacity * ({roomType === "conference_room" ? "Min 10" : "Min 5"})
              </Text>
              <TextInput
                value={capacity}
                onChangeText={setCapacity}
                placeholder="6"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Campus Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Level 2, North Wing, Malabe Campus"
            style={styles.input}
          />

          <Text style={styles.label}>Facilities (comma separated)</Text>
          <TextInput
            value={facilitiesText}
            onChangeText={setFacilitiesText}
            placeholder="Whiteboard, Projector, High-Speed Wi-Fi, Power Outlets"
            style={styles.input}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe room amenities and usage guidelines..."
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
          />

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? "Save Room Details" : "Create Room"}
              </Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              style={[styles.deleteRoomBtn, loading && { opacity: 0.7 }]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={17} color="#DC2626" />
              <Text style={styles.deleteRoomBtnText}>Delete Room</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  scroll: { flex: 1, backgroundColor: "#F8FAFD" },
  scrollContent: { padding: 18, paddingBottom: 50 },
  imagePicker: { height: 130, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: "#CBD5E1", borderStyle: "dashed", overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center" },
  imagePlaceholderText: { fontSize: 11, fontWeight: "700", color: COLORS.primary, marginTop: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6, marginTop: 6 },
  typeRow: { flexDirection: "row", marginBottom: 12 },
  typeOption: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", marginRight: 6 },
  typeOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeOptionText: { fontSize: 10, fontWeight: "700", color: "#475569", textAlign: "center" },
  typeOptionTextActive: { color: COLORS.white },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 12, height: 46, fontSize: 13, color: "#1E293B", marginBottom: 10 },
  textArea: { height: 80, textAlignVertical: "top", paddingTop: 10 },
  row: { flexDirection: "row" },
  col: { flex: 1 },
  saveBtn: { backgroundColor: COLORS.secondary, paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 14 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  deleteRoomBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FEE2E2", paddingVertical: 13, borderRadius: 8, marginTop: 10 },
  deleteRoomBtnText: { color: "#DC2626", fontSize: 14, fontWeight: "700", marginLeft: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
});
