import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "./spacesTheme";

export function ScreenHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const canGoBack = navigation.canGoBack();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {canGoBack ? (
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={theme.white} />
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

export function PrimaryButton({
  label, onPress, disabled, loading, variant = "primary", icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "danger";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const isDisabled = disabled || loading;
  const textColor = variant === "outline" ? theme.primary : theme.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.buttonOutline,
        variant === "danger" && styles.buttonDanger,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : (
        <View style={styles.buttonInner}>
          <Text style={[styles.buttonText, variant === "outline" && styles.buttonTextOutline]}>{label}</Text>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export function StatusBadge({ label, color }: { label: string; color: string }) {
  const bg = color === theme.success ? theme.paleGreen : color === theme.danger ? theme.paleRed : theme.paleOrange;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label, sub, selected, disabled, onPress }: {
  label: string; sub?: string; selected: boolean; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {sub ? <Text style={[styles.chipSub, selected && styles.chipSubSelected]}>{sub}</Text> : null}
    </Pressable>
  );
}

export function LoadingView() {
  return (
    <View style={styles.center}>
      <View style={styles.loadingIcon}><Ionicons name="library-outline" size={30} color={theme.primary} /></View>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.centerHint}>Loading spaces...</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <View style={[styles.loadingIcon, { backgroundColor: theme.paleRed }]}>
        <Ionicons name="alert-circle-outline" size={32} color={theme.danger} />
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{message}</Text>
      <View style={{ width: "100%", maxWidth: 240, marginTop: 10 }}>
        <PrimaryButton label="Try again" icon="refresh-outline" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, backgroundColor: theme.primary },
  back: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", color: theme.white, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  button: { backgroundColor: theme.primary, borderRadius: 13, paddingHorizontal: 18, minHeight: 50, alignItems: "center", justifyContent: "center" },
  buttonOutline: { backgroundColor: theme.white, borderWidth: 1.5, borderColor: theme.primary },
  buttonDanger: { backgroundColor: theme.danger },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  buttonInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  buttonText: { color: theme.white, fontSize: 14, fontWeight: "800" },
  buttonTextOutline: { color: theme.primary },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  chip: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.white, alignItems: "center", justifyContent: "center", minWidth: 78, minHeight: 42 },
  chipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipDisabled: { opacity: 0.38 },
  chipText: { fontSize: 13, fontWeight: "700", color: theme.textPrimary },
  chipSub: { fontSize: 10, color: theme.danger, fontWeight: "600", marginTop: 3 },
  chipTextSelected: { color: theme.white },
  chipSubSelected: { color: "#E9F1FF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26, gap: 13, backgroundColor: theme.background },
  loadingIcon: { width: 70, height: 70, borderRadius: 22, backgroundColor: theme.paleBlue, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  centerHint: { fontSize: 13, color: theme.textSecondary },
  errorTitle: { fontSize: 19, fontWeight: "800", color: theme.textPrimary },
  errorText: { color: theme.textSecondary, textAlign: "center", fontSize: 14, lineHeight: 21 },
});
