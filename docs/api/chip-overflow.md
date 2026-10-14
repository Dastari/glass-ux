# ChipOverflow

A compact chip collection with a searchable +N overflow popover.

`import { ChipOverflow } from "glass-ux/chip-overflow"`

[Live examples](https://dastari.github.io/glass-ux/components/chip-overflow)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| items | `readonly OverflowChip[]` | See type | yes | — | Full collection, before limiting visible chips. |
| label | `string` | See type | yes | — | Accessible collection name and search label. |
| limit | `number \| undefined` | See type | no | 2 | Chips visible before the overflow trigger. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
