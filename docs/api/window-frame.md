# WindowFrame

The presentational parts of a window: `Root`, `AppBar` (icon, title, scope, actions and
controls), `Body`, `StatusBar` with `StatusItem`, `StatusMeta` and `StatusGroup` (a live
region), and `Controls`. It holds no window state; the workspace and pop-out wire it to
the manager.

`import { WindowFrame } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-frame)

## WindowFrame.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| focused | `boolean \| undefined` | false, true | no | false | The focused window has a stronger edge; others dim their app bar. |
| material | `"none" \| "panel" \| undefined` | "none", "panel" | no | "panel" | `panel` (default): a glass frame, for secondary windows. `none`: no frame, for the primary window, whose header, tabs and status sit on the canvas and whose content panels carry the glass. |
| state | `WindowFrameState \| undefined` | "primary", "sheet", "tiled", "floating", "maximised", "minimised", "popout" | no | — | Controlled view state, including loading, empty and error states. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## WindowFrame.AppBar



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | See type | no | — | Window-specific actions, before the controls. Ghost sm buttons; `Window.Action` gives one a priority so it can fold into More. |
| actionsRef | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Receives the actions container, for content that portals its own actions in. |
| controls | `ReactNode` | See type | no | — | Window controls (WindowControls). |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| scope | `ReactNode` | See type | no | — | The window's organisation when it is not the current one (WindowScopeChip, R14.4). |
| subtitle | `ReactNode` | See type | no | — | Data only (R2.2): the endpoint or organisation the window is about. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |
| titleId | `string \| undefined` | See type | no | — | id for the title, so the frame can be labelled by it. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## WindowFrame.Body



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

## WindowFrame.StatusBar



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| narrow | `"hide" \| "show" \| undefined` | "hide", "show" | no | "show" | `hide` drops the bar in a phone-width window (under 30rem), for a primary view whose bar only adds detail there is no room for. Live state that matters on a phone (connection lost, reconnecting) keeps the default, `show`. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## WindowFrame.StatusItem



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

## WindowFrame.StatusMeta



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

## WindowFrame.StatusGroup



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

## WindowFrame.Controls



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| compact | `boolean \| undefined` | false, true | no | false | Phones: minimise reads as "back to workspace" and maximise is implicit. |
| fullscreen | `boolean \| undefined` | false, true | no | false | Whether the window is in full screen: the control reads "Exit full screen". |
| leading | `ReactNode` | See type | no | — | Extra controls before the standard ones (the phone window switcher). |
| maximised | `boolean \| undefined` | false, true | no | false | Whether the window fills its available workspace. |
| onClose | `(() => void) \| undefined` | See type | no | — | Called when the person presses Close; run close guards before removing the window. The button is shown only when this is supplied. |
| onMinimise | `(() => void) \| undefined` | See type | no | — | Called when the person presses Minimise. The button is shown only when this is supplied. |
| onPopOut | `(() => void) \| undefined` | See type | no | — | Called when the person presses Pop out. The button is shown only when this is supplied and not `compact`. |
| onReturn | `(() => void) \| undefined` | See type | no | — | Popped-out windows offer "Return to workspace" in place of pop-out. |
| onToggleFullscreen | `(() => void) \| undefined` | See type | no | — | Called when the person presses Full screen or Exit full screen. The button is shown only when this is supplied and not `compact`. |
| onToggleMaximise | `(() => void) \| undefined` | See type | no | — | Called when the person presses Maximise or Restore (per `maximised`). The button is shown only when this is supplied and not `compact`. |
| title | `string` | See type | yes | — | The heading or title content. |
