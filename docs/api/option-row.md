# OptionRow

One option's content: icon, label and description with matches emphasised, meta on
the right and an optional ✓ column. A disabled option shows its reason as the second line.

`import { OptionRow } from "glass-ux/combobox"`

[Live examples](https://dastari.github.io/glass-ux/components/option-row)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| check | `ReactNode` | See type | no | — | Reserve a trailing column for a ✓ (pass the indicator element to fill it). |
| item | `OptionItem<string>` | See type | yes | — | The typed item displayed or acted upon. |
| query | `string \| undefined` | See type | no | "" | The text being searched for; matches are emphasised. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
