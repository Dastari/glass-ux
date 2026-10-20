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

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| focusableWhenDisabled | `boolean \| undefined` | false, true | no | — | Whether the button should be focusable when disabled. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ButtonState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ButtonState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.
