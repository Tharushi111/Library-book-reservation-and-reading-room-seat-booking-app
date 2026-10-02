import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import { getRooms } from "../../services/roomService";
import { Room } from "../../types";
import { ROOM_TYPE_LABEL } from "../../utils/spaceUtils";
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
      setError(e instanceof Error ? e.message : "Could not load spaces.");
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

  const studyRooms = rooms.filter((r) => r.roomType === "study_room");
  const availableStudy = studyRooms.filter((r) => r.status === "available").length;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Space Reservation" />

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView message={error} onRetry={() => load()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          <View style={styles.hero}>
            <Text style={styles.heroNumber}>
              {availableStudy} of {studyRooms.length}
            </Text>
            <Text style={styles.heroLabel}>study rooms available right now</Text>
            <View style={{ height: 14 }} />
            <PrimaryButton label="Browse study rooms" onPress={() => navigation.navigate("StudyRooms")} />
          </View>

          <Text style={styles.sectionTitle}>All spaces</Text>
          {rooms.length === 0 ? (
            <Text style={styles.empty}>No spaces have been added yet.</Text>
          ) : (
            rooms.map((room) => {
              const available = room.status === "available";
              return (
                <View key={room.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{room.name}</Text>
                    <Text style={styles.rowMeta}>
                      {ROOM_TYPE_LABEL[room.roomType]} · up to {room.capacity} people
                    </Text>
                  </View>
                  <StatusBadge
                    label={available ? "Available" : "Unavailable"}
                    color={available ? theme.success : theme.danger}
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, gap: 10 },
  hero: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 8,
  },
  heroNumber: { fontSize: 32, fontWeight: "800", color: theme.primary },
  heroLabel: { fontSize: 15, color: theme.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: theme.textPrimary, marginTop: 6 },
  empty: { color: theme.textSecondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
  },
  rowName: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  rowMeta: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
});
