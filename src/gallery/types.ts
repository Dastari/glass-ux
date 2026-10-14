export type SectionGroup = "Foundations" | "Components" | "Patterns" | "Charts" | "AI" | "Screens"

export interface SectionMeta {
  /** URL slug: /design/<id>. Matches the file names <id>.meta.ts / <id>.section.tsx. */
  id: string
  title: string
  group: SectionGroup
  /** Sort order within the group (10, 20, 30 … leaves room to insert). */
  order: number
  /** One sentence shown under the title. */
  summary: string
}

export type SignoffStatus = "pending" | "approved" | "changes"

export interface Signoff {
  /** Current operation or connection status. */
  status: SignoffStatus
  /** The reviewer's note when changes are requested. */
  note?: string
  /** ISO date of the decision. */
  date?: string
}
