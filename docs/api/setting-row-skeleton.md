# SettingRowSkeleton

A setting row's loading shape: label and description lines and the control's box.

`import { SettingRowSkeleton } from "glass-ux/setting-row"`

[Live examples](https://dastari.github.io/glass-ux/components/setting-row-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| control | `"button" \| "switch" \| "none" \| "segmented" \| undefined` | "button", "switch", "none", "segmented" | no | "switch" | The control's box: a switch, a segmented control or a button. |
| description | `boolean \| undefined` | false, true | no | true | Additional content describing the value, state, or consequence. |
| labelWidth | `string \| number \| undefined` | See type | no | "40%" | Space reserved for the label. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
