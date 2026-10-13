import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { useAuth } from "../../context/AuthContext";
import {
  getAllUsers,
  updateUserRole,
  toggleUserActive,
} from "../../services/staffService";
import { UserProfile } from "../../types";

const ROLE_FILTERS = ["All", "Student", "Staff", "Admin"];

export default function AdminUserManagementScreen() {
  const navigation = useNavigation<any>();
  const { user: currentUser, isAdmin } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");

  // User Edit Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getAllUsers({
        role: selectedRoleFilter !== "All" ? selectedRoleFilter : undefined,
        search: search.trim() || undefined,
      });
      setUsers(data);
    } catch (err: any) {
      console.error("Admin users load error:", err);
      Alert.alert("Error", err?.message || "Could not load user accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRoleFilter, search]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const handleChangeRole = (newRole: "student" | "staff" | "admin") => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id && newRole !== "admin") {
      Alert.alert(
        "Action Denied",
        "You cannot revoke your own administrator privileges to prevent lockout."
      );
      return;
    }

    Alert.alert(
      "Confirm Role Change",
      `Are you sure you want to change the role of ${selectedUser.firstName} ${selectedUser.lastName} to ${newRole.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setUpdating(true);
              await updateUserRole(selectedUser.id, newRole);
              Alert.alert("Success", "User account role updated successfully.");
              setSelectedUser(null);
              loadUsers();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not update user role.");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id) {
      Alert.alert("Action Denied", "You cannot deactivate your own account.");
      return;
    }

    const nextActive = !selectedUser.isActive;
    Alert.alert(
      nextActive ? "Reactivate Account" : "Suspend Account",
      `Are you sure you want to ${nextActive ? "reactivate" : "suspend"} the account for ${selectedUser.firstName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: nextActive ? "default" : "destructive",
          onPress: async () => {
            try {
              setUpdating(true);
              await toggleUserActive(selectedUser.id, nextActive);
              Alert.alert("Success", `User account ${nextActive ? "reactivated" : "suspended"}.`);
              setSelectedUser(null);
              loadUsers();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not update account status.");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }: { item: UserProfile }) => {
    const isSelf = item.id === currentUser?.id;
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => setSelectedUser(item)}
        activeOpacity={0.8}
      >
        <View style={styles.userAvatarBox}>
          <Ionicons
            name={
              item.role === "admin"
                ? "shield-checkmark"
                : item.role === "staff"
                ? "library"
                : "school"
            }
            size={22}
            color={
              item.role === "admin"
                ? "#DC2626"
                : item.role === "staff"
                ? "#2563EB"
                : "#16A34A"
            }
          />
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>
              {item.firstName} {item.lastName}
            </Text>
            {isSelf ? (
              <View style={styles.selfBadge}>
                <Text style={styles.selfBadgeText}>YOU</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.userEmail}>{item.email}</Text>

          <View style={styles.metaRow}>
            {item.studentId ? (
              <Text style={styles.studentIdText}>ID: {item.studentId} | </Text>
            ) : null}
            <View
              style={[
                styles.roleBadge,
                item.role === "admin" && styles.roleBadgeAdmin,
                item.role === "staff" && styles.roleBadgeStaff,
              ]}
            >
              <Text style={styles.roleBadgeText}>{item.role.toUpperCase()}</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                item.isActive ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {item.isActive ? "ACTIVE" : "SUSPENDED"}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>User & Role Administration</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#8492A7" style={{ marginRight: 6 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email, or student ID..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            onSubmitEditing={loadUsers}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Role Filter Chips */}
      <View style={styles.filterStrip}>
        {ROLE_FILTERS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.filterChip,
              selectedRoleFilter === r && styles.filterChipActive,
            ]}
            onPress={() => setSelectedRoleFilter(r)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedRoleFilter === r && styles.filterChipTextActive,
              ]}
            >
              {r === "All" ? "All Users" : `${r}s`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading user directory...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadUsers();
              }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search criteria.</Text>
            </View>
          }
        />
      )}

      {/* User Edit Modal */}
      <Modal
        visible={Boolean(selectedUser)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Account Details</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <View style={styles.modalUserSummary}>
                  <Text style={styles.modalUserName}>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Text>
                  <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                  {selectedUser.studentId ? (
                    <Text style={styles.modalUserMeta}>
                      Student ID: {selectedUser.studentId}
                    </Text>
                  ) : null}
                  {selectedUser.phoneNumber ? (
                    <Text style={styles.modalUserMeta}>
                      Phone: {selectedUser.phoneNumber}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.modalSectionLabel}>Change Account Role</Text>
                <View style={styles.rolePickerRow}>
                  {(["student", "staff", "admin"] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.rolePickBtn,
                        selectedUser.role === r && styles.rolePickBtnActive,
                      ]}
                      onPress={() => handleChangeRole(r)}
                      disabled={updating}
                    >
                      <Text
                        style={[
                          styles.rolePickText,
                          selectedUser.role === r && styles.rolePickTextActive,
                        ]}
                      >
                        {r.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalSectionLabel, { marginTop: 14 }]}>
                  Account Access Status
                </Text>
                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    selectedUser.isActive ? styles.statusToggleActive : styles.statusToggleSuspended,
                  ]}
                  onPress={handleToggleActive}
                  disabled={updating}
                >
                  <Ionicons
                    name={selectedUser.isActive ? "ban-outline" : "checkmark-circle-outline"}
                    size={18}
                    color={selectedUser.isActive ? "#DC2626" : "#16A34A"}
                  />
                  <Text
                    style={[
                      styles.statusToggleText,
                      selectedUser.isActive ? { color: "#DC2626" } : { color: "#16A34A" },
                    ]}
                  >
                    {selectedUser.isActive ? "Suspend Account Access" : "Reactivate Account Access"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.white },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B" },
  filterStrip: { flexDirection: "row", backgroundColor: "#F1F5F9", paddingHorizontal: 16, paddingVertical: 8 },
  filterChip: { backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  filterChipTextActive: { color: COLORS.white },
  listContent: { padding: 14, paddingBottom: 40, backgroundColor: "#F8FAFD", flexGrow: 1 },
  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1 },
  userAvatarBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginRight: 12 },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: "row", alignItems: "center" },
  userName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  selfBadge: { backgroundColor: "#EFF6FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  selfBadgeText: { fontSize: 9, fontWeight: "800", color: COLORS.primary },
  userEmail: { fontSize: 12, color: "#64748B", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  studentIdText: { fontSize: 11, color: "#94A3B8" },
  roleBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  roleBadgeStaff: { backgroundColor: "#DBEAFE" },
  roleBadgeAdmin: { backgroundColor: "#FEE2E2" },
  roleBadgeText: { fontSize: 9, fontWeight: "800", color: "#1E293B" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusActive: { backgroundColor: "#F0FDF4" },
  statusInactive: { backgroundColor: "#FEF2F2" },
  statusBadgeText: { fontSize: 9, fontWeight: "700", color: "#64748B" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 12 },
  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  modalUserSummary: { backgroundColor: "#F8FAFC", padding: 12, borderRadius: 8, marginBottom: 14 },
  modalUserName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  modalUserEmail: { fontSize: 12, color: "#475569", marginTop: 2 },
  modalUserMeta: { fontSize: 11, color: "#64748B", marginTop: 2 },
  modalSectionLabel: { fontSize: 12, fontWeight: "700", color: "#334155", marginBottom: 8 },
  rolePickerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  rolePickBtn: { flex: 1, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#CBD5E1", paddingVertical: 8, alignItems: "center", borderRadius: 6, marginHorizontal: 3 },
  rolePickBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rolePickText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  rolePickTextActive: { color: COLORS.white },
  statusToggleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  statusToggleActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  statusToggleSuspended: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" },
  statusToggleText: { fontSize: 13, fontWeight: "700", marginLeft: 6 },
});
