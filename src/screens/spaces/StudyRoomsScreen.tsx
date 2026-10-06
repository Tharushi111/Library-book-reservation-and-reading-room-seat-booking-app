import React, { useCallback, useState } from "react";
import { Image, SectionList, StyleSheet, Text, View } from "react-native";
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = [
    { title: "Study rooms", data: rooms.filter((r) => r.roomType === "study_room") },
    { title: "Conference rooms (lecturers and staff only)", data: rooms.filter((r) => r.roomType === "conference_room") },
  ].filter((s) => s.data.length > 0);

  const renderRoom = ({ item }: { item: Room }) => {
    const available = item.status === "available";
    const allowed = canBookRoom(item, role);

    let badgeLabel = "Available";
    let badgeColor = theme.success;
    if (!available) {
      badgeLabel = "Unavailable";
      badgeColor = theme.danger;
    } else if (!allowed) {
      badgeLabel = "Staff only";
      badgeColor = theme.warning;
    }

    let buttonLabel = "Book this room";
    if (!available) buttonLabel = "Unavailable";
    else if (!allowed) buttonLabel = "Staff only";

    return (
      <View style={styles.card}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No photo yet</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.roomName}>{item.name}</Text>
            <StatusBadge label={badgeLabel} color={badgeColor} />
          </View>
          <Text style={styles.meta}>Fits up to {item.capacity} people</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          {available && !allowed ? <Text style={styles.note}>{STAFF_ONLY_MESSAGE}</Text> : null}
          <View style={{ height: 12 }} />
          <PrimaryButton
            label={buttonLabel}
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
      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView message={error} onRetry={() => load()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: Room) => item.id}
          renderItem={renderRoom}
          renderSectionHeader={({ section }: { section: { title: string } }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          ListEmptyComponent={<Text style={styles.empty}>No rooms found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16, flexGrow: 1 },
  empty: { textAlign: "center", color: theme.textSecondary, marginTop: 40 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: theme.textPrimary, marginBottom: 10, marginTop: 4 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  image: { width: "100%", height: 160 },
  imagePlaceholder: {
    backgroundColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: theme.textSecondary },
  cardBody: { padding: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  roomName: { fontSize: 18, fontWeight: "700", color: theme.textPrimary, flexShrink: 1 },
  meta: { color: theme.textSecondary, marginTop: 4 },
  description: { color: theme.textPrimary, marginTop: 6 },
  note: { color: theme.textSecondary, marginTop: 8, fontSize: 13 },
});
