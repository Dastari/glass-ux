import { lazy, type ComponentType, type LazyExoticComponent } from "react"
import { signoff } from "./signoff.js"
import type { SectionGroup, SectionMeta, Signoff, SignoffStatus } from "./types.js"

const metas = import.meta.glob<SectionMeta>("./sections/*.meta.js", { eager: true, import: "meta" })
const loaders = import.meta.glob<{ default: ComponentType }>("./sections/*.section.js")

export interface GallerySection extends SectionMeta {
  signoff: Signoff
  Component: LazyExoticComponent<ComponentType>
}

export const GROUPS: SectionGroup[] = ["Foundations", "Components", "Patterns", "Charts", "AI", "Screens"]

export const sections: GallerySection[] = Object.entries(metas)
  .flatMap(([path, meta]) => {
    const loader = loaders[path.replace(/\.meta\.js$/, ".section.js")]
    if (!loader) return []
    return [{ ...meta, signoff: signoff[meta.id] ?? { status: "pending" as const }, Component: lazy(loader) }]
  })
  .toSorted((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order)

/** How a sign-off status reads (the nav's status dots name themselves with it). */
export const SIGNOFF_LABELS: Record<SignoffStatus, string> = { pending: "Pending review", approved: "Approved", changes: "Changes requested" }

export function findSection(id: string) {
  return sections.find((section) => section.id === id)
}
