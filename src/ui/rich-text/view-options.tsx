import { richTextMessages } from "./messages.js"
import { IconCode, IconEye } from "../../icons/generated/icons.js";
import type { SegmentedOption } from "../segmented/index.js";

/** Shared presentation choices; Segmented owns their adaptive labels and keyboard behaviour. */
export function richTextViews(messages: typeof richTextMessages.defaults): SegmentedOption<"visual" | "markdown">[] { return [
  { value: "visual", label: messages.visual, icon: <IconEye /> },
  { value: "markdown", label: messages.markdown, icon: <IconCode /> },
] }
