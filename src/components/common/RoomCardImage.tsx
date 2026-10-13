import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  ImageStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RoomType } from "../../types";

interface RoomCardImageProps {
  imageUrl?: string | null;
  roomName: string;
  roomType: RoomType;
  capacity?: number;
  location?: string;
  height?: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export const RoomCardImage: React.FC<RoomCardImageProps> = ({
  imageUrl,
  roomName,
  roomType,
  capacity,
  location,
  height = 140,
  width,
  style,
  borderRadius = 12,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    setImageError(false);
    setImageLoading(Boolean(imageUrl && imageUrl.trim().length > 0));
  }, [imageUrl]);

  const trimmedUrl = imageUrl ? imageUrl.trim() : "";
  const isValidUrl =
    Boolean(trimmedUrl) &&
    (trimmedUrl.startsWith("http://") ||
      trimmedUrl.startsWith("https://") ||
      trimmedUrl.startsWith("file://"));

  const isConference = roomType === "conference_room";
  const isCollaborative = roomType === "collaborative_space";

  if (isValidUrl && !imageError) {
    return (
      <View
        style={[
          styles.container,
          { height, borderRadius },
          width !== undefined ? { width } : {},
          style,
        ]}
      >
        {imageLoading && (
          <View style={[StyleSheet.absoluteFill, styles.loadingCenter]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}
        <Image
          source={{ uri: trimmedUrl }}
          style={[styles.image, { borderRadius }]}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            console.log(`[RoomImage] Image failed to load for "${roomName}", falling back to placeholder.`);
            setImageLoading(false);
            setImageError(true);
          }}
        />
        <View style={styles.photoBadge}>
          <Text style={styles.photoBadgeText}>
            {isConference
              ? "STAFF ONLY"
              : isCollaborative
              ? "COLLABORATIVE"
              : "STUDY SPACE"}
          </Text>
        </View>
      </View>
    );
  }

  // Visual styling based on room type
  const themeConfig = isConference
    ? {
        bg: "#1E1B4B",
        patternColor: "#312E81",
        accent: "#A78BFA",
        badgeBg: "#EDE9FE",
        badgeText: "#5B21B6",
        badgeLabel: "STAFF & FACULTY ONLY",
        icon: "business-outline" as const,
        categoryLabel: "Executive Conference Room",
      }
    : isCollaborative
    ? {
        bg: "#431407",
        patternColor: "#7C2D12",
        accent: "#FB923C",
        badgeBg: "#FFEDD5",
        badgeText: "#9A3412",
        badgeLabel: "STUDENT COLLABORATION",
        icon: "people-outline" as const,
        categoryLabel: "Collaborative Space",
      }
    : {
        bg: "#0B2B5C",
        patternColor: "#173D89",
        accent: "#60A5FA",
        badgeBg: "#DBEAFE",
        badgeText: "#1E40AF",
        badgeLabel: "STUDY SPACE",
        icon: "library-outline" as const,
        categoryLabel: "Group Study Room",
      };

  return (
    <View
      style={[
        styles.placeholderContainer,
        { backgroundColor: themeConfig.bg, height, borderRadius },
        width !== undefined ? { width } : {},
        style,
      ]}
    >
      {/* Subtle decorative background circles */}
      <View
        style={[
          styles.decorCircle,
          { backgroundColor: themeConfig.patternColor, right: -20, top: -20, width: height, height },
        ]}
      />
      <View
        style={[
          styles.decorCircle,
          { backgroundColor: themeConfig.patternColor, left: -40, bottom: -40, width: height * 0.8, height: height * 0.8 },
        ]}
      />

      {/* Content Overlay */}
      <View style={styles.placeholderContent}>
        {/* Top bar: Category & Badge */}
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: themeConfig.badgeBg }]}>
            <Text style={[styles.badgeText, { color: themeConfig.badgeText }]}>
              {themeConfig.badgeLabel}
            </Text>
          </View>

          {capacity ? (
            <View style={styles.capacityPill}>
              <Ionicons name="people" size={12} color="#FFFFFF" />
              <Text style={styles.capacityText}>Up to {capacity}</Text>
            </View>
          ) : null}
        </View>

        {/* Center: Large Room Icon and Title */}
        <View style={styles.centerSection}>
          <View style={[styles.iconCircle, { borderColor: themeConfig.accent }]}>
            <Ionicons name={themeConfig.icon} size={26} color={themeConfig.accent} />
          </View>
          <View style={styles.titleCol}>
            <Text style={styles.roomName} numberOfLines={1}>
              {roomName}
            </Text>
            <Text style={[styles.categorySubtitle, { color: themeConfig.accent }]} numberOfLines={1}>
              {themeConfig.categoryLabel}
            </Text>
          </View>
        </View>

        {/* Footer: Location */}
        <View style={styles.footerRow}>
          <View style={styles.locationWrapper}>
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text style={styles.locationText} numberOfLines={1}>
              {location || "SLIIT Main Campus Library"}
            </Text>
          </View>
          <Text style={styles.sliitWatermark}>SLIIT LIBRARY</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  loadingCenter: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    zIndex: 1,
  },
  photoBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    overflow: "hidden",
    position: "relative",
    justifyContent: "space-between",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.45,
  },
  placeholderContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  capacityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  capacityText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  centerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  titleCol: {
    flex: 1,
  },
  roomName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  categorySubtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 6,
  },
  locationWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "500",
  },
  sliitWatermark: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});

export default RoomCardImage;
