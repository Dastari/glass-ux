# EmptyState

What a list, table or pane shows when it has nothing — or failed to load — in the same box
the content would have used (R9.1, R16.4). It fills its box and lays out against it:

  row     height < 10rem: icon, line and action in one row (a table body, a short list)
  block   10–16rem: centred, icon in a soft tile
  large   ≥ 16rem: centred, the 2xl icon in a larger tile

`import { EmptyState } from "glass-ux/empty-state"`

[Live examples](https://dastari.github.io/glass-ux/components/empty-state)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| action | `ReactNode` | false, true | no | — | The primary way forward, if there is one: a small Button ("Clear search"). |
| children | `ReactNode` | false, true | yes | — | One factual line (R2.5): `No endpoints match "orb-7"`. |
| icon | `ReactNode` | false, true | yes | — | The thing that is missing (search, endpoint, inbox…). Pass it without a size. |
| tone | `"danger" \| "neutral" \| undefined` | "danger", "neutral" | no | "neutral" | `danger` for an error that occupies the same box (couldn't load). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
