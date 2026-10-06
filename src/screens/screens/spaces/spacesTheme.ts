import { COLORS } from "../../constants/colors";

// Reads the shared COLORS and falls back to the team's palette if a key name differs.
const c = COLORS as unknown as Record<string, string | undefined>;

export const theme = {
  primary: c.primary ?? "#0B4DA2",
  secondary: c.secondary ?? "#F58220",
  background: c.background ?? "#FFFFFF",
  surface: c.surface ?? "#F7F9FC",
  textPrimary: c.textPrimary ?? "#1F2937",
  textSecondary: c.textSecondary ?? "#6B7280",
  border: c.border ?? "#E5E7EB",
  success: c.success ?? c.available ?? "#22C55E",
  warning: c.warning ?? "#F59E0B",
  danger: c.danger ?? c.borrowed ?? "#EF4444",
};
