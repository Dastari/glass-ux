import { IconCode, IconEye } from "../../icons/generated/icons.js";
import type { SegmentedOption } from "../segmented/index.js";

/** Shared presentation choices; Segmented owns their adaptive labels and keyboard behaviour. */
export const RICH_TEXT_VIEWS: SegmentedOption<"visual" | "markdown">[] = [
  { value: "visual", label: "Visual", icon: <IconEye /> },
  { value: "markdown", label: "Markdown", icon: <IconCode /> },
];
