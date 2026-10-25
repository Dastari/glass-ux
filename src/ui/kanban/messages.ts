import { defineMessages } from "../../lib/i18n/catalog.js"

/** The board's English wording. Translate it with a language pack or `labels`. */
export const kanbanMessages = defineMessages("kanban", {
  /** A column's drop zone and list: "In progress". */
  column: (title: string) => title,
  /** The count beside a column title: "3", or "3 / 4" against a limit. */
  count: (count: number, limit?: number) => (limit === undefined ? String(count) : `${count} / ${limit}`),
  /** Its accessible name. */
  countLabel: (count: number, limit?: number) => `${count} ${count === 1 ? "card" : "cards"}${limit === undefined ? "" : `, limit ${limit}`}`,
  /** Why a full column refuses a card. */
  full: (title: string, limit: number) => `${title} is at its limit of ${limit}`,
  collapse: (title: string) => `Collapse ${title}`,
  expand: (title: string) => `Expand ${title}`,
  addCard: "Add card",
  addCardTo: (title: string) => `Add card to ${title}`,
  empty: "No cards",
  /** The column switcher on a narrow board. */
  columns: "Columns",
  previousColumn: "Previous column",
  nextColumn: "Next column",
  /** Why previous / next is unavailable. */
  firstColumn: "This is the first column",
  lastColumn: "This is the last column",
  /** A move the host refused, when it gave no reason. */
  moveFailed: (title: string) => `Could not move to ${title}`,
  loading: "Loading cards",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    kanban: typeof kanbanMessages.defaults
  }
}

/** The board's messages, as `labels` takes them. */
export type KanbanMessages = typeof kanbanMessages.defaults
