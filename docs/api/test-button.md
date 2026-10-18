# TestButton

Test a connection without leaving the dialog (§5.1): the button confirms in place
(pending, then ✓ or ✕ with a shake) and a reserved line beside it says why. The result
block below always holds its rows ("—" until a test runs), so nothing moves when a result
arrives (R9.1). A thrown error counts as a failed test with its message.

`import { TestButton } from "glass-ux/entity-settings"`

[Live examples](https://dastari.github.io/glass-ux/components/test-button)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| block | `boolean \| undefined` | false, true | no | — | Stretch to the container width. |
| children | `ReactNode` | See type | no | "Test" | Default "Test". |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| disabledReason | `string \| undefined` | See type | no | — | Why the button is disabled (R12.3). Keeps the button focusable (aria-disabled) so the reason is reachable by hover, focus and screen readers. |
| errorLabel | `ReactNode` | See type | no | — | Label shown after a failed action. Use onError to explain the failure. |
| fields | `readonly string[]` | See type | yes | — | The result block's rows, labelled before any test runs so the block never resizes. |
| icon | `ReactNode` | See type | no | <IconActivity /> | Leading icon. Pass an icon element without a size; the button sizes it. |
| iconEnd | `ReactNode` | See type | no | — | Trailing icon (chevrons, external-link). |
| onTest | `() => Promise<TestResult>` | See type | yes | — | Run the test against the values on screen (saved or not). |
| pendingLabel | `ReactNode` | See type | no | — | Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. |
| resetKey | `unknown` | See type | no | — | Changing it marks the last result as out of date (the values it tested have changed). |
| shape | `"circle" \| "default" \| undefined` | "circle", "default" | no | — | Circular instead of the control radius (send buttons, avatars-as-buttons). |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown in the tooltip, e.g. "mod+k". |
| size | `ButtonSize \| undefined` | "xs", "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| statusAnnouncement | `false \| { success?: ReactNode; error?: ReactNode; } \| undefined` | See type | no | — | Polite screen-reader announcement made when `status` settles from `pending` to `success` or `error`. Defaults to `successLabel`/`errorLabel`, then "Done"/"Failed". Pass `false` when the host announces the outcome itself. While `status` is set the visually hidden live region stays mounted beside the button and adds no geometry. |
| successLabel | `ReactNode` | See type | no | — | Label shown after a successful action before returning to the resting state. |
| tooltip | `ReactNode` | See type | no | — | Tooltip content. Icon-only buttons always get a tooltip (R20.7): this prop overrides the default, which is the button's aria-label. Pass `false` only when a visible label sits right next to the button. |
| variant | `ButtonVariant \| undefined` | "danger", "warning", "success", "primary", "secondary", "ghost", "soft", "danger-soft", "success-soft", "warning-soft" | no | — | The named visual variant. It is rendered as a data attribute and styled through shared tokens. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
