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
| wrap | `boolean \| undefined` | false, true | no | true | `true` (the default) lets the chips wrap onto more lines. `false` keeps them on one line, for a table row or a toolbar: chips share the width and end in an ellipsis, and the +N trigger never shrinks. A chip that was cut shows its `label` in a tooltip. The chip must be able to shrink: Badge and EntityIdentity do, and so does plain text. |
