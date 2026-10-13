import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import {
  getAllReservations,
  markReservationReady,
  cancelReservationStaff,
  getAllWaitingQueues,
} from "../../services/staffService";
import { expireOverdueReservations } from "../../services/bookService";
import { BookReservation } from "../../types";

const STATUS_FILTERS = [
  "All",
  "Reserved",
  "Ready_for_pickup",
  "Collected",
  "Cancelled",
  "Expired",
];

export default function StaffReservationManagementScreen() {
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<"reservations" | "queue">("reservations");
  const [reservations, setReservations] = useState<BookReservation[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const loadData = useCallback(async () => {
    try {
      if (activeTab === "reservations") {
        const data = await getAllReservations({
          status: selectedStatus,
          search: search.trim(),
        });
        setReservations(data);
      } else {
        const data = await getAllWaitingQueues();
        setQueues(data);
      }
    } catch (error: any) {
      console.error("Staff reservations load error:", error);
      Alert.alert("Error", error?.message || "Could not load reservations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedStatus, search]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleMarkReady = async (res: BookReservation) => {
    try {
      await markReservationReady(res.id);
      Alert.alert("Ready for Pickup", `Marked ready! Student has been notified.`);
      loadData();
    } catch (err: any) {
      Alert.alert("Action Failed", err?.message || "Could not update reservation.");
    }
  };

  const handleConfirmCollection = (res: BookReservation) => {
    // Navigate directly to issue loan with preselected book and student
    navigation.navigate("StaffIssueLoan", {
      preselectedBookId: res.bookId,
      preselectedStudentId: res.userId,
      preselectedReservationId: res.id,
      preselectedCopyId: res.copyId,
    });
  };

  const handleCancelReservation = (res: BookReservation) => {
    Alert.prompt
      ? Alert.prompt(
          "Cancel Reservation",
          "Provide a reason for cancellation:",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Confirm",
              style: "destructive",
              onPress: async (reason?: string) => {
                try {
                  await cancelReservationStaff(res.id, reason || "Cancelled by staff");
                  Alert.alert("Success", "Reservation cancelled and copy returned to circulation.");
                  loadData();
                } catch (err: any) {
                  Alert.alert("Error", err?.message || "Could not cancel reservation.");
                }
              },
            },
          ]
        )
      : Alert.alert("Cancel Reservation", "Are you sure you want to cancel this reservation?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Cancel Reservation",
            style: "destructive",
            onPress: async () => {
              try {
                await cancelReservationStaff(res.id, "Cancelled by staff");
                Alert.alert("Success", "Reservation cancelled and copy returned to circulation.");
                loadData();
              } catch (err: any) {
                Alert.alert("Error", err?.message || "Could not cancel reservation.");
              }
            },
          },
        ]);
  };

  const handleProcessExpired = async () => {
    try {
      await expireOverdueReservations();
      Alert.alert("Processed", "Overdue reservations expired and reallocated to waiting queue.");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not expire reservations.");
    }
  };

  const renderReservationItem = ({ item }: { item: BookReservation }) => {
    const isReserved = item.status === "reserved";
    const isReady = item.status === "ready_for_pickup";
    const studentName = `${item.user?.firstName || ""} ${item.user?.lastName || ""}`.trim() || "Student";

    return (
      <View style={styles.resCard}>
        <Image
          source={{
            uri:
              item.book?.coverUrl ||
              "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300",
          }}
          style={styles.bookCover}
          resizeMode="cover"
        />

        <View style={styles.resContent}>
          <View style={styles.resHeader}>
            <Text style={styles.bookTitle} numberOfLines={1}>
              {item.book?.title || "Book"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                isReserved && styles.statusBadgeReserved,
                isReady && styles.statusBadgeReady,
                item.status === "collected" && styles.statusBadgeCollected,
                item.status === "cancelled" && styles.statusBadgeCancelled,
                item.status === "expired" && styles.statusBadgeExpired,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isReserved && { color: "#C2410C" },
                  isReady && { color: "#6D28D9" },
                  item.status === "collected" && { color: "#15803D" },
                  item.status === "cancelled" && { color: "#B91C1C" },
                  item.status === "expired" && { color: "#475569" },
                ]}
              >
                {item.status.replace(/_/g, " ").toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.studentName}>
            Student: <Text style={styles.bold}>{studentName}</Text>
            {item.user?.studentId ? ` (${item.user.studentId})` : ""}
          </Text>

          <Text style={styles.dateMeta}>
            Reserved: {new Date(item.reservedAt).toLocaleDateString()}
            {item.collectionDeadline
              ? ` | Deadline: ${new Date(item.collectionDeadline).toLocaleDateString()}`
              : ""}
          </Text>

          {item.copy ? (
            <Text style={styles.copyMeta}>
              Copy Allocated: <Text style={styles.bold}>{item.copy.copyNumber}</Text>
            </Text>
          ) : null}

          {/* Action Buttons for Staff */}
          {(isReserved || isReady) && (
            <View style={styles.actionsRow}>
              {isReserved ? (
                <TouchableOpacity
                  style={styles.actionBtnReady}
                  onPress={() => handleMarkReady(item)}
                >
                  <Ionicons name="checkmark-done" size={14} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Mark Ready</Text>
                </TouchableOpacity>
              ) : null}

              {isReady ? (
                <TouchableOpacity
                  style={styles.actionBtnCollect}
                  onPress={() => handleConfirmCollection(item)}
                >
                  <Ionicons name="hand-right" size={14} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Issue Loan</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.actionBtnCancel}
                onPress={() => handleCancelReservation(item)}
              >
                <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
                <Text style={styles.actionBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderQueueItem = ({ item }: { item: any }) => {
    const studentName = `${item.user?.first_name || ""} ${item.user?.last_name || ""}`.trim() || "Student";
    return (
      <View style={styles.queueCard}>
        <View style={styles.queuePosBox}>
          <Text style={styles.queuePosText}>#{item.queue_position}</Text>
        </View>

        <View style={styles.queueContent}>
          <Text style={styles.queueBookTitle} numberOfLines={1}>
            {item.book?.title || "Book"}
          </Text>
          <Text style={styles.queueStudent}>
            Student: <Text style={styles.bold}>{studentName}</Text>
            {item.user?.student_id ? ` (${item.user.student_id})` : ""}
          </Text>
          <Text style={styles.queueDate}>
            Joined: {new Date(item.joined_at).toLocaleDateString()} | Est. Wait:{" "}
            {item.estimated_wait_days} days
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Reservation & Queue Desk</Text>
          <TouchableOpacity
            style={styles.cleanExpiredBtn}
            onPress={handleProcessExpired}
            activeOpacity={0.8}
          >
            <Ionicons name="timer-outline" size={16} color={COLORS.white} />
            <Text style={styles.cleanExpiredText}>Expire Overdue</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "reservations" && styles.tabBtnActive]}
            onPress={() => setActiveTab("reservations")}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "reservations" && styles.tabBtnTextActive,
              ]}
            >
              All Reservations
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "queue" && styles.tabBtnActive]}
            onPress={() => setActiveTab("queue")}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "queue" && styles.tabBtnTextActive,
              ]}
            >
              Waiting Queue
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {activeTab === "reservations" && (
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

      {/* Status Filter Horizontal List */}
      {activeTab === "reservations" && (
        <View style={styles.filtersBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={(i) => i}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedStatus === item && styles.filterChipActive,
                ]}
                onPress={() => setSelectedStatus(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedStatus === item && styles.filterChipTextActive,
                  ]}
                >
                  {item.replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* List content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      ) : activeTab === "reservations" ? (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          renderItem={renderReservationItem}
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
              <Ionicons name="bookmark-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Reservations Found</Text>
              <Text style={styles.emptySubtitle}>
                There are no reservations matching the chosen filters.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={queues}
          keyExtractor={(item) => item.id}
          renderItem={renderQueueItem}
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
              <Ionicons name="people-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Students Waiting</Text>
              <Text style={styles.emptySubtitle}>
                The waiting queue is currently clear for all books.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.white },
  cleanExpiredBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  cleanExpiredText: { color: COLORS.white, fontSize: 11, fontWeight: "600", marginLeft: 4 },
  tabSwitcher: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 8, padding: 3, marginBottom: 10 },
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 6 },
  tabBtnActive: { backgroundColor: COLORS.white },
  tabBtnText: { color: "#CBD5E1", fontSize: 12, fontWeight: "600" },
  tabBtnTextActive: { color: COLORS.primary, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B" },
  filtersBar: { backgroundColor: "#F1F5F9", paddingVertical: 8 },
  filterChip: { backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  filterChipTextActive: { color: COLORS.white },
  listContent: { padding: 14, paddingBottom: 40, backgroundColor: "#F8FAFD", flexGrow: 1 },
  resCard: { flexDirection: "row", backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  bookCover: { width: 55, height: 75, borderRadius: 6, backgroundColor: "#E2E8F0", marginRight: 12 },
  resContent: { flex: 1 },
  resHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  bookTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", flex: 1, marginRight: 6 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeReserved: { backgroundColor: "#FFEDD5" },
  statusBadgeReady: { backgroundColor: "#EDE9FE" },
  statusBadgeCollected: { backgroundColor: "#DCFCE7" },
  statusBadgeCancelled: { backgroundColor: "#FEE2E2" },
  statusBadgeExpired: { backgroundColor: "#F1F5F9" },
  statusBadgeText: { fontSize: 9, fontWeight: "800" },
  studentName: { fontSize: 12, color: "#475569", marginBottom: 2 },
  bold: { fontWeight: "700", color: "#0F172A" },
  dateMeta: { fontSize: 11, color: "#64748B", marginBottom: 4 },
  copyMeta: { fontSize: 11, color: "#0284C7", marginBottom: 6 },
  actionsRow: { flexDirection: "row", marginTop: 6 },
  actionBtnReady: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  actionBtnCollect: { flexDirection: "row", alignItems: "center", backgroundColor: "#16A34A", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  actionBtnText: { color: COLORS.white, fontSize: 11, fontWeight: "700", marginLeft: 4 },
  actionBtnCancel: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionBtnCancelText: { color: "#DC2626", fontSize: 11, fontWeight: "700", marginLeft: 4 },
  queueCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1 },
  queuePosBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  queuePosText: { fontSize: 15, fontWeight: "800", color: COLORS.primary },
  queueContent: { flex: 1 },
  queueBookTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  queueStudent: { fontSize: 12, color: "#475569", marginTop: 2 },
  queueDate: { fontSize: 11, color: "#94A3B8", marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 12 },
  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 4, textAlign: "center" },
});
