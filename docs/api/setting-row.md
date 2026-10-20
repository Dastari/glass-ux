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
| badge | `ReactNode` | See type | no | — | A badge after the label ("Beta"). |
| control | `ReactNode` | See type | no | — | The control or action, right-aligned: Switch, Segmented, a secondary Button. |
| description | `ReactNode` | See type | no | — | What the setting does, when the label alone does not say it. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| error | `ReactNode` | See type | no | — | Error text in place of the description while `status` is "error". |
| label | `ReactNode` | See type | yes | — | Names the setting ("Keep agent up to date"). It labels the control. |
| status | `ButtonStatus \| undefined` | "idle", "pending", "success", "error" | no | — | In-place save feedback for settings that apply immediately (R15.11): a spinner while saving, a drawn ✓ on success, ✕ on failure. It sits beside the control and never moves it. Drive it with `useActionFeedback()` from Button. |
| value | `ReactNode` | See type | no | — | A read-only current value shown beside the label ("SuperGrok", "1979"). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
