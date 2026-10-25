# Kanban

A board of columns and cards. Cards drag between and within columns with the pointer,
touch (a short press) or the keyboard (Space lifts, arrows move, Space drops), and every
move is announced. A column with a `limit` refuses cards once full and says why; a move the
host rejects flies back. Column headings sit on the canvas above their lanes; cards are
card tiles. Columns collapse to a strip that still takes drops. The board scrolls sideways
and scrolls itself while a card nears its edges; in a narrow container each column fills
the width and a switcher moves between them.

`import { Kanban } from "glass-ux/kanban"`

[Live examples](https://dastari.github.io/glass-ux/components/kanban)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | The board's accessible name. |
| cardLabel | `((card: C) => string) \| undefined` | See type | no | — | The card's name for announcements and its accessible name. Default `card.title`, else its id. |
| cards | `readonly C[] \| undefined` | See type | no | — | The cards (controlled). Order within a column is their order in this list. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| collapsedColumns | `readonly string[] \| undefined` | See type | no | — | Collapsed column ids (controlled). Collapsed columns still take dropped cards. |
| columns | `readonly KanbanColumn[]` | See type | yes | — | The columns, in order. |
| defaultCards | `readonly C[] \| undefined` | See type | no | — | The first cards when uncontrolled. |
| defaultCollapsedColumns | `readonly string[] \| undefined` | See type | no | NO_IDS | Collapsed column ids when uncontrolled. |
| headingLevel | `2 \| 3 \| 4 \| undefined` | 2, 3, 4 | no | 3 | Heading level of the column titles. Default 3. |
| labels | `Partial<{ readonly column: (title: string) => string; readonly count: (count: number, limit?: number) => string; readonly countLabel: (count: number, limit?: number) => string; readonly full: (title: string, limit: number) => string; readonly collapse: (title: string) => string; readonly expand: (title: string) => string; readonly addCard: "Add card"; readonly addCardTo: (title: string) => string; readonly empty: "No cards"; readonly columns: "Columns"; readonly previousColumn: "Previous column"; readonly nextColumn: "Next column"; readonly firstColumn: "This is the first column"; readonly lastColumn: "This is the last column"; readonly moveFailed: (title: string) => string; readonly loading: "Loading cards"; }> \| undefined` | See type | no | — | Replace any of the wording (see `kanbanMessages`). |
| loading | `boolean \| undefined` | false, true | no | false | Cards are loading: each column shows placeholders in the cards' places. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for the wording. Default the nearest `LocaleProvider`. |
| onAddCard | `((columnId: string) => void) \| undefined` | See type | no | — | Adds an "Add card" button under each column; called with the column's id. |
| onCardMove | `((move: KanbanMove<C>) => void \| Promise<unknown>) \| undefined` | See type | no | — | Called after a card moves. Return a promise to save it: the column shows as saving, and a rejection puts the card back where it was (reject with an Error whose message says why). |
| onCardsChange | `((cards: C[]) => void) \| undefined` | See type | no | — | Called with the whole list after a move, before `onCardMove` settles. Update `cards` here. |
| onCollapsedColumnsChange | `((ids: string[]) => void) \| undefined` | See type | no | — | Called with the collapsed column ids when the person collapses or expands one. |
| renderAddCard | `((column: KanbanColumn) => ReactNode) \| undefined` | See type | no | — | Content under each column instead of the "Add card" button: an inline form, a menu. |
| renderCard | `((card: C, state: { dragging: boolean; }) => ReactNode) \| undefined` | See type | no | — | The card's content inside its tile. Default: `KanbanCard` with `title` and `meta`. Buttons and links inside keep working. |
| style | `CSSProperties \| undefined` | See type | no | — | Layout only. |
