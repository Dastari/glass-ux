import { resolveDataTableMessages } from "../messages.js";
import { getLocale } from "../../../lib/locale/locale.js";
import type { ReactNode } from "react";

/**
 * The empty state's line while searching or filtering (R2.5, R16.8), built from the table's
 * noun: `No rows match "q3" and 2 filters`, `No rows match "q3"`, `No rows match these
 * filters`, or the table's own line when neither is applied.
 */
export function emptyText(
  noun: { other: string },
  query: string,
  filterCount: number,
  fallback: ReactNode,
  m = resolveDataTableMessages(getLocale()),
): ReactNode {
  if (query && filterCount)
    return m.emptyQueryFilters(noun.other, query, filterCount);
  if (query) return m.emptyQuery(noun.other, query);
  if (filterCount) return m.emptyFilters(noun.other);
  return fallback;
}
