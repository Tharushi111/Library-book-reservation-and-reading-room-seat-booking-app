import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import BookCoverImage from "../../components/common/BookCoverImage";
import {
  getStaffBookById,
  getBookCopies,
  createBookCopy,
  updateBookCopy,
  deleteBookCopy,
  deleteOrArchiveBook,
} from "../../services/staffService";
import { Book, BookCopy } from "../../types";

export default function StaffBookDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { bookId } = route.params;

  const [book, setBook] = useState<Book | null>(null);
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for adding copy
  const [showAddCopyModal, setShowAddCopyModal] = useState(false);
  const [newCopyNumber, setNewCopyNumber] = useState("");
  const [newBarcode, setNewBarcode] = useState("");
  const [newCondition, setNewCondition] = useState("good");
  const [savingCopy, setSavingCopy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([getStaffBookById(bookId), getBookCopies(bookId)]);
      setBook(b);
      setCopies(c);
      setNewCopyNumber(`C-${String(c.length + 1).padStart(2, "0")}`);
    } catch (error: any) {
      console.error("Staff book details error:", error);
      Alert.alert("Error", error?.message || "Failed to load book.");
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddCopy = async () => {
    if (!newCopyNumber.trim()) {
      Alert.alert("Validation", "Please provide a copy number (e.g. C-01).");
      return;
    }

    try {
      setSavingCopy(true);
      await createBookCopy(bookId, {
        copyNumber: newCopyNumber.trim(),
        barcode: newBarcode.trim() || undefined,
        condition: newCondition,
        status: "available",
        shelfLocation: book?.shelfLocation,
      });
      setShowAddCopyModal(false);
      setNewBarcode("");
      loadData();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not add copy.");
    } finally {
      setSavingCopy(false);
    }
  };

  const handleCopyStatusToggle = (copy: BookCopy) => {
    const nextStatus = copy.status === "available" ? "maintenance" : "available";
    Alert.alert(
      "Update Copy Status",
      `Change status of copy ${copy.copyNumber} to ${nextStatus.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              await updateBookCopy(copy.id, { status: nextStatus });
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to update copy.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteCopy = (copy: BookCopy) => {
    Alert.alert(
      "Delete Physical Copy",
      `Are you sure you want to delete copy ${copy.copyNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBookCopy(copy.id);
              loadData();
            } catch (err: any) {
              Alert.alert("Cannot Delete Copy", err?.message || "Failed to delete copy.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteBook = () => {
    if (!book) return;
    Alert.alert(
      "Remove or Archive Book",
      `Are you sure you want to remove "${book.title}" from circulation? Active loans or reservations will prevent deletion.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteOrArchiveBook(book.id);
              Alert.alert("Success", res.message, [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              Alert.alert("Cannot Delete Book", err?.message || "Operation failed.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Book not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isAvail = book.availabilityStatus === "available";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Book Inventory Details
        </Text>
        <TouchableOpacity
          style={styles.headerEdit}
          onPress={() => navigation.navigate("StaffAddEditBook", { bookId: book.id })}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Book Overview Card */}
        <View style={styles.overviewCard}>
          <BookCoverImage
            coverUrl={book.coverUrl}
            title={book.title}
            author={book.author}
            category={book.category}
            width={90}
            height={130}
            borderRadius={8}
            containerStyle={{ marginRight: 14 }}
          />

          <View style={styles.overviewInfo}>
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>By {book.author}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{book.category}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isAvail ? styles.statusAvailBadge : styles.statusBorrowedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isAvail ? styles.statusAvailText : styles.statusBorrowedText,
                  ]}
                >
                  {isAvail ? "Available" : book.availabilityStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.copyCountBox}>
              <Text style={styles.copyCountText}>
                Inventory: <Text style={styles.copyCountBold}>{book.availableCopies} available</Text>{" "}
                out of {book.totalCopies} physical copies
              </Text>
            </View>
          </View>
        </View>

        {/* Metadata Details */}
        <View style={styles.metaCard}>
          <Text style={styles.metaSectionTitle}>Catalog Metadata</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>ISBN:</Text>
            <Text style={styles.metaValue}>{book.isbn || "N/A"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Edition:</Text>
            <Text style={styles.metaValue}>{book.edition || "Standard"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Publisher:</Text>
            <Text style={styles.metaValue}>{book.publisher || "N/A"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Publication Year:</Text>
            <Text style={styles.metaValue}>{book.publicationYear || "N/A"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Shelf Location:</Text>
            <Text style={styles.metaValue}>{book.shelfLocation || "Main Stacks"}</Text>
          </View>
          {book.description ? (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Description:</Text>
              <Text style={styles.descText}>{book.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Physical Copies Section */}
        <View style={styles.copiesSectionHeader}>
          <Text style={styles.sectionTitle}>Physical Copies ({copies.length})</Text>
          <TouchableOpacity
            style={styles.addCopyBtn}
            onPress={() => setShowAddCopyModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={COLORS.white} />
            <Text style={styles.addCopyBtnText}>Add Copy</Text>
          </TouchableOpacity>
        </View>

        {copies.length === 0 ? (
          <View style={styles.emptyCopiesCard}>
            <Ionicons name="barcode-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyCopiesText}>No physical copies tracked yet.</Text>
          </View>
        ) : (
          copies.map((c) => (
            <View key={c.id} style={styles.copyCard}>
              <View style={styles.copyLeft}>
                <View style={styles.copyIconBox}>
                  <Ionicons name="barcode" size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.copyNumber}>{c.copyNumber}</Text>
                  {c.barcode ? <Text style={styles.copyBarcode}>{c.barcode}</Text> : null}
                  <Text style={styles.copyCondition}>Condition: {c.condition}</Text>
                </View>
              </View>

              <View style={styles.copyRight}>
                <TouchableOpacity
                  style={[
                    styles.copyStatusBadge,
                    c.status === "available"
                      ? styles.copyStatusAvail
                      : c.status === "borrowed"
                      ? styles.copyStatusBorrowed
                      : styles.copyStatusOther,
                  ]}
                  onPress={() => handleCopyStatusToggle(c)}
                >
                  <Text style={styles.copyStatusText}>{c.status.toUpperCase()}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.copyDeleteBtn}
                  onPress={() => handleDeleteCopy(c)}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Danger Zone: Delete Book */}
        <TouchableOpacity
          style={styles.deleteBookBtn}
          onPress={handleDeleteBook}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
          <Text style={styles.deleteBookText}>Delete / Archive Book</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Copy Modal */}
      <Modal
        visible={showAddCopyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCopyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Physical Copy</Text>
              <TouchableOpacity onPress={() => setShowAddCopyModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Copy Identifier *</Text>
            <TextInput
              value={newCopyNumber}
              onChangeText={setNewCopyNumber}
              placeholder="e.g. C-01"
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Barcode / Asset Tag</Text>
            <TextInput
              value={newBarcode}
              onChangeText={setNewBarcode}
              placeholder="e.g. BC-123456"
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Physical Condition</Text>
            <View style={styles.conditionRow}>
              {["new", "good", "fair", "damaged"].map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[
                    styles.condChip,
                    newCondition === cond && styles.condChipActive,
                  ]}
                  onPress={() => setNewCondition(cond)}
                >
                  <Text
                    style={[
                      styles.condChipText,
                      newCondition === cond && styles.condChipTextActive,
                    ]}
                  >
                    {cond.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveCopyBtn, savingCopy && { opacity: 0.7 }]}
              onPress={handleAddCopy}
              disabled={savingCopy}
            >
              {savingCopy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveCopyBtnText}>Save Copy</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerBack: { padding: 4 },
  headerTitle: { flex: 1, color: COLORS.white, fontSize: 16, fontWeight: "700", marginHorizontal: 12 },
  headerEdit: { padding: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 16 },
  scroll: { flex: 1, backgroundColor: "#F8FAFD" },
  scrollContent: { padding: 16, paddingBottom: 50 },
  overviewCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
  },
  cover: { width: 90, height: 130, borderRadius: 8, marginRight: 14, backgroundColor: "#E2E8F0" },
  overviewInfo: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  author: { fontSize: 13, color: "#64748B", marginTop: 2, marginBottom: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  categoryBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 6 },
  categoryBadgeText: { fontSize: 10, color: "#475569", fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusAvailBadge: { backgroundColor: "#DCFCE7" },
  statusBorrowedBadge: { backgroundColor: "#FEE2E2" },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  statusAvailText: { color: "#15803D" },
  statusBorrowedText: { color: "#B91C1C" },
  copyCountBox: { backgroundColor: "#F8FAFC", padding: 6, borderRadius: 6 },
  copyCountText: { fontSize: 11, color: "#475569" },
  copyCountBold: { fontWeight: "700", color: "#0F172A" },
  metaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  metaSectionTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  metaLabel: { fontSize: 12, color: "#64748B" },
  metaValue: { fontSize: 12, fontWeight: "600", color: "#1E293B" },
  descBox: { marginTop: 12 },
  descLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 4 },
  descText: { fontSize: 12, color: "#64748B", lineHeight: 18 },
  copiesSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  addCopyBtn: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  addCopyBtnText: { color: COLORS.white, fontSize: 12, fontWeight: "700", marginLeft: 4 },
  emptyCopiesCard: { backgroundColor: COLORS.white, borderRadius: 10, padding: 24, alignItems: "center", marginBottom: 16 },
  emptyCopiesText: { fontSize: 12, color: "#94A3B8", marginTop: 8 },
  copyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
  },
  copyLeft: { flexDirection: "row", alignItems: "center" },
  copyIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginRight: 10 },
  copyNumber: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  copyBarcode: { fontSize: 11, color: "#64748B" },
  copyCondition: { fontSize: 10, color: "#94A3B8", textTransform: "capitalize" },
  copyRight: { flexDirection: "row", alignItems: "center" },
  copyStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  copyStatusAvail: { backgroundColor: "#DCFCE7" },
  copyStatusBorrowed: { backgroundColor: "#FEE2E2" },
  copyStatusOther: { backgroundColor: "#F1F5F9" },
  copyStatusText: { fontSize: 10, fontWeight: "700", color: "#334155" },
  copyDeleteBtn: { padding: 6 },
  deleteBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  deleteBookText: { color: "#DC2626", fontSize: 13, fontWeight: "700", marginLeft: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 12 },
  errorText: { color: "#DC2626", fontSize: 14, marginBottom: 10 },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  backBtnText: { color: COLORS.white, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 4, marginTop: 8 },
  modalInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  conditionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginBottom: 16 },
  condChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#CBD5E1" },
  condChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  condChipText: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  condChipTextActive: { color: COLORS.white },
  saveCopyBtn: { backgroundColor: COLORS.secondary, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  saveCopyBtnText: { color: COLORS.white, fontSize: 14, fontWeight: "700" },
});
