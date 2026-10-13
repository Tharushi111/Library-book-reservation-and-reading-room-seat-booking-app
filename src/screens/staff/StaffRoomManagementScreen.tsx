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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import { getAllRooms, toggleRoomStatus, deleteRoom } from "../../services/staffService";
import { Room } from "../../types";
import RoomCardImage from "../../components/common/RoomCardImage";

const ROOM_TYPES = ["All", "study_room", "collaborative_space", "conference_room"];

export default function StaffRoomManagementScreen() {
  const navigation = useNavigation<any>();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState("All");

  const loadRooms = useCallback(async () => {
    try {
      const data = await getAllRooms({
        roomType: selectedType !== "All" ? selectedType : undefined,
      });
      setRooms(data);
    } catch (error: any) {
      console.error("Staff rooms load error:", error);
      Alert.alert("Error", error?.message || "Could not load rooms.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType]);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  const handleToggleStatus = (room: Room) => {
    const nextStatus = room.status === "available" ? "maintenance" : "available";
    Alert.alert(
      "Update Room Status",
      `Set status of "${room.name}" to ${nextStatus.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              await toggleRoomStatus(room.id, nextStatus as any);
              loadRooms();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not update room status.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteRoom = (room: Room) => {
    Alert.alert(
      "Delete Room",
      `Are you sure you want to delete "${room.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRoom(room.id);
              Alert.alert("Success", `Room "${room.name}" deleted successfully.`);
              loadRooms();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not delete room.");
            }
          },
        },
      ]
    );
  };

  const renderRoomItem = ({ item }: { item: Room }) => {
    const isAvail = item.status === "available";
    const isConference = item.roomType === "conference_room";

    return (
      <View style={styles.roomCard}>
        <RoomCardImage
          imageUrl={item.imageUrl}
          roomName={item.name}
          roomType={item.roomType}
          capacity={item.capacity}
          location={item.location}
          height={130}
          borderRadius={0}
        />

        <View style={styles.roomContent}>
          <View style={styles.roomHeaderRow}>
            <Text style={styles.roomName} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              style={[
                styles.statusBadge,
                isAvail ? styles.statusAvail : styles.statusMaintenance,
              ]}
              onPress={() => handleToggleStatus(item)}
            >
              <Text
                style={[
                  styles.statusText,
                  isAvail ? styles.statusAvailText : styles.statusMaintenanceText,
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.typeBadgeRow}>
            <View
              style={[
                styles.typeBadge,
                isConference
                  ? styles.typeBadgeConf
                  : item.roomType === "collaborative_space"
                  ? { backgroundColor: "#FFEDD5" }
                  : styles.typeBadgeStudy,
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  item.roomType === "collaborative_space" ? { color: "#C2410C" } : {},
                ]}
              >
                {isConference
                  ? "CONFERENCE ROOM (STAFF ONLY - MIN 10)"
                  : item.roomType === "collaborative_space"
                  ? "COLLABORATIVE ROOM (STUDENTS - MIN 5)"
                  : "STUDY ROOM (STUDENTS - MIN 5)"}
              </Text>
            </View>
          </View>

          <Text style={styles.roomMetaText}>
            Capacity: <Text style={styles.bold}>{item.capacity} people</Text> | Location:{" "}
            {item.location || "Library"}
          </Text>

          {item.facilities && item.facilities.length > 0 ? (
            <View style={styles.facilitiesRow}>
              {item.facilities.slice(0, 3).map((f, i) => (
                <View key={i} style={styles.facilityChip}>
                  <Text style={styles.facilityChipText}>{f}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Action Row */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.scheduleBtn}
              onPress={() =>
                navigation.navigate("StaffRoomSchedule", {
                  roomId: item.id,
                  roomName: item.name,
                })
              }
            >
              <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
              <Text style={styles.scheduleBtnText}>View Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                navigation.navigate("StaffAddEditRoom", { roomId: item.id })
              }
            >
              <Ionicons name="create-outline" size={14} color="#475569" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteRoom(item)}
            >
              <Ionicons name="trash-outline" size={14} color="#DC2626" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
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
          <Text style={styles.headerTitle}>Study & Conference Rooms</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("StaffAddEditRoom")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>Add Room</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Row */}
        <View style={styles.filterRow}>
          {ROOM_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.filterChip,
                selectedType === t && styles.filterChipActive,
              ]}
              onPress={() => setSelectedType(t)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedType === t && styles.filterTextActive,
                ]}
              >
                {t === "All"
                  ? "All Rooms"
                  : t === "study_room"
                  ? "Study Rooms"
                  : "Conference Rooms"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Rooms List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading rooms...</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoomItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRooms();
              }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="desktop-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Rooms Configured</Text>
              <Text style={styles.emptySubtitle}>
                Add study rooms or conference rooms to allow bookings.
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
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: COLORS.white, fontSize: 12, fontWeight: "700", marginLeft: 4 },
  filterRow: { flexDirection: "row" },
  filterChip: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.white },
  filterText: { fontSize: 11, fontWeight: "600", color: "#CBD5E1" },
  filterTextActive: { color: COLORS.primary, fontWeight: "700" },
  listContent: { padding: 14, paddingBottom: 40, backgroundColor: "#F8FAFD", flexGrow: 1 },
  roomCard: { backgroundColor: COLORS.white, borderRadius: 12, overflow: "hidden", marginBottom: 14, elevation: 2 },
  roomImage: { width: "100%", height: 120, backgroundColor: "#E2E8F0" },
  roomContent: { padding: 14 },
  roomHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  roomName: { fontSize: 15, fontWeight: "700", color: "#1E293B", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusAvail: { backgroundColor: "#DCFCE7" },
  statusMaintenance: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 9, fontWeight: "800" },
  statusAvailText: { color: "#15803D" },
  statusMaintenanceText: { color: "#DC2626" },
  typeBadgeRow: { marginBottom: 6 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  typeBadgeConf: { backgroundColor: "#EDE9FE" },
  typeBadgeStudy: { backgroundColor: "#EFF6FF" },
  typeBadgeText: { fontSize: 9, fontWeight: "800", color: "#475569" },
  roomMetaText: { fontSize: 11, color: "#64748B", marginBottom: 6 },
  bold: { fontWeight: "700", color: "#0F172A" },
  facilitiesRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  facilityChip: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 6, marginBottom: 4 },
  facilityChipText: { fontSize: 10, color: "#475569" },
  cardActionsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  scheduleBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  scheduleBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: "700", marginLeft: 4 },
  editBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  editBtnText: { color: "#475569", fontSize: 11, fontWeight: "700", marginLeft: 4 },
  deleteBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginLeft: 8 },
  deleteBtnText: { color: "#DC2626", fontSize: 11, fontWeight: "700", marginLeft: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 12 },
  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 4, textAlign: "center" },
});
