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
import { createBook, updateBook, getStaffBookById } from "../../services/staffService";

const CATEGORIES = [
  "Software Engineering",
  "Programming",
  "Database Management",
  "Artificial Intelligence & ML",
  "Cybersecurity",
  "Computer Networks",
  "Data Structures & Algorithms",
  "Web & Mobile Development",
  "UI/UX Design",
  "Business Management",
  "Mathematics & Statistics",
  "Project Management",
];

export default function StaffAddEditBookScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bookId = route.params?.bookId;
  const isEditing = Boolean(bookId);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [edition, setEdition] = useState("");
  const [isbn, setIsbn] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [totalCopies, setTotalCopies] = useState("1");
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  useEffect(() => {
    if (isEditing) {
      getStaffBookById(bookId)
        .then((b) => {
          setTitle(b.title);
          setAuthor(b.author);
          setCategory(b.category);
          setDescription(b.description || "");
          setEdition(b.edition || "");
          setIsbn(b.isbn || "");
          setPublisher(b.publisher || "");
          setPublicationYear(b.publicationYear ? String(b.publicationYear) : "");
          setShelfLocation(b.shelfLocation || "");
          setTotalCopies(String(b.totalCopies || 1));
          if (b.coverUrl) setCoverImageUri(b.coverUrl);
        })
        .catch((e) => {
          Alert.alert("Error", "Could not fetch book details.");
        })
        .finally(() => setFetching(false));
    }
  }, [bookId, isEditing]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is needed to choose a book cover."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setCoverImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Image picker error:", err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Field", "Please enter the book title.");
      return;
    }
    if (!author.trim()) {
      Alert.alert("Missing Field", "Please enter the book author.");
      return;
    }

    const copiesNum = parseInt(totalCopies, 10);
    if (!isEditing && (isNaN(copiesNum) || copiesNum < 1)) {
      Alert.alert("Invalid Copies", "Total copies must be at least 1.");
      return;
    }

    const pubYearNum = publicationYear.trim() ? parseInt(publicationYear, 10) : undefined;

    try {
      setLoading(true);

      if (isEditing) {
        await updateBook(bookId, {
          title,
          author,
          category,
          description: description.trim() || undefined,
          edition: edition.trim() || undefined,
          isbn: isbn.trim() || undefined,
          publisher: publisher.trim() || undefined,
          publicationYear: pubYearNum,
          shelfLocation: shelfLocation.trim() || undefined,
          coverImageUri: coverImageUri || undefined,
        });
        Alert.alert("Success", "Book updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        await createBook({
          title,
          author,
          category,
          description: description.trim() || undefined,
          edition: edition.trim() || undefined,
          isbn: isbn.trim() || undefined,
          publisher: publisher.trim() || undefined,
          publicationYear: pubYearNum,
          shelfLocation: shelfLocation.trim() || undefined,
          totalCopies: copiesNum,
          coverImageUri: coverImageUri || undefined,
        });
        Alert.alert("Success", "New book added to library inventory!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error("Save book error:", error);
      Alert.alert("Error Saving Book", error?.message || "Failed to save book.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Book Information" : "Add New Book to Inventory"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Cover Image Picker */}
          <View style={styles.coverSection}>
            <TouchableOpacity
              style={styles.coverPicker}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              {coverImageUri ? (
                <Image source={{ uri: coverImageUri }} style={styles.coverPreview} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="camera-outline" size={36} color={COLORS.primary} />
                  <Text style={styles.coverPlaceholderText}>Upload Cover Image</Text>
                  <Text style={styles.coverSubtext}>JPG or PNG (Optional)</Text>
                </View>
              )}
            </TouchableOpacity>
            {coverImageUri ? (
              <TouchableOpacity
                style={styles.changeCoverBtn}
                onPress={handlePickImage}
              >
                <Text style={styles.changeCoverText}>Change Cover</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Form Fields */}
          <Text style={styles.label}>Book Title *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Distributed Systems: Concepts and Design"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>Author(s) *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              placeholder="e.g. George Coulouris, Jean Dollimore"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>ISBN</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={isbn}
                  onChangeText={setIsbn}
                  placeholder="978-0..."
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={[styles.col, { marginLeft: 8 }]}>
              <Text style={styles.label}>Edition</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={edition}
                  onChangeText={setEdition}
                  placeholder="e.g. 5th Edition"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>Publisher</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={publisher}
                  onChangeText={setPublisher}
                  placeholder="Pearson / McGraw-Hill"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={[styles.col, { marginLeft: 8 }]}>
              <Text style={styles.label}>Year</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={publicationYear}
                  onChangeText={setPublicationYear}
                  placeholder="2022"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.col, { marginRight: 8 }]}>
              <Text style={styles.label}>Shelf Location</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={shelfLocation}
                  onChangeText={setShelfLocation}
                  placeholder="Stack A - Shelf 02"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            </View>

            {!isEditing ? (
              <View style={[styles.col, { marginLeft: 8 }]}>
                <Text style={styles.label}>Initial Copies *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={totalCopies}
                    onChangeText={setTotalCopies}
                    placeholder="1"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>
            ) : null}
          </View>

          <Text style={styles.label}>Description / Abstract</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter synopsis or chapter topics..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea]}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.disabledBtn]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? "Save Changes" : "Create Book & Physical Copies"}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  scroll: { flex: 1, backgroundColor: "#F8FAFD" },
  scrollContent: { padding: 18, paddingBottom: 50 },
  coverSection: { alignItems: "center", marginBottom: 20 },
  coverPicker: {
    width: 120,
    height: 160,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  coverPreview: { width: "100%", height: "100%" },
  coverPlaceholder: { alignItems: "center", padding: 10 },
  coverPlaceholderText: { fontSize: 11, fontWeight: "700", color: COLORS.primary, marginTop: 6, textAlign: "center" },
  coverSubtext: { fontSize: 9, color: "#94A3B8", marginTop: 2 },
  changeCoverBtn: { marginTop: 8 },
  changeCoverText: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6, marginTop: 4 },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: "center",
    marginBottom: 12,
  },
  input: { fontSize: 13, color: "#1E293B" },
  textAreaContainer: { minHeight: 90, paddingVertical: 8 },
  textArea: { textAlignVertical: "top" },
  row: { flexDirection: "row" },
  col: { flex: 1 },
  categoryScroll: { paddingVertical: 4, marginBottom: 12 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  categoryChipTextActive: { color: COLORS.white },
  saveBtn: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 12 },
});
