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

interface BookCoverImageProps {
  coverUrl?: string | null;
  title: string;
  author?: string | null;
  category?: string | null;
  style?: StyleProp<ViewStyle | ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  width?: number;
  height?: number;
  borderRadius?: number;
  resizeMode?: "cover" | "contain";
  showCategoryTag?: boolean;
}

// Category palette for academic book cover placeholders
function getCategoryColor(category?: string | null): { bg: string; accent: string; text: string } {
  const cat = (category || "").toLowerCase();

  if (cat.includes("software") || cat.includes("architecture")) {
    return { bg: "#0F2B5C", accent: "#38BDF8", text: "#FFFFFF" };
  }
  if (cat.includes("program") || cat.includes("java") || cat.includes("python") || cat.includes("c++")) {
    return { bg: "#1E3A8A", accent: "#60A5FA", text: "#FFFFFF" };
  }
  if (cat.includes("database") || cat.includes("data intensive")) {
    return { bg: "#044E54", accent: "#2DD4BF", text: "#FFFFFF" };
  }
  if (cat.includes("ai") || cat.includes("artificial") || cat.includes("machine") || cat.includes("intelligence")) {
    return { bg: "#4C1D95", accent: "#C084FC", text: "#FFFFFF" };
  }
  if (cat.includes("security") || cat.includes("cyber")) {
    return { bg: "#7F1D1D", accent: "#F87171", text: "#FFFFFF" };
  }
  if (cat.includes("network")) {
    return { bg: "#075985", accent: "#38BDF8", text: "#FFFFFF" };
  }
  if (cat.includes("algorithm") || cat.includes("structure")) {
    return { bg: "#064E3B", accent: "#34D399", text: "#FFFFFF" };
  }
  if (cat.includes("web") || cat.includes("mobile") || cat.includes("react")) {
    return { bg: "#581C87", accent: "#A78BFA", text: "#FFFFFF" };
  }
  if (cat.includes("ui") || cat.includes("ux") || cat.includes("design") || cat.includes("interaction")) {
    return { bg: "#7C2D12", accent: "#FB923C", text: "#FFFFFF" };
  }
  if (cat.includes("business") || cat.includes("startup") || cat.includes("management")) {
    return { bg: "#312E81", accent: "#818CF8", text: "#FFFFFF" };
  }
  if (cat.includes("math") || cat.includes("statistic") || cat.includes("probability")) {
    return { bg: "#1E293B", accent: "#94A3B8", text: "#FFFFFF" };
  }
  if (cat.includes("project") || cat.includes("agile") || cat.includes("scrum")) {
    return { bg: "#713F12", accent: "#FBBF24", text: "#FFFFFF" };
  }

  // Default SLIIT navy
  return { bg: "#0B4DA2", accent: "#F58220", text: "#FFFFFF" };
}

export const BookCoverImage: React.FC<BookCoverImageProps> = ({
  coverUrl,
  title,
  author,
  category,
  style,
  containerStyle,
  width,
  height,
  borderRadius = 8,
  resizeMode = "contain",
  showCategoryTag = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    setImageError(false);
    setImageLoading(Boolean(coverUrl && coverUrl.trim().length > 0));
  }, [coverUrl]);

  const trimmedUrl = coverUrl ? coverUrl.trim() : "";
  // Check if URL is valid http/https/file and not a blank string
  const isValidUrl =
    Boolean(trimmedUrl) &&
    (trimmedUrl.startsWith("http://") ||
      trimmedUrl.startsWith("https://") ||
      trimmedUrl.startsWith("file://"));

  const colors = getCategoryColor(category);

  // Compute resolved width: explicit width, or derived from standard book ratio (height * 0.72), or 100%
  const resolvedWidth =
    width !== undefined
      ? width
      : height !== undefined
      ? Math.round(height * 0.72)
      : "100%";

  // If we have a valid URL and no load error, render the image with loading indicator and fallback
  if (isValidUrl && !imageError) {
    return (
      <View
        style={[
          styles.container,
          { borderRadius },
          { width: resolvedWidth as any },
          height !== undefined ? { height } : {},
          containerStyle,
        ]}
      >
        {imageLoading && (
          <View style={[StyleSheet.absoluteFill, styles.loadingCenter]}>
            <ActivityIndicator size="small" color="#173D89" />
          </View>
        )}
        <Image
          source={{ uri: trimmedUrl }}
          style={[
            styles.image,
            { borderRadius },
            style as ImageStyle,
          ]}
          resizeMode={resizeMode}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            console.log(`[BookCover] Image failed to load for "${title}", falling back to placeholder.`);
            setImageLoading(false);
            setImageError(true);
          }}
        />
      </View>
    );
  }

  // Clean, attractive academic book jacket placeholder
  const isCompact = (typeof resolvedWidth === "number" && resolvedWidth < 90) || (height && height < 120);

  return (
    <View
      style={[
        styles.placeholderContainer,
        { backgroundColor: colors.bg, borderRadius },
        { width: resolvedWidth as any },
        height !== undefined ? { height } : {},
        containerStyle,
        style as ViewStyle,
      ]}
    >
      {/* Book spine accent line */}
      <View style={[styles.spine, { backgroundColor: colors.accent }]} />

      <View style={styles.placeholderContent}>
        {/* Category tag */}
        {showCategoryTag && !isCompact && category ? (
          <View style={styles.categoryPill}>
            <Text style={[styles.categoryText, { color: colors.accent }]} numberOfLines={1}>
              {category.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {/* Center icon / emblem */}
        <View style={styles.emblemContainer}>
          <Ionicons
            name="book"
            size={isCompact ? 22 : 32}
            color={colors.accent}
          />
        </View>

        {/* Book Title */}
        <Text
          style={[
            styles.bookTitle,
            isCompact ? styles.bookTitleCompact : styles.bookTitleNormal,
            { color: colors.text },
          ]}
          numberOfLines={isCompact ? 3 : 4}
        >
          {title}
        </Text>

        {/* Author at bottom */}
        {author && !isCompact ? (
          <Text style={styles.authorText} numberOfLines={1}>
            {author}
          </Text>
        ) : null}

        {/* SLIIT seal line */}
        {!isCompact ? (
          <View style={styles.libraryStamp}>
            <Text style={styles.libraryStampText}>SLIIT LIBRARY</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  loadingCenter: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  spine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    opacity: 0.85,
  },
  placeholderContent: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: "space-between",
  },
  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  emblemContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
    opacity: 0.9,
  },
  bookTitle: {
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  bookTitleNormal: {
    fontSize: 11,
    lineHeight: 14,
  },
  bookTitleCompact: {
    fontSize: 9,
    lineHeight: 11,
  },
  authorText: {
    color: "#E2E8F0",
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.85,
  },
  libraryStamp: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 3,
    alignItems: "center",
  },
  libraryStampText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});

export default BookCoverImage;
