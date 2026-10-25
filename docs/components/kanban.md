# Kanban

`glass-ux/kanban` · [Live component catalogue](https://dastari.github.io/glass-ux/components/kanban)

A board of columns and cards, built on [drag and drop](drag-drop.md). Cards move between and
within columns by pointer, touch or keyboard; columns can limit work in progress and collapse.

```tsx
import { Kanban, KanbanCard, type KanbanColumn, type KanbanItem } from "glass-ux/kanban";

const columns: KanbanColumn[] = [
  { id: "new", title: "New" },
  { id: "progress", title: "In progress", limit: 3 },
  { id: "done", title: "Done" },
];

function Board() {
  const [cards, setCards] = useState<KanbanItem[]>(initial);
  return (
    <div className="h-150">
      <Kanban
        aria-label="Service desk"
        columns={columns}
        cards={cards}
        onCardsChange={setCards}
        onCardMove={(move) => api.moveTicket(move.cardId, move.to, move.index)}
        onAddCard={(columnId) => openNewTicket(columnId)}
      />
    </div>
  );
}
```

## Cards and moves

- A card is `{ id, columnId, … }`; the order of `cards` is each column's order. The default
  card shows `title` and `meta`. `renderCard(card, { dragging })` replaces its content; use
  `KanbanCard` there to add `badges` (start of the foot) and `avatars` (end). Buttons and links
  inside a card keep their own behaviour.
- `cards`/`onCardsChange` (or `defaultCards`) hold the list. A drop calls `onCardsChange` with
  the moved list at once, then `onCardMove({ cardId, card, from, to, fromIndex, index, input })`.
- Return a promise from `onCardMove` to save: the column shows as saving (`data-drop-state`
  `pending`). A rejection flies the card back to where it was, shows the column in error and
  announces the reason: reject with an `Error` whose message says why ("Only tickets in
  progress can be resolved").
- `moveCard(cards, cardId, { columnId, index })`, `cardsIn` and `placeOf` apply the same moves
  to your data elsewhere, for a "Move to" menu (R11.2: dragging must not be the only way).

## Limits, collapse and adding

- **`limit`** on a column: once it holds that many cards it refuses cards from other columns.
  The reason ("In progress is at its limit of 3") appears under the drag preview, is announced,
  and a keyboard drop there stays lifted. Its count reads "3 / 3" with the warning tint.
- **Collapse:** each column's heading has a collapse button; a collapsed column is a strip
  with its name and count that still takes dropped cards (they join its end).
  `collapsedColumns`/`defaultCollapsedColumns`/`onCollapsedColumnsChange` control it.
- **Adding:** `onAddCard(columnId)` puts an "Add card" button under each column;
  `renderAddCard(column)` puts your own content there instead.

## Layout

Column headings sit on the canvas, as page framing does (R4.6); each column's cards sit in a
quiet well, the drop zone, as `card` tiles (`Surface material="card"`), so a long board costs
no blur per card (R4.8). Do not wrap the board or its columns in panels (R5.10). The board fills
its container's height; each column scrolls on its own, and the board scrolls sideways. During
a drag the board and the columns scroll as the card nears their edges.

Below 40 rem each column fills the board and snaps into place, with a switcher above (previous,
the column menu with counts, next). Swiping still scrolls between columns.

`loading` shows placeholder cards in each column; headings and counts keep their geometry.

## Keyboard and screen readers

Each card is one tab stop with the drag-and-drop instructions as its description. Space or
Enter lifts it; up and down move it within its column; left and right move it to the previous
or next column (past a full one, which says why); Space or Enter drops it; Escape cancels.
Lifts, moves, refusals, drops and failed saves are announced in the board's polite live region.
