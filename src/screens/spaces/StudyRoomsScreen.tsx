import React, { useCallback, useState } from "react";
import { Image, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import { getCurrentUserRole, getRooms } from "../../services/roomService";
import { Room } from "../../types";
import { STAFF_ONLY_MESSAGE, UserRole, canBookRoom, getErrorMessage } from "../../utils/spaceUtils";
import { ErrorView, LoadingView, PrimaryButton, ScreenHeader, StatusBadge } from "./SpacesUI";
import { theme } from "./spacesTheme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StudyRoomsScreen() {
  const navigation = useNavigation<Nav>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const [allRooms, userRole] = await Promise.all([getRooms(), getCurrentUserRole()]);
      setRooms(allRooms.filter((r) => r.roomType === "study_room" || r.roomType === "conference_room"));
      setRole(userRole);
    } catch (e) {
      setError(getErrorMessage(e, "Could not load rooms."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = [
    { title: "Study rooms", description: "Collaborative spaces for students", data: rooms.filter((r) => r.roomType === "study_room") },
    { title: "Conference rooms", description: "For lecturers and staff only", data: rooms.filter((r) => r.roomType === "conference_room") },
  ].filter((s) => s.data.length > 0);

  const renderRoom = ({ item }: { item: Room }) => {
    const available = item.status === "available";
    const allowed = canBookRoom(item, role);
    const staffOnly = item.roomType === "conference_room";
    const badgeLabel = !available ? "Unavailable" : !allowed ? "Staff only" : "Available";
    const badgeColor = !available ? theme.danger : !allowed ? theme.warning : theme.success;
    const buttonLabel = !available ? "Unavailable" : !allowed ? "Staff only" : "Book this room";

    return (
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <View style={styles.placeholderCircle}>
                <Ionicons name={staffOnly ? "business-outline" : "library-outline"} size={46} color={staffOnly ? theme.secondary : theme.primary} />
              </View>
              <Text style={styles.placeholderText}>{staffOnly ? "Conference space" : "Study space"}</Text>
            </View>
          )}
          <View style={styles.imageBadge}><StatusBadge label={badgeLabel} color={badgeColor} /></View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.roomName}>{item.name}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoPill}><Ionicons name="people-outline" size={15} color={theme.primary} /><Text style={styles.infoText}>Up to {item.capacity} people</Text></View>
            <View style={styles.infoPill}><Ionicons name={staffOnly ? "briefcase-outline" : "school-outline"} size={15} color={theme.primary} /><Text style={styles.infoText}>{staffOnly ? "Staff" : "Students"}</Text></View>
          </View>
          {item.description ? <Text style={styles.description} numberOfLines={3}>{item.description}</Text> : null}
          {available && !allowed ? (
            <View style={styles.notice}><Ionicons name="lock-closed-outline" size={16} color={theme.warning} /><Text style={styles.noticeText}>{STAFF_ONLY_MESSAGE}</Text></View>
          ) : null}
          <PrimaryButton
            label={buttonLabel}
            icon={available && allowed ? "arrow-forward" : undefined}
            disabled={!available || !allowed}
            onPress={() => navigation.navigate("BookStudyRoom", { roomId: item.id })}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Study Rooms" />
      {loading ? <LoadingView /> : error ? <ErrorView message={error} onRetry={() => load()} /> : (
        <SectionList
          sections={sections}
          keyExtractor={(item: Room) => item.id}
          renderItem={renderRoom}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>{section.title}</Text><Text style={styles.sectionSubtitle}>{section.description}</Text></View>
              <View style={styles.countBubble}><Text style={styles.countText}>{section.data.length}</Text></View>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="library-outline" size={35} color={theme.textSecondary} /><Text style={styles.emptyText}>No rooms found.</Text></View>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { paddingHorizontal: 18, paddingTop: 17, paddingBottom: 45, flexGrow: 1 },
  intro: { flexDirection: "row", gap: 13, backgroundColor: theme.paleBlue, borderRadius: 16, padding: 15, marginBottom: 25 },
  introIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: theme.white, alignItems: "center", justifyContent: "center" },
  introTitle: { fontSize: 14, fontWeight: "800", color: theme.navy },
  introText: { color: theme.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13, marginTop: 2 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: theme.navy },
  sectionSubtitle: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
  countBubble: { minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 14, backgroundColor: theme.paleBlue, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 12, color: theme.primary, fontWeight: "800" },
  card: { backgroundColor: theme.white, borderRadius: 19, borderWidth: 1, borderColor: theme.border, marginBottom: 22, overflow: "hidden" },
  imageWrap: { position: "relative" },
  image: { width: "100%", height: 170 },
  imagePlaceholder: { backgroundColor: "#EAF2FC", alignItems: "center", justifyContent: "center", gap: 9 },
  placeholderCircle: { width: 86, height: 86, borderRadius: 43, backgroundColor: theme.white, alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 11, fontWeight: "700", color: theme.textSecondary },
  imageBadge: { position: "absolute", top: 13, right: 13 },
  cardBody: { padding: 16, gap: 13 },
  roomName: { fontSize: 19, fontWeight: "800", color: theme.navy },
  infoRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  infoPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: theme.paleBlue },
  infoText: { color: theme.primary, fontSize: 11, fontWeight: "700" },
  description: { color: theme.textSecondary, fontSize: 12, lineHeight: 19 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 7, padding: 10, borderRadius: 10, backgroundColor: theme.paleOrange },
  noticeText: { flex: 1, color: "#A96A19", fontSize: 11, lineHeight: 16 },
  empty: { alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyText: { color: theme.textSecondary },
});
