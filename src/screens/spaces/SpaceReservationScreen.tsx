import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import { getRooms } from "../../services/roomService";
import { Room } from "../../types";
import { ROOM_TYPE_LABEL, getErrorMessage } from "../../utils/spaceUtils";
import { ErrorView, LoadingView, PrimaryButton, ScreenHeader, StatusBadge } from "./SpacesUI";
import { theme } from "./spacesTheme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SpaceReservationScreen() {
  const navigation = useNavigation<Nav>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setRooms(await getRooms());
    } catch (e) {
      setError(getErrorMessage(e, "Could not load spaces."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const studyRooms = rooms.filter((r) => r.roomType === "study_room");
  const conferenceRooms = rooms.filter((r) => r.roomType === "conference_room");
  const availableStudy = studyRooms.filter((r) => r.status === "available").length;
  const availableConference = conferenceRooms.filter((r) => r.status === "available").length;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Space Reservation" />
      {loading ? <LoadingView /> : error ? <ErrorView message={error} onRetry={() => load()} /> : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} colors={[theme.primary]} />}
        >
          <View style={styles.hero}>
            <View style={styles.heroDecorationOne} />
            <View style={styles.heroDecorationTwo} />
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}><Ionicons name="library-outline" size={24} color={theme.white} /></View>
              <View style={styles.heroTag}><View style={styles.liveDot} /><Text style={styles.heroTagText}>Library spaces</Text></View>
            </View>
            <Text style={styles.heroTitle}>Find your ideal{ "\n" }study space</Text>
            <Text style={styles.heroSubtitle}>Browse available rooms and book a time that works for your group.</Text>
            <View style={styles.heroAvailability}>
              <View style={styles.availabilityIcon}><Ionicons name="checkmark-circle" size={21} color="#22B37B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.availabilityNumber}>{availableStudy} <Text style={styles.availabilityTotal}>/ {studyRooms.length} study rooms</Text></Text>
                <Text style={styles.availabilityText}>Currently available</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={theme.primary} />
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionTitle}>Explore spaces</Text><Text style={styles.sectionSubtitle}>Choose the space that suits your group</Text></View>
          </View>

          <View style={styles.categoryRow}>
            <Pressable onPress={() => navigation.navigate("StudyRooms")} style={({ pressed }) => [styles.categoryCard, styles.studyCard, pressed && styles.pressed]} accessibilityRole="button">
              <View style={styles.categoryIconBlue}><Ionicons name="book-outline" size={27} color={theme.primary} /></View>
              <Text style={styles.categoryTitle}>Study Rooms</Text>
              <Text style={styles.categoryDescription}>For student group study</Text>
              <View style={styles.categoryBottom}><Text style={styles.categoryCount}>{studyRooms.length} rooms</Text><Ionicons name="arrow-forward-circle" size={24} color={theme.primary} /></View>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("StudyRooms")} style={({ pressed }) => [styles.categoryCard, styles.conferenceCard, pressed && styles.pressed]} accessibilityRole="button">
              <View style={styles.categoryIconOrange}><Ionicons name="people-outline" size={27} color={theme.secondary} /></View>
              <Text style={styles.categoryTitle}>Conference Rooms</Text>
              <Text style={styles.categoryDescription}>For lecturers and staff</Text>
              <View style={styles.categoryBottom}><Text style={styles.categoryCount}>{availableConference} available</Text><Ionicons name="arrow-forward-circle" size={24} color={theme.secondary} /></View>
            </Pressable>
          </View>

          <View style={[styles.sectionHeading, { marginTop: 26, marginBottom: 13 }]}>
            <View><Text style={styles.sectionTitle}>Room availability</Text><Text style={styles.sectionSubtitle}>Latest status of all library rooms</Text></View>
            <Pressable onPress={() => navigation.navigate("StudyRooms")} style={styles.seeAll}>
              <Text style={styles.seeAllText}>View all</Text><Ionicons name="chevron-forward" size={14} color={theme.primary} />
            </Pressable>
          </View>

          {rooms.length === 0 ? (
            <View style={styles.emptyCard}><Ionicons name="business-outline" size={29} color={theme.textSecondary} /><Text style={styles.emptyText}>No spaces have been added yet.</Text></View>
          ) : (
            <View style={styles.roomList}>
              {rooms.map((room, index) => {
                const available = room.status === "available";
                const staffOnly = room.roomType === "conference_room";
                return (
                  <Pressable key={room.id} onPress={() => navigation.navigate("StudyRooms")} style={({ pressed }) => [styles.roomRow, index !== rooms.length - 1 && styles.roomDivider, pressed && styles.pressed]}>
                    <View style={[styles.roomIcon, staffOnly ? styles.roomIconOrange : styles.roomIconBlue]}>
                      <Ionicons name={staffOnly ? "business-outline" : "library-outline"} size={22} color={staffOnly ? theme.secondary : theme.primary} />
                    </View>
                    <View style={styles.roomDetails}>
                      <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                      <View style={styles.roomMetaLine}><Ionicons name="people-outline" size={13} color={theme.textSecondary} /><Text style={styles.roomMeta} numberOfLines={1}>{ROOM_TYPE_LABEL[room.roomType]} · Up to {room.capacity}</Text></View>
                    </View>
                    <StatusBadge label={available ? "Available" : "Unavailable"} color={available ? theme.success : theme.danger} />
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.noteRow}><Ionicons name="information-circle-outline" size={17} color={theme.primary} /><Text style={styles.noteText}>Study rooms require at least 5 participants. Conference rooms are for staff and lecturers and require at least 10.</Text></View>
          <View style={{ marginTop: 14 }}><PrimaryButton label="Browse & book rooms" icon="arrow-forward" onPress={() => navigation.navigate("StudyRooms")} /></View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 48 },
  hero: { backgroundColor: theme.primary, borderRadius: 22, padding: 20, overflow: "hidden", marginBottom: 27 },
  heroDecorationOne: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(255,255,255,0.07)", right: -65, top: -75 },
  heroDecorationTwo: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.05)", right: 10, top: 70 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  heroIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#8CF0C0" },
  heroTagText: { color: theme.white, fontSize: 10, fontWeight: "700" },
  heroTitle: { color: theme.white, fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.7 },
  heroSubtitle: { color: "#D7E7FF", fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 19, maxWidth: 290 },
  heroAvailability: { backgroundColor: theme.white, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  availabilityIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: theme.paleGreen, alignItems: "center", justifyContent: "center" },
  availabilityNumber: { color: theme.navy, fontSize: 17, fontWeight: "800" },
  availabilityTotal: { fontSize: 12, fontWeight: "600" },
  availabilityText: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { color: theme.navy, fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  sectionSubtitle: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
  categoryRow: { flexDirection: "row", gap: 12 },
  categoryCard: { flex: 1, minWidth: 0, borderRadius: 18, padding: 15, minHeight: 185, borderWidth: 1 },
  studyCard: { backgroundColor: "#EAF3FF", borderColor: "#D8E9FF" },
  conferenceCard: { backgroundColor: "#FFF1E7", borderColor: "#FFE1CB" },
  categoryIconBlue: { width: 47, height: 47, borderRadius: 14, backgroundColor: theme.white, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  categoryIconOrange: { width: 47, height: 47, borderRadius: 14, backgroundColor: theme.white, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  categoryTitle: { color: theme.navy, fontSize: 14, fontWeight: "800" },
  categoryDescription: { color: theme.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 4, minHeight: 31 },
  categoryBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  categoryCount: { color: theme.navy, fontSize: 11, fontWeight: "700" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { color: theme.primary, fontWeight: "700", fontSize: 12 },
  roomList: { backgroundColor: theme.white, borderRadius: 17, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 13 },
  roomRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  roomDivider: { borderBottomWidth: 1, borderBottomColor: theme.border },
  roomIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  roomIconBlue: { backgroundColor: theme.paleBlue },
  roomIconOrange: { backgroundColor: theme.paleOrange },
  roomDetails: { flex: 1, minWidth: 0 },
  roomName: { color: theme.navy, fontSize: 12, fontWeight: "800" },
  roomMetaLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  roomMeta: { color: theme.textSecondary, fontSize: 10, flexShrink: 1 },
  emptyCard: { backgroundColor: theme.white, borderRadius: 16, padding: 30, alignItems: "center", gap: 9 },
  emptyText: { color: theme.textSecondary, fontSize: 13 },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 19 },
  noteText: { flex: 1, color: theme.textSecondary, fontSize: 11, lineHeight: 17 },
  pressed: { opacity: 0.75 },
});
