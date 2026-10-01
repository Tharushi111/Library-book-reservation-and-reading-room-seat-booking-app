import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS } from "../../constants/colors";
import { RootStackParamList } from "../../navigation/types";
import { getRooms } from "../../services/roomService";
import { Room } from "../../types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StudyRoomsScreen() {
  const navigation = useNavigation<Nav>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setRooms(await getRooms("study_room"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load rooms");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.button} onPress={() => loadRooms()}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const renderRoom = ({ item }: { item: Room }) => {
    const available = item.status === "available";
    return (
      <View style={styles.card}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.roomName}>{item.name}</Text>
            <Text
              style={[
                styles.badge,
                { backgroundColor: available ? COLORS.success : COLORS.danger },
              ]}
            >
              {available ? "Available" : "Unavailable"}
            </Text>
          </View>
          <Text style={styles.meta}>Capacity: {item.capacity} people</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Pressable
            style={[styles.button, !available && styles.buttonDisabled]}
            disabled={!available}
            onPress={() => navigation.navigate("BookStudyRoom", { roomId: item.id })}
          >
            <Text style={styles.buttonText}>Book room</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      renderItem={renderRoom}
      contentContainerStyle={styles.list}
      refreshing={refreshing}
      onRefresh={() => loadRooms(true)}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.meta}>No study rooms found.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, backgroundColor: COLORS.background, flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  image: { width: "100%", height: 160 },
  imagePlaceholder: { backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  placeholderText: { color: COLORS.textSecondary },
  cardBody: { padding: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, flexShrink: 1 },
  badge: { color: "#FFFFFF", fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  meta: { color: COLORS.textSecondary, marginTop: 4 },
  description: { color: COLORS.textPrimary, marginTop: 6 },
  button: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#FFFFFF", fontWeight: "600" },
  errorText: { color: COLORS.danger, marginBottom: 12, textAlign: "center" },
});