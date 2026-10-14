import { configureBrand, type BrandSource } from "../../ui/brand/index.js";
import {
  IconDashboard,
  IconFolder,
  IconUsers,
  IconTickets,
} from "../../icons/generated/icons.js";
import logo from "../assets/glass-ux-brand.json";
export const DEMO_LOGO: BrandSource = logo as BrandSource;
export const BRAND_SOURCES = {
  product: DEMO_LOGO,
  wordmark: { ...DEMO_LOGO, id: "glass-ux-wordmark" },
  ai: { ...DEMO_LOGO, id: "glass-ux-assistant" },
};
export function configureDemoBrand() {
  configureBrand({
    marks: BRAND_SOURCES,
    tones: "brand",
    brandPalette: "aurora",
  });
}
export const WORKSPACE_SETTINGS = {
  label: "Workspace settings",
  shortcut: "mod+,",
};
export const ORGANISATION_SETTINGS = {
  label: "Organisation settings",
  shortcut: "mod+shift+,",
};
export const moduleRail = (_module: string) => [
  { label: "Overview", icon: IconDashboard, shortcut: "mod+1" },
  { label: "Projects", icon: IconFolder, shortcut: "mod+2" },
  { label: "People", icon: IconUsers, shortcut: "mod+3" },
  { label: "Requests", icon: IconTickets, shortcut: "mod+4" },
];
