# ChipMeasure

A chip-shaped twin used only to measure how many chips fit (no behaviour, hidden).

`import { ChipMeasure } from "glass-ux/combobox"`

[Live examples](https://dastari.github.io/glass-ux/components/chip-measure)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| label | `string` | See type | yes | — | The visible or accessible label for this component. |
| removable | `boolean \| undefined` | false, true | no | true | Reserve the remove button's width (default true); false for read-only chips. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
