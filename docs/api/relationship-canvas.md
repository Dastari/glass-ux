# RelationshipCanvas

A pannable, zoomable diagram of record cards joined by row-to-row edges. Cards can be
dragged by their header or moved with Shift and the arrow keys, and Auto layout arranges
them; the host keeps the positions through `onPositionsChange`. Selecting a card draws its
edges in the accent. It shows a skeleton while `cards` is undefined.

Keyboard: the arrow keys move to the nearest card in that direction, Shift with an arrow
moves the focused card, Home and End go to the first and last card, Enter opens (or
selects), Space toggles the selection, Escape clears it, + and − zoom and 0 fits.

`import { RelationshipCanvas } from "glass-ux/relationship-canvas"`

[Live examples](https://dastari.github.io/glass-ux/components/relationship-canvas)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `RefObject<RelationshipCanvasActions \| null> \| undefined` | See type | no | — | Receives the canvas's commands (zoom, fit, auto layout) for a host toolbar. |
| cards | `readonly RelationshipCard<T>[] \| undefined` | See type | yes | — | undefined while loading: the skeleton shows in the same box. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| controls | `boolean \| undefined` | false, true | no | true | Show the zoom, fit and Auto layout controls over the canvas. Default true. |
| defaultPositions | `Readonly<Record<string, RelationshipPoint>> \| undefined` | See type | no | — | Initial positions while uncontrolled. |
| defaultSelectedId | `string \| null \| undefined` | See type | no | — | The card selected at first when the selection is uncontrolled. |
| describeCard | `((card: RelationshipCard<T>) => string) \| undefined` | See type | no | — | The card's accessible name. Default: its title. |
| edges | `readonly RelationshipEdge[] \| undefined` | See type | no | NO_EDGES | Links between rows. Edges to cards or rows that do not exist are skipped (with a development warning). |
| emptyIcon | `ReactNode` | See type | no | — | The empty state's icon. Default a table. |
| emptyText | `ReactNode` | See type | no | — | One line for an empty diagram (R2.5). |
| framed | `boolean \| undefined` | false, true | no | true | A hairline border and the surface radius around the canvas. Turn it off inside a Panel. Default true. |
| frameKey | `unknown` | See type | no | — | Re-fit when this changes (another diagram). Live changes to the same diagram keep the camera. |
| grid | `boolean \| undefined` | false, true | no | true | Draw the dot grid; it pans and scales with the camera. Default true. |
| label | `string` | See type | yes | — | Names the diagram: "Schema, Active". |
| movable | `boolean \| undefined` | false, true | no | true | Cards can be dragged and moved with the keys, and Auto layout shows. Default true. |
| onOpen | `((card: RelationshipCard<T>) => void) \| undefined` | See type | no | — | Double-click or Enter: the card's page or editor. |
| onPositionsChange | `((positions: RelationshipPositions, details: RelationshipPositionsChangeDetails) => void) \| undefined` | See type | no | — | Called with every card's position after a card is dragged (on release), moved with Shift and an arrow key, or laid out by Auto layout. Persist it to keep the arrangement. |
| onSelectedIdChange | `((id: string \| null, details: SelectionChangeDetails<RelationshipCard<T>>) => void) \| undefined` | See type | no | — | Called with the card id the person selects (click, Space, or Enter without `onOpen`), or `null` when they clear it (Escape, or a click on empty canvas), and details whose `item` is the card. The selected card's edges are drawn in the accent. |
| positions | `Readonly<Record<string, RelationshipPoint>> \| undefined` | See type | no | — | Card positions, controlled. Cards missing from it are placed by the automatic layout. |
| selectedId | `string \| null \| undefined` | See type | no | — | The selected card's id, or null for none. Controlled while defined; leave it undefined to use `defaultSelectedId`. |
