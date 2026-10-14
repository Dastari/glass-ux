# SettingRow

One setting on one line: label (with an optional value and badge) and description on
the left, the control right-aligned. When the row is too narrow, the control drops
below the text instead of squeezing it (container query). Booleans are switches in
setting rows (R15.4).

`import { SettingRow } from "glass-ux/setting-row"`

[Live examples](https://dastari.github.io/glass-ux/components/setting-row)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| badge | `ReactNode` | false, true | no | — | A badge after the label ("Beta"). |
| control | `ReactNode` | false, true | no | — | The control or action, right-aligned: Switch, Segmented, a secondary Button. |
| description | `ReactNode` | false, true | no | — | What the setting does, when the label alone does not say it. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| error | `ReactNode` | false, true | no | — | Error text in place of the description while `status` is "error". |
| label | `ReactNode` | false, true | yes | — | Names the setting ("Keep agent up to date"). It labels the control. |
| status | `ButtonStatus \| undefined` | "idle", "pending", "success", "error" | no | — | In-place save feedback for settings that apply immediately (R15.11): a spinner while saving, a drawn ✓ on success, ✕ on failure. It sits beside the control and never moves it. Drive it with `useActionFeedback()` from Button. |
| value | `ReactNode` | false, true | no | — | A read-only current value shown beside the label ("SuperGrok", "1979"). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
