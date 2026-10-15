export {
  OrgAvatar,
  OrgSwitcher,
  OrgSwitcherPanel,
  describeOrgScope,
  type OrgAvatarProps,
  type OrgAvatarSize,
  type OrgSwitcherPanelProps,
  type OrgSwitcherProps,
} from "./org-switcher.js";
export {
  DEFAULT_SWITCHER_LABELS,
  buildOrgTree,
  matchRank,
  orgCode,
  orgInitials,
  orgTint,
  pushRecent,
  scopeIds,
  switcherGroups,
  type OrgTint,
  type OrgTree,
  type SwitcherGroup,
  type SwitcherLabels,
  type SwitcherOrganisation,
  type SwitcherRow,
} from "./model.js";
export { useRecentOrganisations } from "./recent.js";
export type { OrgSwitcherRemote } from "./remote.js";
