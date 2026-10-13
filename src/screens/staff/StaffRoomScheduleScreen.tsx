import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import {
  getAllRooms,
  getRoomBookingsForDate,
  cancelRoomBookingStaff,
  approveRoomBookingStaff,
} from "../../services/staffService";
import { Room, RoomBooking } from "../../types";

export default function StaffRoomScheduleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(route.params?.roomId || "");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load rooms initially
  useFocusEffect(
    useCallback(() => {
      getAllRooms().then((r) => {
        setRooms(r);
        if (!selectedRoomId && r.length > 0) {
          setSelectedRoomId(r[0].id);
        }
      });
    }, [selectedRoomId])
  );

  // Load bookings for selected room & date
  const loadBookings = useCallback(async () => {
    if (!selectedRoomId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getRoomBookingsForDate(selectedRoomId, selectedDate);
      setBookings(data);
    } catch (err: any) {
      console.error("Bookings schedule load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRoomId, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const handleApproveBooking = (b: RoomBooking) => {
    Alert.alert(
      "Approve Room Booking",
      `Approve booking for ${b.user?.firstName || "Student"} (${b.startTime} - ${b.endTime})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve Booking",
          onPress: async () => {
            try {
              await approveRoomBookingStaff(b.id);
              Alert.alert("Success", "Booking approved successfully.");
              loadBookings();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not approve booking.");
            }
          },
        },
      ]
    );
  };

  const handleCancelBooking = (b: RoomBooking) => {
    Alert.alert(
      "Cancel Booking",
      `Cancel booking for ${b.user?.firstName || "Student"} (${b.startTime} - ${b.endTime})?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelRoomBookingStaff(b.id, "Staff schedule adjustment");
              Alert.alert("Success", "Booking cancelled.");
              loadBookings();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not cancel booking.");
            }
          },
        },
      ]
    );
  };

  // Generate 7 upcoming dates
  const nextDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const renderBookingItem = ({ item }: { item: RoomBooking }) => {
    const isActive = item.status === "active";
    const isApproved = Boolean(item.approvedBy);
    const student = `${item.user?.firstName || ""} ${item.user?.lastName || ""}`.trim() || "User";

    return (
      <View style={[styles.bookingCard, !isActive && styles.bookingCardInactive]}>
        <View style={styles.timeBox}>
          <Text style={styles.timeText}>{item.startTime}</Text>
          <Text style={styles.timeSub}>to {item.endTime}</Text>
        </View>

        <View style={styles.bookingInfo}>
          <Text style={styles.bookingStudent}>{student}</Text>
          <Text style={styles.bookingMeta}>
            Participants: <Text style={styles.bold}>{item.participants}</Text>
            {item.user?.studentId ? ` | ID: ${item.user.studentId}` : ""}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusChip,
                isApproved
                  ? styles.statusApproved
                  : isActive
                  ? styles.statusPending
                  : styles.statusCancelled,
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  isApproved
                    ? styles.statusApprovedText
                    : isActive
                    ? styles.statusPendingText
                    : styles.statusCancelledText,
                ]}
              >
                {isApproved
                  ? "✓ APPROVED"
                  : isActive
                  ? "PENDING APPROVAL"
                  : item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsColumn}>
          {isActive && !isApproved ? (
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleApproveBooking(item)}
            >
              <Ionicons name="checkmark-circle" size={15} color="#15803D" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          ) : null}

          {isActive ? (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancelBooking(item)}
            >
              <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Room Booking Schedule</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Room horizontal selector */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingVertical: 4 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.roomChip,
                selectedRoomId === item.id && styles.roomChipActive,
              ]}
              onPress={() => setSelectedRoomId(item.id)}
            >
              <Text
                style={[
                  styles.roomChipText,
                  selectedRoomId === item.id && styles.roomChipTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Date selector strip */}
      <View style={styles.dateStrip}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={nextDates}
          keyExtractor={(d) => d}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => {
            const dateObj = new Date(item);
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = dateObj.getDate();
            const isSelected = selectedDate === item;

            return (
              <TouchableOpacity
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                onPress={() => setSelectedDate(item)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayTextActive]}>
                  {dayName}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayTextActive]}>
                  {dayNum}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadBookings();
              }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Bookings on this Date</Text>
              <Text style={styles.emptySubtitle}>
                The room is fully available for reservations on {selectedDate}.
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
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.white },
  roomChip: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginRight: 8 },
  roomChipActive: { backgroundColor: COLORS.white },
  roomChipText: { fontSize: 11, fontWeight: "600", color: "#CBD5E1" },
  roomChipTextActive: { color: COLORS.primary, fontWeight: "700" },
  dateStrip: { backgroundColor: "#F1F5F9", paddingVertical: 8 },
  dateChip: { backgroundColor: COLORS.white, width: 50, paddingVertical: 8, alignItems: "center", borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  dateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayName: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  dayNum: { fontSize: 14, fontWeight: "800", color: "#1E293B", marginTop: 2 },
  dayTextActive: { color: COLORS.white },
  listContent: { padding: 14, paddingBottom: 40, backgroundColor: "#F8FAFD", flexGrow: 1 },
  bookingCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  bookingCardInactive: { opacity: 0.6 },
  timeBox: { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: "center", marginRight: 12 },
  timeText: { fontSize: 13, fontWeight: "800", color: COLORS.primary },
  timeSub: { fontSize: 10, color: "#64748B" },
  bookingInfo: { flex: 1 },
  bookingStudent: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  bookingMeta: { fontSize: 11, color: "#64748B", marginTop: 2 },
  bold: { fontWeight: "700", color: "#0F172A" },
  statusRow: { marginTop: 4 },
  statusChip: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusActive: { backgroundColor: "#DCFCE7" },
  statusApproved: { backgroundColor: "#DCFCE7" },
  statusApprovedText: { fontSize: 9, fontWeight: "800", color: "#15803D" },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusPendingText: { fontSize: 9, fontWeight: "800", color: "#B45309" },
  statusCancelled: { backgroundColor: "#FEE2E2" },
  statusCancelledText: { fontSize: 9, fontWeight: "800", color: "#B91C1C" },
  statusChipText: { fontSize: 9, fontWeight: "800", color: "#15803D" },
  actionsColumn: { flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 8 },
  approveBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  approveBtnText: { color: "#15803D", fontSize: 11, fontWeight: "700", marginLeft: 3 },
  cancelBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cancelBtnText: { color: "#DC2626", fontSize: 11, fontWeight: "700", marginLeft: 3 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 12 },
  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 4, textAlign: "center" },
});
