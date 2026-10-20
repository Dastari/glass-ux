# OptionStatus

The list's state above the options: a thin indeterminate line while results refresh
(the previous ones stay), skeleton rows on the first load, an error row with Retry, or
a prompt for more characters. Rows are exactly one option tall.

`import { OptionStatus } from "glass-ux/combobox"`

[Live examples](https://dastari.github.io/glass-ux/components/option-status)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| needsMore | `number \| undefined` | See type | no | 0 | Characters still needed before searching. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when Retry is pressed in the error row. Without it the error row has no Retry button. |
| status | `SearchStatus` | "idle", "error", "loading", "refreshing" | yes | — | Current operation or connection status. |
| twoLine | `boolean \| undefined` | false, true | no | false | Two-line rows: the skeleton matches them. |
