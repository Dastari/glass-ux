# Window

Slots for window bodies.

`import { Window } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window)

## Window.Actions



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |

## Window.Action



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The action as it shows in the app bar: a ghost sm Button, a Segmented, a Menu trigger. |
| disabled | `boolean \| undefined` | false, true | no | — | The More menu item is disabled. |
| icon | `ReactNode` | See type | no | — | The item's icon in the More menu. |
| label | `string` | See type | yes | — | Names the action as an item in the More menu once it has folded away. |
| menu | `ReactNode` | See type | no | — | The action's own content for the More menu, in place of one item: a submenu (`Menu.Submenu`) for an action that opens a menu, radio items for a Segmented choice. |
| onSelect | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person chooses the action from the More menu. |
| priority | `WindowActionPriority \| undefined` | "primary", "secondary" | no | "secondary" | `secondary` (the default) folds into the More menu when the app bar runs out of room, the last ones first; `primary` always stays in the bar. |

## Window.Status



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | StatusItem / StatusMeta children for the status bar. |
| indicator | `WindowIndicator \| undefined` | See type | no | — | What the dock shows for this window: a dot and a one-word state. |

## Window.Body



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| variant | `"fill" \| "scroll" \| undefined` | "fill", "scroll" | no | "scroll" | `scroll` pads and scrolls (documents, lists); `fill` is edge to edge (viewers). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## Window.StatusItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| tone | `WindowStatusTone \| undefined` | "danger", "warning", "success", "neutral", "info" | no | — | Draws a status dot before the label. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## Window.StatusMeta



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
