import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import {
  createAnnouncement,
  updateAnnouncement,
  getAnnouncements,
} from "../../services/staffService";
import { Announcement } from "../../types";

const CATEGORIES: Announcement["category"][] = [
  "general",
  "holiday",
  "events",
  "maintenance",
  "books",
];

const PRIORITIES: Announcement["priority"][] = ["low", "normal", "high", "urgent"];

export default function StaffAddEditAnnouncementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const announcementId = route.params?.announcementId;
  const isEditing = Boolean(announcementId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Announcement["category"]>("general");
  const [priority, setPriority] = useState<Announcement["priority"]>("normal");
  const [isPublished, setIsPublished] = useState(true);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  useEffect(() => {
    if (isEditing) {
      getAnnouncements(false)
        .then((list) => {
          const item = list.find((a) => a.id === announcementId);
          if (item) {
            setTitle(item.title);
            setContent(item.content);
            setCategory(item.category);
            setPriority(item.priority);
            setIsPublished(item.isPublished);
          }
        })
        .finally(() => setFetching(false));
    }
  }, [announcementId, isEditing]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter the announcement title.");
      return;
    }
    if (!content.trim()) {
      Alert.alert("Validation", "Please enter announcement content.");
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await updateAnnouncement(announcementId, {
          title,
          content,
          category,
          priority,
          isPublished,
        });
        Alert.alert("Success", "Announcement updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        await createAnnouncement({
          title,
          content,
          category,
          priority,
          isPublished,
        });
        Alert.alert("Success", "Announcement published successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save announcement.");
    } finally {
      setLoading(false);
    }
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
          {isEditing ? "Edit Announcement" : "Create New Announcement"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. SLIIT Library Semester Exam Extended Hours"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  category === cat && styles.chipActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === cat && styles.chipTextActive,
                  ]}
                >
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Priority Level</Text>
          <View style={styles.chipsRow}>
            {PRIORITIES.map((pri) => (
              <TouchableOpacity
                key={pri}
                style={[
                  styles.chip,
                  priority === pri && styles.chipActive,
                ]}
                onPress={() => setPriority(pri)}
              >
                <Text
                  style={[
                    styles.chipText,
                    priority === pri && styles.chipTextActive,
                  ]}
                >
                  {pri.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Publish Immediately</Text>
              <Text style={styles.switchSub}>
                Visible immediately to students in the mobile app.
              </Text>
            </View>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              trackColor={{ false: "#CBD5E1", true: COLORS.secondary }}
              thumbColor={COLORS.white}
            />
          </View>

          <Text style={styles.label}>Message Body / Announcement Details *</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Write the full announcement text here..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={6}
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
                {isEditing ? "Save Notice Changes" : "Post Announcement"}
              </Text>
            )}
          </TouchableOpacity>
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
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 12, height: 46, fontSize: 13, color: "#1E293B", marginBottom: 10 },
  textArea: { height: 120, textAlignVertical: "top", paddingTop: 10 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  chip: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CBD5E1", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 6, marginBottom: 6 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  chipTextActive: { color: COLORS.white },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.white, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#CBD5E1", marginVertical: 10 },
  switchTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  switchSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
  saveBtn: { backgroundColor: COLORS.secondary, paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 16 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
});
