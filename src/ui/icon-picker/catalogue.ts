import { iconRegistry } from "../../icons/generated/registry.js"
import type { IconComponent } from "../icon/index.js"
import { ICON_GROUPS, ICON_KEYWORDS, type IconGroupId } from "./icon-data.js"

/** One icon of the set, as a picker lists it. */
export interface IconCatalogueEntry {
  /** The icon's name ("air-start"): `IconAirStart` from `glass-ux/icons`, and the value IconPicker stores. */
  readonly name: string
  /** The icon component. */
  readonly Icon: IconComponent
  /** The group it is filed in. */
  readonly group: IconGroupId
  /** Other words it is found by ("GPU ground power unit"), lower case. Empty when it has none. */
  readonly keywords: string
}

function build(): readonly IconCatalogueEntry[] {
  const groupOf = new Map<string, IconGroupId>()
  for (const [group, names] of ICON_GROUPS) for (const name of names) if (!groupOf.has(name)) groupOf.set(name, group)
  const order = new Map(ICON_GROUPS.flatMap(([, names]) => names).map((name, index) => [name, index]))
  return iconRegistry
    .map((entry) => ({ name: entry.name, Icon: entry.Icon, group: groupOf.get(entry.name) ?? "other", keywords: (ICON_KEYWORDS.get(entry.name) ?? "").toLowerCase() }))
    .sort((a, b) => (order.get(a.name) ?? Infinity) - (order.get(b.name) ?? Infinity) || a.name.localeCompare(b.name))
}

/**
 * Every icon in `glass-ux/icons` with its name, group and search words, in the order a picker
 * shows them (by group). For an icon picker of your own, or to check a stored name: importing
 * it brings in the whole set, so import icons by name everywhere else.
 */
export const iconCatalogue: readonly IconCatalogueEntry[] = /* @__PURE__ */ build()

const squash = (text: string) => text.toLowerCase().replaceAll(/[\s_-]+/g, "")

/**
 * The entries a search matches, best first: a name that starts with the query, then a name or a
 * word that contains it. Spaces and hyphens are ignored ("air start" finds air-start), and an
 * `Icon` prefix is dropped ("IconSearch" finds search). An empty query returns them all.
 */
export function searchIcons(query: string, entries: readonly IconCatalogueEntry[] = iconCatalogue): IconCatalogueEntry[] {
  const needle = squash(query.trim().replace(/^Icon(?=[A-Z])/, ""))
  if (!needle) return [...entries]
  const starts: IconCatalogueEntry[] = []
  const contains: IconCatalogueEntry[] = []
  for (const entry of entries) {
    const name = squash(entry.name)
    if (name.startsWith(needle)) starts.push(entry)
    else if (name.includes(needle) || entry.keywords.split(" ").some((word) => squash(word).startsWith(needle)) || squash(entry.keywords).includes(needle)) contains.push(entry)
  }
  return [...starts, ...contains]
}
