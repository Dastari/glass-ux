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
  /** The button on a card, and its menu's name, that moves the card without dragging: "Move Printer offline". */
  moveCard: (label: string) => `Move ${label}`,
  /** A menu row that moves the card to the end of another column. */
  moveToColumn: (title: string) => `Move to ${title}`,
  moveUp: "Move up",
  moveDown: "Move down",
  /** What a menu move announces once done: "Moved Printer offline to Triage, position 2 of 3." */
  movedTo: ({ label, column, position, count }: { label: string; column: string; position: number; count: number }) => `Moved ${label} to ${column}, position ${position} of ${count}.`,
  /** The title of the notice when a menu move was not saved. */
  moveNotSaved: (label: string) => `${label} was not moved`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    kanban: typeof kanbanMessages.defaults
  }
}

/** The board's messages, as `labels` takes them. */
export type KanbanMessages = typeof kanbanMessages.defaults
