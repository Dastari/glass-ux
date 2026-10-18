/**
 * Status cells use the shared badges (src/ui/badge): StatusBadge for an endpoint state,
 * Badge with a tone and `marker="dot"` for any other status. Pass `size="sm"`, the badge
 * size for table rows. Re-exported so table code can keep importing it from the table.
 */
export { StatusBadge, type EndpointStatus, type StatusBadgeProps, type StatusKind } from "../../badge/index.js"
