import React, { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
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
import { supabase } from "../../services/supabase";
import {
  getActiveLoans,
  getLoanHistory,
  issueLoan,
  returnLoan,
  searchStudents,
  getStaffBooks,
  getBookCopies,
} from "../../services/staffService";
import { BorrowedBook, Book, BookCopy, UserProfile } from "../../types";

export default function StaffLoanManagementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [activeTab, setActiveTab] = useState<"active" | "issue" | "history">("active");
  const [activeLoans, setActiveLoans] = useState<BorrowedBook[]>([]);
  const [historyLoans, setHistoryLoans] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Return Modal State
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<BorrowedBook | null>(null);
  const [returnCondition, setReturnCondition] = useState("good");
  const [returnNotes, setReturnNotes] = useState("");
  const [processingReturn, setProcessingReturn] = useState(false);

  // Issue Loan Form State
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);

  const [bookSearch, setBookSearch] = useState("");
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [availableCopies, setAvailableCopies] = useState<BookCopy[]>([]);
  const [selectedCopyId, setSelectedCopyId] = useState<string | undefined>(undefined);
  const [loanDays, setLoanDays] = useState("14");
  const [issuing, setIssuing] = useState(false);

  // Preselected params if navigated from Reservation screen or Dashboard
  useEffect(() => {
    if (route.params?.preselectedBookId || route.params?.preselectedStudentId) {
      setActiveTab("issue");

      const loadPreselected = async () => {
        try {
          if (route.params?.preselectedBookId) {
            const { data: b } = await supabase
              .from("books")
              .select("*")
              .eq("id", route.params.preselectedBookId)
              .single();

            if (b) {
              const bookObj: Book = {
                id: b.id,
                title: b.title,
                author: b.author,
                isbn: b.isbn ?? "",
                category: b.category,
                availableCopies: b.available_copies ?? 1,
                totalCopies: b.total_copies ?? 1,
                coverUrl: b.cover_url ?? b.image_url ?? undefined,
                publicationYear: b.published_year ?? 2024,
                availabilityStatus: b.availability_status ?? "available",
                description: b.description ?? undefined,
              };
              setSelectedBook(bookObj);
              setBookSearch(b.title);

              const copies = await getBookCopies(b.id);
              const avails = copies.filter(
                (c) => c.status === "available" || c.id === route.params?.preselectedCopyId
              );
              setAvailableCopies(avails);
              if (route.params?.preselectedCopyId) {
                setSelectedCopyId(route.params.preselectedCopyId);
              } else if (avails.length > 0) {
                setSelectedCopyId(avails[0].id);
              }
            }
          }

          if (route.params?.preselectedStudentId) {
            const { data: p } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", route.params.preselectedStudentId)
              .single();

            if (p) {
              const studentObj: UserProfile = {
                id: p.id,
                firstName: p.first_name,
                lastName: p.last_name,
                email: p.email ?? "",
                studentId: p.student_id ?? undefined,
                phoneNumber: p.phone_number ?? undefined,
                role: p.role,
                isActive: p.is_active ?? true,
                createdAt: p.created_at,
              };
              setSelectedStudent(studentObj);
              setStudentSearch(`${p.first_name} ${p.last_name}`.trim());
            }
          }
        } catch (e) {
          console.warn("Could not prefill loan details:", e);
        }
      };

      loadPreselected();
    }
  }, [route.params]);

  const loadData = useCallback(async () => {
    try {
      if (activeTab === "active") {
        const data = await getActiveLoans(search.trim());
        setActiveLoans(data);
      } else if (activeTab === "history") {
        const data = await getLoanHistory(search.trim());
        setHistoryLoans(data);
      }
    } catch (error: any) {
      console.error("Loans load error:", error);
      Alert.alert("Error", error?.message || "Could not load loan records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Search Students
  const handleSearchStudents = async (text: string) => {
    setStudentSearch(text);
    if (text.trim().length >= 2) {
      try {
        const res = await searchStudents(text);
        setStudentResults(res);
      } catch (e) {}
    } else {
      setStudentResults([]);
    }
  };

  // Search Books
  const handleSearchBooks = async (text: string) => {
    setBookSearch(text);
    if (text.trim().length >= 2) {
      try {
        const res = await getStaffBooks({ search: text, availability: "Available" });
        setBookResults(res);
      } catch (e) {}
    } else {
      setBookResults([]);
    }
  };

  // Select Book
  const handleSelectBook = async (book: Book) => {
    setSelectedBook(book);
    setBookResults([]);
    setBookSearch(book.title);
    try {
      const copies = await getBookCopies(book.id);
      const avails = copies.filter((c) => c.status === "available");
      setAvailableCopies(avails);
      if (avails.length > 0) {
        setSelectedCopyId(avails[0].id);
      }
    } catch (e) {}
  };

  // Issue Loan Handler
  const handleIssueLoanSubmit = async () => {
    if (!selectedStudent) {
      Alert.alert("Missing Student", "Please search and select a borrower student.");
      return;
    }
    if (!selectedBook) {
      Alert.alert("Missing Book", "Please search and select a book to loan.");
      return;
    }

    const days = parseInt(loanDays, 10);
    if (isNaN(days) || days < 1) {
      Alert.alert("Invalid Duration", "Loan duration must be at least 1 day.");
      return;
    }

    try {
      setIssuing(true);
      await issueLoan(
        selectedBook.id,
        selectedStudent.id,
        days,
        selectedCopyId,
        route.params?.preselectedReservationId
      );

      Alert.alert(
        "Loan Issued",
        `Book "${selectedBook.title}" successfully loaned to ${selectedStudent.firstName}.`,
        [
          {
            text: "OK",
            onPress: () => {
              setSelectedStudent(null);
              setSelectedBook(null);
              setStudentSearch("");
              setBookSearch("");
              setActiveTab("active");
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Issue Failed", err?.message || "Could not issue book loan.");
    } finally {
      setIssuing(false);
    }
  };

  // Return Loan Handler
  const handleProcessReturn = async () => {
    if (!selectedLoanForReturn) return;

    try {
      setProcessingReturn(true);
      await returnLoan(
        selectedLoanForReturn.id,
        returnCondition,
        returnNotes.trim() || undefined
      );

      setSelectedLoanForReturn(null);
      setReturnNotes("");
      Alert.alert("Return Processed", "Book loan returned and inventory synchronized!");
      loadData();
    } catch (err: any) {
      Alert.alert("Error Processing Return", err?.message || "Return failed.");
    } finally {
      setProcessingReturn(false);
    }
  };

  const renderActiveLoanItem = ({ item }: { item: BorrowedBook }) => {
    const isOverdue = item.status === "overdue";
    const studentName = `${item.user?.firstName || ""} ${item.user?.lastName || ""}`.trim() || "Student";
    const dueDate = new Date(item.dueDate);
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <View style={[styles.loanCard, isOverdue && styles.loanCardOverdue]}>
        <View style={styles.loanHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.loanBookTitle} numberOfLines={1}>
              {item.book?.title || "Book"}
            </Text>
            <Text style={styles.loanStudentName}>
              Borrower: <Text style={styles.bold}>{studentName}</Text>
              {item.user?.studentId ? ` (${item.user.studentId})` : ""}
            </Text>
          </View>

          <View
            style={[
              styles.loanBadge,
              isOverdue ? styles.loanBadgeOverdue : styles.loanBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.loanBadgeText,
                isOverdue ? styles.loanBadgeTextOverdue : styles.loanBadgeTextActive,
              ]}
            >
              {isOverdue ? "OVERDUE" : "ON LOAN"}
            </Text>
          </View>
        </View>

        <View style={styles.loanMetaRow}>
          <Text style={styles.loanMetaText}>
            Borrowed: {new Date(item.borrowedDate).toLocaleDateString()} | Due:{" "}
            {dueDate.toLocaleDateString()}
          </Text>
          {isOverdue ? (
            <Text style={styles.overdueDaysText}>{Math.abs(diffDays)} days overdue</Text>
          ) : (
            <Text style={styles.daysLeftText}>{diffDays} days remaining</Text>
          )}
        </View>

        {item.copy ? (
          <Text style={styles.copyBadgeText}>
            Copy: <Text style={styles.bold}>{item.copy.copyNumber}</Text>
            {item.copy.barcode ? ` (${item.copy.barcode})` : ""}
          </Text>
        ) : null}

        <View style={styles.loanActionsRow}>
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={() => setSelectedLoanForReturn(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="return-down-back" size={16} color={COLORS.white} />
            <Text style={styles.returnBtnText}>Process Return</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHistoryLoanItem = ({ item }: { item: BorrowedBook }) => {
    const studentName = `${item.user?.firstName || ""} ${item.user?.lastName || ""}`.trim() || "Student";
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle} numberOfLines={1}>
            {item.book?.title || "Book"}
          </Text>
          <View style={styles.historyStatusBadge}>
            <Text style={styles.historyStatusText}>RETURNED</Text>
          </View>
        </View>

        <Text style={styles.historyStudent}>
          Borrower: <Text style={styles.bold}>{studentName}</Text>
        </Text>

        <Text style={styles.historyDates}>
          Returned on:{" "}
          {item.returnedAt ? new Date(item.returnedAt).toLocaleDateString() : "Archived"}
          {item.copy ? ` | Copy: ${item.copy.copyNumber}` : ""}
        </Text>

        {item.notes ? (
          <Text style={styles.historyNotes}>Staff Notes: {item.notes}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Circulation & Loan Desk</Text>
          {navigation.canGoBack() ? <View style={{ width: 22 }} /> : null}
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "active" && styles.tabBtnActive]}
            onPress={() => setActiveTab("active")}
          >
            <Text style={[styles.tabBtnText, activeTab === "active" && styles.tabBtnTextActive]}>
              Active Loans
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "issue" && styles.tabBtnActive]}
            onPress={() => setActiveTab("issue")}
          >
            <Text style={[styles.tabBtnText, activeTab === "issue" && styles.tabBtnTextActive]}>
              Issue New Loan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "history" && styles.tabBtnActive]}
            onPress={() => setActiveTab("history")}
          >
            <Text style={[styles.tabBtnText, activeTab === "history" && styles.tabBtnTextActive]}>
              Loan History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar for active/history */}
        {activeTab !== "issue" && (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#8492A7" style={{ marginRight: 6 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by book or student..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              onSubmitEditing={loadData}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* Tab 1: Active Loans */}
      {activeTab === "active" && (
        <>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading loans...</Text>
            </View>
          ) : (
            <FlatList
              data={activeLoans}
              keyExtractor={(item) => item.id}
              renderItem={renderActiveLoanItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadData();
                  }}
                  tintColor={COLORS.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="library-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Active Loans</Text>
                  <Text style={styles.emptySubtitle}>All borrowed books have been returned.</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Tab 2: Issue New Loan Form */}
      {activeTab === "issue" && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.formContent}>
          <Text style={styles.formSectionTitle}>1. Select Borrower Student</Text>
          {selectedStudent ? (
            <View style={styles.selectedBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedTitle}>
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </Text>
                <Text style={styles.selectedSubtitle}>
                  ID: {selectedStudent.studentId || "N/A"} | {selectedStudent.email}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                <Ionicons name="close-circle" size={22} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                value={studentSearch}
                onChangeText={handleSearchStudents}
                placeholder="Search student by name or ID (e.g. IT12...)"
                placeholderTextColor="#94A3B8"
                style={styles.formInput}
              />
              {studentResults.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setSelectedStudent(s);
                    setStudentResults([]);
                  }}
                >
                  <Text style={styles.searchResultTitle}>
                    {s.firstName} {s.lastName}
                  </Text>
                  <Text style={styles.searchResultSub}>
                    {s.studentId ? `ID: ${s.studentId} | ` : ""}
                    {s.email}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.formSectionTitle, { marginTop: 18 }]}>2. Select Book</Text>
          {selectedBook ? (
            <View style={styles.selectedBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedTitle}>{selectedBook.title}</Text>
                <Text style={styles.selectedSubtitle}>
                  By {selectedBook.author} | {selectedBook.shelfLocation || "Main Stacks"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBook(null)}>
                <Ionicons name="close-circle" size={22} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                value={bookSearch}
                onChangeText={handleSearchBooks}
                placeholder="Search book title..."
                placeholderTextColor="#94A3B8"
                style={styles.formInput}
              />
              {bookResults.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.searchResultItem}
                  onPress={() => handleSelectBook(b)}
                >
                  <Text style={styles.searchResultTitle}>{b.title}</Text>
                  <Text style={styles.searchResultSub}>
                    By {b.author} | {b.availableCopies} available
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Available Physical Copies */}
          {selectedBook && availableCopies.length > 0 ? (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.inputLabel}>Physical Copy Assignment</Text>
              <View style={styles.copiesSelectRow}>
                {availableCopies.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.copySelectChip,
                      selectedCopyId === c.id && styles.copySelectChipActive,
                    ]}
                    onPress={() => setSelectedCopyId(c.id)}
                  >
                    <Text
                      style={[
                        styles.copySelectText,
                        selectedCopyId === c.id && styles.copySelectTextActive,
                      ]}
                    >
                      {c.copyNumber} {c.barcode ? `(${c.barcode})` : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <Text style={[styles.formSectionTitle, { marginTop: 18 }]}>3. Loan Duration</Text>
          <View style={styles.durationRow}>
            {["7", "14", "21", "28"].map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.durationChip,
                  loanDays === d && styles.durationChipActive,
                ]}
                onPress={() => setLoanDays(d)}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    loanDays === d && styles.durationChipTextActive,
                  ]}
                >
                  {d} Days
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.issueSubmitBtn, issuing && { opacity: 0.7 }]}
            onPress={handleIssueLoanSubmit}
            disabled={issuing}
          >
            {issuing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.issueSubmitBtnText}>Confirm & Issue Loan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Tab 3: History */}
      {activeTab === "history" && (
        <>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={historyLoans}
              keyExtractor={(item) => item.id}
              renderItem={renderHistoryLoanItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadData} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No Loan History Recorded</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Return Modal */}
      <Modal
        visible={Boolean(selectedLoanForReturn)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLoanForReturn(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Book Return</Text>
              <TouchableOpacity onPress={() => setSelectedLoanForReturn(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.returnBookTitle}>
              Book: {selectedLoanForReturn?.book?.title}
            </Text>
            <Text style={styles.returnBorrower}>
              Borrower: {selectedLoanForReturn?.user?.firstName}{" "}
              {selectedLoanForReturn?.user?.lastName}
            </Text>

            <Text style={styles.inputLabel}>Returned Physical Condition *</Text>
            <View style={styles.conditionRow}>
              {["good", "excellent", "fair", "damaged", "lost"].map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[
                    styles.condChip,
                    returnCondition === cond && styles.condChipActive,
                  ]}
                  onPress={() => setReturnCondition(cond)}
                >
                  <Text
                    style={[
                      styles.condChipText,
                      returnCondition === cond && styles.condChipTextActive,
                    ]}
                  >
                    {cond.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Staff Notes (Optional)</Text>
            <TextInput
              value={returnNotes}
              onChangeText={setReturnNotes}
              placeholder="e.g. minor wear on cover, returned on time"
              style={styles.modalInput}
            />

            <TouchableOpacity
              style={[styles.confirmReturnBtn, processingReturn && { opacity: 0.7 }]}
              onPress={handleProcessReturn}
              disabled={processingReturn}
            >
              {processingReturn ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmReturnBtnText}>Confirm Return</Text>
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
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.white },
  tabSwitcher: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 8, padding: 3, marginBottom: 10 },
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 6 },
  tabBtnActive: { backgroundColor: COLORS.white },
  tabBtnText: { color: "#CBD5E1", fontSize: 11, fontWeight: "600" },
  tabBtnTextActive: { color: COLORS.primary, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B" },
  listContent: { padding: 14, paddingBottom: 40, backgroundColor: "#F8FAFD", flexGrow: 1 },
  loanCard: { backgroundColor: COLORS.white, borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1, borderLeftWidth: 4, borderLeftColor: "#2563EB" },
  loanCardOverdue: { borderLeftColor: "#DC2626", backgroundColor: "#FEF2F2" },
  loanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  loanBookTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  loanStudentName: { fontSize: 12, color: "#475569", marginTop: 2 },
  bold: { fontWeight: "700", color: "#0F172A" },
  loanBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  loanBadgeActive: { backgroundColor: "#EFF6FF" },
  loanBadgeOverdue: { backgroundColor: "#FEE2E2" },
  loanBadgeText: { fontSize: 9, fontWeight: "800" },
  loanBadgeTextActive: { color: "#2563EB" },
  loanBadgeTextOverdue: { color: "#DC2626" },
  loanMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, marginBottom: 4 },
  loanMetaText: { fontSize: 11, color: "#64748B" },
  overdueDaysText: { fontSize: 11, fontWeight: "700", color: "#DC2626" },
  daysLeftText: { fontSize: 11, fontWeight: "600", color: "#16A34A" },
  copyBadgeText: { fontSize: 11, color: "#0284C7", marginTop: 2 },
  loanActionsRow: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  returnBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#16A34A", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  returnBtnText: { color: COLORS.white, fontSize: 11, fontWeight: "700", marginLeft: 4 },
  historyCard: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  historyTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B", flex: 1 },
  historyStatusBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  historyStatusText: { fontSize: 9, fontWeight: "800", color: "#16A34A" },
  historyStudent: { fontSize: 11, color: "#475569" },
  historyDates: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  historyNotes: { fontSize: 11, color: "#64748B", fontStyle: "italic", marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 12 },
  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  scroll: { flex: 1, backgroundColor: "#F8FAFD" },
  formContent: { padding: 16, paddingBottom: 50 },
  formSectionTitle: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
  formInput: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 13, color: "#1E293B" },
  searchResultItem: { backgroundColor: COLORS.white, padding: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  searchResultTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  searchResultSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
  selectedBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 8, padding: 12 },
  selectedTitle: { fontSize: 13, fontWeight: "700", color: "#1E3A8A" },
  selectedSubtitle: { fontSize: 11, color: "#3B82F6", marginTop: 2 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 },
  copiesSelectRow: { flexDirection: "row", flexWrap: "wrap" },
  copySelectChip: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CBD5E1", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 8, marginBottom: 8 },
  copySelectChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  copySelectText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  copySelectTextActive: { color: COLORS.white },
  durationRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  durationChip: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CBD5E1", paddingVertical: 10, alignItems: "center", borderRadius: 8, marginHorizontal: 4 },
  durationChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durationChipText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  durationChipTextActive: { color: COLORS.white },
  issueSubmitBtn: { backgroundColor: COLORS.secondary, paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  issueSubmitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  returnBookTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  returnBorrower: { fontSize: 12, color: "#64748B", marginBottom: 14 },
  conditionRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  condChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#CBD5E1", marginRight: 6, marginBottom: 6 },
  condChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  condChipText: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  condChipTextActive: { color: COLORS.white },
  modalInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, marginBottom: 18 },
  confirmReturnBtn: { backgroundColor: "#16A34A", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  confirmReturnBtnText: { color: COLORS.white, fontSize: 14, fontWeight: "700" },
});
