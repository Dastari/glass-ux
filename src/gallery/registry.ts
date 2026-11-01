import type { ComponentType, LazyExoticComponent } from "react"
import { signoff } from "./signoff.js"
import { GROUPS, siteRuntime } from "./site.js"
import { site } from "./site.generated.js"
import type { SectionMeta, Signoff, SignoffStatus } from "./types.js"

export { GROUPS }

export interface GallerySection extends SectionMeta {
  signoff: Signoff
  Component: LazyExoticComponent<ComponentType>
}

/** Every gallery section that has both a `.meta` and a `.section` module, with its sign-off status (pending when unrecorded) and lazily loaded component, sorted by group then order. */
export const sections: GallerySection[] = siteRuntime(site).sections.map((section) => ({
  ...section,
  signoff: signoff[section.id] ?? { status: "pending" as const },
}))

/** How a sign-off status reads (the nav's status dots name themselves with it). */
export const SIGNOFF_LABELS: Record<SignoffStatus, string> = { pending: "Pending review", approved: "Approved", changes: "Changes requested" }

/** Returns the gallery section with the given id, or `undefined` when none matches. */
export function findSection(id: string) {
  return sections.find((section) => section.id === id)
}
