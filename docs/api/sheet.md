# Sheet

A pane that slides in from a screen edge, built from parts: `Root` (state and `side`),
`Trigger`, `Popup`, `Header`, `Body` (scrolls), `Footer` and `Close`. Swipe toward the
edge, Esc or the scrim dismisses it. A bottom sheet can rest at `snapPoints`; a
non-modal sheet (`modal={false}`) leaves the page usable; a sheet opened from inside
another stacks on it, and the one behind recedes until it closes.

`import { Sheet } from "glass-ux/sheet"`

[Live examples](https://dastari.github.io/glass-ux/components/sheet)

## Sheet.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `RefObject<{ unmount: () => void; close: () => void; } \| null> \| undefined` | See type | no | — | Ref exposing the component’s imperative action contract. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Opens the uncontrolled overlay initially. |
| defaultSnapPoint | `SheetSnapPoint \| null \| undefined` | See type | no | — | The snap point an uncontrolled sheet opens at, and returns to each time it closes. Default: the first of `snapPoints`. |
| disablePointerDismissal | `boolean \| undefined` | false, true | no | !modal | Keep the sheet open on a press outside it (Esc, a swipe and close controls still close it). A non-modal sheet also stays open when focus moves to the page. Default: true when `modal` is false, otherwise false. |
| modal | `boolean \| undefined` | false, true | no | true | Default true: a scrim covers the page, focus stays in the sheet and the page is inert. `false` opens it beside the page: no scrim, the page keeps scrolling and taking clicks, Tab moves on to the page, and Esc still closes it. |
| onOpenChange | `((open: boolean, details: DialogChangeDetails) => void) \| undefined` | See type | no | — | Called with the next open state and Base UI change details (the reason; `details.cancel()` keeps it open) when the trigger opens it or a swipe, Esc, the scrim or a close control dismisses it. Pair with `open` to control it. |
| onOpenChangeComplete | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the final open state once the slide-in or slide-out animation has finished. |
| onSnapPointChange | `((snapPoint: SheetSnapPoint \| null, details: SheetSnapPointChangeDetails) => void) \| undefined` | See type | no | — | Called with the next snap point (`null` while a swipe closes the sheet) when a drag, the handle, a key or focus moves it. `details.cancel()` keeps the current point. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| side | `SheetSide \| undefined` | "start", "end", "bottom", "left", "right" | no | "right" | `right` (default): inspector and secondary detail. `left`: the section drawer on tablets and phones. `bottom`: a short list of choices or actions (phone "More"). `start` and `end` follow DirectionProvider; `left` and `right` stay physical. |
| snapPoint | `SheetSnapPoint \| null \| undefined` | See type | no | — | The active snap point, one of `snapPoints`. Pair with `onSnapPointChange` to control it. |
| snapPointLabels | `readonly string[] \| undefined` | See type | no | — | Labels for the handle's value, in `snapPoints` order (for example "Peek", "Half", "Full"). Default: "Height 2 of 3". |
| snapPoints | `readonly SheetSnapPoint[] \| undefined` | See type | no | — | Bottom sheets only: the heights it rests at, such as `["10rem", 0.5, 1]`. The sheet takes the viewport's height, shows as much of it as the active point allows and follows a drag to the nearest point (a fast flick carries further; past the lowest it closes). Its grab handle becomes a slider: arrow keys step between points and Home/End pick the lowest and highest. Below the highest point the body does not scroll; dragging or scrolling it raises the sheet first. Ignored on side sheets. |
| snapToSequentialPoints | `boolean \| undefined` | false, true | no | — | Settle on the point nearest the drag distance instead of letting a fast flick skip points. |

## Sheet.Trigger



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").DrawerTriggerState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| handle | `DrawerHandle<Payload> \| undefined` | See type | no | — | A handle to associate the trigger with a drawer. Can be created with the Drawer.createHandle() method. |
| id | `string \| undefined` | See type | no | — | ID of the trigger. In addition to being forwarded to the rendered element, it is also used to specify the active trigger for drawers in controlled mode (with the Drawer.Root `triggerId` prop). |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). |
| payload | `Payload \| undefined` | See type | no | — | A payload to pass to the drawer when it is opened. |
| ref | `((((instance: HTMLButtonElement \| null) => void \| (() => VoidOrUndefinedOnly) \| DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) \| RefObject<HTMLButtonElement \| null>) & (((instance: HTMLElement \| null) => void \| (() => VoidOrUndefinedOnly) \| DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) \| RefObject<HTMLElement \| null>)) \| null \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").DrawerTriggerState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").DrawerTriggerState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Sheet.Popup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| finalFocus | `boolean \| RefObject<HTMLElement \| null> \| ((closeType: import("@base-ui/utils/useEnhancedClickHandler").InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | The element to focus when the sheet closes (default: the trigger, or the element focused before it opened). |
| initialFocus | `boolean \| RefObject<HTMLElement \| null> \| ((openType: import("@base-ui/utils/useEnhancedClickHandler").InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | The element to focus when the sheet opens (default: the sheet itself). `false` leaves focus where it is, for a non-modal sheet that follows a selection on the page. |
| size | `SheetSize \| undefined` | "sm", "md", "lg" | no | "md" | Width: sm 360 · md 480 · lg 640. Side sheets keep a sliver of the page visible on phones; a bottom sheet spans the phone's width. |

## Sheet.Header



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| close | `boolean \| undefined` | false, true | no | true | Show the close button (default). |
| icon | `ReactNode` | See type | no | — | Icon in a tile, sized by the header. |
| media | `ReactNode` | See type | no | — | Replaces the icon tile with the caller's own: an entity's identity tile (its photo, state). |
| subtitle | `ReactNode` | See type | no | — | Data only: the target's identifier or context (R2.2), never a restatement. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |
| tone | `DialogTone \| undefined` | "danger", "warning", "default", "success", "accent", "info" | no | "default" | The semantic tone. Use danger and warning for consequences and states. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## Sheet.Body



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| flush | `boolean \| undefined` | false, true | no | — | Remove the body's inset, for content that brings its own (a rail layout, a table). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Sheet.Footer



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| start | `ReactNode` | See type | no | — | Tertiary actions on the left (Reset, Help). The primary always goes last, on the right. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## Sheet.Close



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").DrawerCloseState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").DrawerCloseState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").DrawerCloseState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.
