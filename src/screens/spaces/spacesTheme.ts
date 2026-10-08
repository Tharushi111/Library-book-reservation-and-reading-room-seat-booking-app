import { COLORS } from "../../constants/colors";

const c = COLORS as unknown as Record<string, string | undefined>;

// Reuse the team's brand colours; add neutral colours for the redesigned Spaces flow.
export const theme = {
  primary: c.primary ?? "#0B4DA2",
  secondary: c.secondary ?? "#F58220",
  background: "#F6F8FC",
  surface: "#FFFFFF",
  textPrimary: "#14233F",
  textSecondary: "#718099",
  border: "#E8EDF5",
  success: c.success ?? c.available ?? "#149968",
  warning: c.warning ?? "#E58B27",
  danger: c.danger ?? c.borrowed ?? "#E34D58",
  paleBlue: "#EAF3FF",
  paleOrange: "#FFF1E7",
  paleGreen: "#E8F8F1",
  paleRed: "#FDECEF",
  palePurple: "#F2EDFF",
  navy: "#0E2346",
  white: "#FFFFFF",
};
