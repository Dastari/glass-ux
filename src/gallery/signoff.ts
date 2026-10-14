import type { Signoff } from "./types.js"

/**
 * Review decisions, recorded by section id. Only the reviewer's decision changes an entry;
 * a section with no entry is pending.
 */
export const signoff: Record<string, Signoff> = {
  "data-table-filters": { status: "approved", date: "2026-10-13", note: "Re-approved with the search field (R16.8)." },
}
