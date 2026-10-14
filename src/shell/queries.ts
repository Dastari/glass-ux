/**
 * Shell breakpoints (R21.1), as viewport queries. Only the shell reads the viewport
 * (R7.1); use with useMediaQuery from ~/lib/use-media-query.
 */
export const SHELL_QUERIES = {
  phone: "(width < 48rem)",
  tablet: "(48rem <= width < 64rem)",
  desktop: "(width >= 64rem)",
  dockedInspector: "(width >= 80rem)",
  wide: "(width >= 120rem)",
  ultraWide: "(width >= 160rem)",
} as const
