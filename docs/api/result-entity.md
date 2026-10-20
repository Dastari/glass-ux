# ResultEntity

One entity as a card: its glyph and live state, the data subtitle, a few facts and the
entity's own actions (R12: ActionBar from the same definition as its page header).

`import { ResultEntity } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-entity)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "entity"; entity: import("../types.js").EntityRef; subtitle?: string; facts: Array<{ label: string; value: string; }>; }` | See type | yes | — | The entity result: the `entity`, an optional `subtitle` and its `facts`; the resolver's `render` may replace the card body and supplies the actions. |
