import "./messages.js"
export {
  ContextAvatar,
  ContextSwitcher,
  ContextSwitcherPanel,
  describeContext,
  type ContextAvatarProps,
  type ContextAvatarSize,
  type ContextSwitcherPanelProps,
  type ContextSwitcherProps,
} from "./context-switcher.js";
export {
  DEFAULT_SWITCHER_LABELS,
  buildContextTree,
  contextCode,
  contextInitials,
  contextTint,
  matchRank,
  pushRecent,
  scopeIds,
  switcherGroups,
  switcherLabels,
  type ContextItem,
  type ContextTint,
  type ContextTree,
  type SwitcherGroup,
  type SwitcherLabels,
  type SwitcherNoun,
  type SwitcherRow,
  type SwitcherRowKind,
} from "./model.js";
export { useRecentContexts } from "./recent.js";
export type { ContextSwitcherRemote } from "./remote.js";
