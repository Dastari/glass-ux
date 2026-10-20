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
| action | `ReactNode` | See type | no | — | The primary way forward, if there is one: a small Button ("Clear search"). |
| children | `ReactNode` | See type | yes | — | One factual line (R2.5): `No endpoints match "orb-7"`. |
| icon | `ReactNode` | See type | yes | — | The thing that is missing (search, endpoint, inbox…). Pass it without a size. |
| tone | `"danger" \| "neutral" \| undefined` | "danger", "neutral" | no | "neutral" | `danger` for an error that occupies the same box (couldn't load). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
