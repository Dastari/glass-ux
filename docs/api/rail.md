# Rail

Compose the primary application navigation rail from accessible items, separators between groups and flexible spacers. Items that do not fit its height move into a More menu, and the current section stays visible. `labels` draws each item's name under its icon.

`import { Rail } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/rail)

## Rail.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Accessible name of the navigation landmark. |
| labels | `boolean \| undefined` | false, true | no | false | Draw every item's name under its icon, in a wider column (`--sidebar-w-rail-labelled`) that AppShell's grid follows. A name that does not fit ends in an ellipsis, with the full name in the tooltip. Applies to the whole rail, including More. |
| overflow | `"more" \| "scroll" \| undefined` | "more", "scroll" | no | "more" | What happens to items that do not fit the rail's height. `more`: they move into a More menu, and the current section stays visible. `scroll`: every item stays in the column, which scrolls with no visible scrollbar. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## Rail.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `boolean \| undefined` | false, true | no | false | This is the current section. |
| badge | `ReactNode` | See type | no | — | A NotificationDot or count on the icon's corner. |
| disabledReason | `string \| undefined` | See type | no | — | Why the item does nothing here ("Choose an organisation to see its settings"). It stays focusable (aria-disabled) and the tooltip and description give the reason (R12.3, R20.5). |
| icon | `ReactNode` | See type | yes | — | An icon element without an explicit size; the component sizes it through its tokens. |
| label | `string` | See type | yes | — | The destination's name: the accessible name and the tooltip, and on a rail with `labels` the text under the icon. |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Render as a router link: render={<Link to="/endpoints" />}. |
| shortcut | `string \| undefined` | See type | no | — | "g e" (press G, then E). Shown in the tooltip and handled by the rail. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Rail.Separator



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

## Rail.Spacer



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Rail.Shortcut



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| keys | `string` | See type | yes | — | The two-key sequence, space-separated and case-insensitive ("g m": press G, then M). |
| onTrigger | `() => void` | See type | yes | — | Called when the person types the sequence outside a text field, without Ctrl, Alt or Meta held. |
