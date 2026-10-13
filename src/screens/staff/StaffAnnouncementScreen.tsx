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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import {
  getAnnouncements,
  deleteAnnouncement,
  updateAnnouncement,
} from "../../services/staffService";
import { Announcement } from "../../types";

export default function StaffAnnouncementScreen() {
  const navigation = useNavigation<any>();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getAnnouncements(false);
      setAnnouncements(data);
    } catch (err: any) {
      console.error("Announcements load error:", err);
      Alert.alert("Error", err?.message || "Could not load announcements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = (item: Announcement) => {
    Alert.alert("Delete Announcement", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAnnouncement(item.id);
            loadData();
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Could not delete.");
          }
        },
      },
    ]);
  };

  const handleTogglePublish = async (item: Announcement) => {
    try {
      await updateAnnouncement(item.id, {
        title: item.title,
        content: item.content,
        category: item.category,
        priority: item.priority,
        isPublished: !item.isPublished,
      });
      loadData();
    } catch (e: any) {
      Alert.alert("Error", "Could not toggle publication status.");
    }
  };

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => {
    const isUrgent = item.priority === "urgent" || item.priority === "high";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.priorityBadge,
                  isUrgent ? styles.priorityUrgent : styles.priorityNormal,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    isUrgent && { color: "#DC2626" },
                  ]}
                >
                  {item.priority.toUpperCase()}
                </Text>
              </View>

              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.publishBadge,
                  item.isPublished ? styles.published : styles.draft,
                ]}
                onPress={() => handleTogglePublish(item)}
              >
                <Text
                  style={[
                    styles.publishText,
                    item.isPublished && { color: "#16A34A" },
                  ]}
                >
                  {item.isPublished ? "PUBLISHED" : "DRAFT"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{item.title}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <Text style={styles.content}>{item.content}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            Posted: {new Date(item.publishedAt).toLocaleDateString()}
            {item.authorName ? ` by ${item.authorName}` : ""}
          </Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate("StaffAddEditAnnouncement", {
                announcementId: item.id,
              })
            }
          >
            <Ionicons name="create-outline" size={14} color={COLORS.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Announcements & Notices</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("StaffAddEditAnnouncement")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addBtnText}>Post Notice</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notices...</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={renderAnnouncementItem}
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
              <Ionicons name="megaphone-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Announcements</Text>
              <Text style={styles.emptySubtitle}>
                Create library announcements to broadcast semester hours, book updates, or alerts.
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.white },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: COLORS.white, fontSize: 12, fontWeight: "700", marginLeft: 4 },
  listContent: { padding: 14, paddingBottom: 40, backgroundColor: "#F8FAFD", flexGrow: 1 },
  card: { backgroundColor: COLORS.white, borderRadius: 10, padding: 14, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  badgesRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  priorityNormal: { backgroundColor: "#EFF6FF" },
  priorityUrgent: { backgroundColor: "#FEE2E2" },
  priorityText: { fontSize: 9, fontWeight: "800", color: "#2563EB" },
  categoryBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  categoryText: { fontSize: 9, fontWeight: "700", color: "#475569" },
  publishBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  published: { backgroundColor: "#DCFCE7" },
  draft: { backgroundColor: "#F1F5F9" },
  publishText: { fontSize: 9, fontWeight: "800", color: "#64748B" },
  title: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  content: { fontSize: 13, color: "#475569", lineHeight: 19, marginVertical: 6 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8 },
  dateText: { fontSize: 11, color: "#94A3B8" },
  editBtn: { flexDirection: "row", alignItems: "center" },
  editText: { fontSize: 12, fontWeight: "600", color: COLORS.primary, marginLeft: 4 },
  deleteBtn: { padding: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFD" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 12 },
  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 4, textAlign: "center" },
});
