# HitLayer

The pointer and keyboard surface over a plot. It writes the position to the hover store;
the marks never re-render. It is one tab stop exposed as a slider over the data positions
(R11.5: arrows move within it), so a keyboard or screen-reader user gets the same readout
as the pointer, and Escape clears it.

`import { HitLayer } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/hit-layer)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| anchor | `(index: number) => { x: number; y: number; }` | See type | yes | — | Position index → plot-local px where the readout anchors (the snapped point). |
| bounds | `{ left: number; top: number; width: number; height: number; } \| undefined` | See type | no | — | Cover only part of the plot (plot-local px), leaving the rest (a legend) to the pointer. |
| count | `number` | See type | yes | — | How many positions the cursor can visit. |
| cursor | `"crosshair" \| "pointer" \| undefined` | "crosshair", "pointer" | no | "crosshair" | Controlled cursor or crosshair state. |
| initial | `number \| undefined` | See type | no | — | Where the keyboard cursor starts. |
| label | `string` | See type | yes | — | Accessible name for the cursor. |
| locate | `(x: number, y: number) => number \| null` | See type | yes | — | Plot-local px → position index (null: nothing there). |
| nav | `((index: number, key: string) => number \| null) \| undefined` | See type | no | — | Arrow-key movement; default steps through indices in order. Return null to stay. |
| onActivate | `((index: number) => void) \| undefined` | See type | no | — | Click or Enter on a position (drill-down, selection). |
| onEscape | `(() => void) \| undefined` | See type | no | — | Escape or Backspace: back up a level (drill-downs). Without it Escape clears the cursor. |
| snap | `boolean \| undefined` | false, true | no | false | Pointer readouts follow the snapped x (line charts) instead of the pointer itself. |
| store | `HoverStore` | See type | yes | — | External store observed by the component. |
| valueText | `(index: number) => string` | See type | yes | — | What the cursor is on, for assistive tech: "10:32 · CPU 34%". |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
