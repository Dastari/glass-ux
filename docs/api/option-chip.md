# OptionChip

The one chip used by MultiSelect and TagInput: optional icon, a label that truncates
with a tooltip, and a remove button named "Remove …". Chips are reachable with ← → from
the input; Backspace or Delete removes the focused one.

`import { OptionChip } from "glass-ux/combobox"`

[Live examples](https://dastari.github.io/glass-ux/components/option-chip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| flash | `boolean \| undefined` | false, true | no | — | Flash once (an attempt to add it again). |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass it without a size. |
| invalid | `string \| undefined` | See type | no | — | Why this value is not valid: the chip turns danger and the reason is its tooltip. |
| label | `string` | See type | yes | — | The visible or accessible label for this component. |
| onEdit | `(() => void) \| undefined` | See type | no | — | Enter or double-click edits the chip in place. |
| readOnly | `boolean \| undefined` | false, true | no | — | Plain text: nothing to focus or remove. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
