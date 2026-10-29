# Relationship canvas

`glass-ux/relationship-canvas` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Record cards joined row to row on a pannable, zoomable dot grid. Each card has a header and
rows; each edge runs from a row (or a header) on one card to a row on another card or the same
one. It draws a schema's tables and relations, a class diagram, an API's resources or a
workflow's inputs and outputs. A card can link to several cards, to itself and back round a
cycle. For a tree of devices, use `TopologyCanvas`.

```tsx
import { RelationshipCanvas } from "glass-ux/relationship-canvas"

<RelationshipCanvas
  label="Schema"
  cards={tables.map((table) => ({
    id: table.id,
    title: table.name,
    icon: <IconTable />,
    rows: table.fields.map((field) => ({
      id: field.id,
      label: field.name,
      detail: field.nullable ? `${field.type}?` : field.type,
      icon: field.primaryKey ? <IconKey /> : undefined,
      tone: field.primaryKey ? "warning" : undefined,
    })),
  }))}
  edges={relations.map((relation) => ({
    id: relation.id,
    from: { card: relation.table, row: relation.field },
    to: { card: relation.target, row: relation.targetField },
    label: relation.name,
    cardinality: relation.many ? "many" : "one",
  }))}
  positions={layout}
  onPositionsChange={saveLayout}
  onOpen={(card) => openTable(card.id)}
/>
```

- **Cards:** `{ id, title, icon?, badge?, rows, data? }`. The badge defaults to the row count;
  `null` hides it. A row is `{ id, label, detail?, icon?, tone? }`: the detail is trailing text
  in the monospace face, and a row without an icon keeps the slot so names line up.
- **Edges:** `{ id, from: { card, row? }, to: { card, row? }, label?, cardinality? }`. An edge
  leaves the side of its source that faces the target and ends in an arrowhead; a link to the
  same card loops out on its right, and parallel edges fan out. `cardinality: "many"` adds
  "many" to the label. Edges to cards or rows that do not exist are skipped, and duplicate ids
  are reported, with a warning in development.
- **Positions:** `positions` (controlled) or `defaultPositions`, in world pixels.
  `onPositionsChange(positions, { reason, cardId })` reports every card's position after a
  drag (on release), a Shift+arrow move or Auto layout. Cards without a position are placed by
  the automatic layout below the others; positions are visual only, so persist them where the
  application keeps preferences. `movable={false}` fixes them and hides Auto layout.
- **Auto layout:** a card sits one column right of the deepest card it links to, so referenced
  cards stand to the left; cycles break where they close. Without edges, a near-square grid.
- **Selection:** `selectedId` / `defaultSelectedId` / `onSelectedIdChange`, as in
  `TopologyCanvas`. The selected card's edges draw in the accent. `onOpen` runs on
  double-click and Enter.
- **Pointer:** drag the background or a card's body to pan; a card's header drags the card.
  The wheel pans, and Ctrl or Command with the wheel (or a trackpad pinch) zooms around the
  pointer. Two fingers pinch.
- **Keyboard:** one tab stop. The arrow keys travel to the nearest card in that direction,
  Shift with an arrow moves the focused card 16 pixels, Home and End go to the first and last
  card, Enter opens (or selects without `onOpen`), Space toggles the selection, Escape clears
  it, and + − 0 zoom and fit. Each card's accessible description lists its rows and links.
- **Controls:** zoom in, the zoom readout, zoom out, fit and Auto layout float at the top right,
  as `TopologyCanvas`'s do. `controls={false}` hides them; `actionsRef` hands the same commands
  to a host toolbar.
- **Frame:** a hairline and the surface radius by default; `framed={false}` inside a Panel.
  `grid={false}` drops the dot grid. It is a fill component: give it a definite height.
- **Sizes:** card width, header and row heights come from tokens (`--fa-relationship-*`), so
  density and UI scale size the diagram. Heights are computed from the row count, never
  measured.
- **Limits:** edges are curves, not routed around cards, and positions do not mirror in
  right-to-left languages. Past a few dozen cards, offer a list or a filtered view.
