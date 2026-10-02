import React, { useCallback, useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/types";
import { getRooms } from "../../services/roomService";
import { Room } from "../../types";
import { ErrorView, LoadingView, PrimaryButton, ScreenHeader, StatusBadge } from "./SpacesUI";
import { theme } from "./spacesTheme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StudyRoomsScreen() {
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
      setRooms(await getRooms("study_room"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load study rooms.");
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

  const renderRoom = ({ item }: { item: Room }) => {
    const available = item.status === "available";
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
            <StatusBadge
              label={available ? "Available" : "Unavailable"}
              color={available ? theme.success : theme.danger}
            />
          </View>
          <Text style={styles.meta}>Fits up to {item.capacity} people</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <View style={{ height: 12 }} />
          <PrimaryButton
            label="Book this room"
            disabled={!available}
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
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoom}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          ListEmptyComponent={<Text style={styles.empty}>No study rooms found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16, flexGrow: 1 },
  empty: { textAlign: "center", color: theme.textSecondary, marginTop: 40 },
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
});
