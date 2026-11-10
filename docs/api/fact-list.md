# FactList

A semantic description list: compact label and value pairs for popovers, metadata and small summaries, or aligned rows for a record's details.

`import { FactList } from "glass-ux/fact-list"`

[Live examples](https://dastari.github.io/glass-ux/components/fact-list)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| facts | `readonly Fact[]` | See type | yes | — | Compact label/value rows, in reading order. |
| variant | `"compact" \| "rows" \| undefined` | "compact", "rows" | no | "compact" | `compact`: each label sits beside its value, for popovers and small summaries. `rows`: a property list for a record's details panel, with an icon column when any fact has an icon, a label column every value starts after, and a hairline between rows. Values are centred on the row, so chips and badges line up with their labels; the label column narrows in a narrow container. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDListElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
