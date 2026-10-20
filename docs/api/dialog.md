# Dialog

A modal dialog built from parts: `Root` (state; a bottom sheet on phones by default),
`Trigger`, `Popup`, `Header`, `Body` (scrolls), `Footer`, `Title`, `Description` and
`Close`. `Preview` renders the same parts statically for documentation.

`import { Dialog } from "glass-ux/dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/dialog)

## Dialog.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `RefObject<{ unmount: () => void; close: () => void; } \| null> \| undefined` | See type | no | — | Ref exposing the component’s imperative action contract. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Opens the uncontrolled overlay initially. |
| disablePointerDismissal | `boolean \| undefined` | false, true | no | — | Keep the dialog open on outside press (Esc still closes). |
| modal | `boolean \| undefined` | false, true | no | — | Default true. `false` lets the page stay interactive (rare; prefer a Popover or Sheet). |
| onOpenChange | `((open: boolean, details: DialogChangeDetails) => void) \| undefined` | See type | no | — | Called with the next open state and Base UI change details (the reason; `details.cancel()` keeps it open) when the trigger, Esc, an outside press, a close control or a sheet swipe opens or dismisses it. Pair with `open` to control it. |
| onOpenChangeComplete | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the final open state once the open or close animation has finished. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| sheet | `boolean \| "auto" \| undefined` | false, true, "auto" | no | "auto" | `auto` (default) renders a bottom sheet with a grab handle on phones (< 48rem) and a centred dialog elsewhere (R13.4). Force either with true/false. |

## Dialog.Trigger



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").DialogTriggerState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| handle | `DialogHandle<Payload> \| undefined` | See type | no | — | A handle to associate the trigger with a dialog. Can be created with the Dialog.createHandle() method. |
| id | `string \| undefined` | See type | no | — | ID of the trigger. In addition to being forwarded to the rendered element, it is also used to specify the active trigger for the dialog in controlled mode (with the DialogRoot `triggerId` prop). |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). |
| payload | `Payload \| undefined` | See type | no | — | A payload to pass to the dialog when it is opened. |
| ref | `((((instance: HTMLButtonElement \| null) => void \| (() => VoidOrUndefinedOnly) \| DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) \| RefObject<HTMLButtonElement \| null>) & (((instance: HTMLElement \| null) => void \| (() => VoidOrUndefinedOnly) \| DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) \| RefObject<HTMLElement \| null>)) \| null \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").DialogTriggerState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").DialogTriggerState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Dialog.Popup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| finalFocus | `boolean \| RefObject<HTMLElement \| null> \| ((closeType: import("@base-ui/utils/useEnhancedClickHandler").InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | The element or behaviour to focus when the overlay closes. |
| initialFocus | `boolean \| RefObject<HTMLElement \| null> \| ((openType: import("@base-ui/utils/useEnhancedClickHandler").InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | The element or behaviour to focus when the overlay opens. |
| kind | `DialogKind \| undefined` | "dialog", "palette", "alert", "side", "settings" | no | — | `settings` fixes the height so switching sections never resizes the dialog. |
| size | `DialogSize \| undefined` | "full", "sm", "md", "lg", "xl" | no | — | sm 400 · md 560 · lg 760 · xl 1040 · full. Ignored by phone sheets (full width). |

## Dialog.Header



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

## Dialog.Body



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

## Dialog.Footer



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

## Dialog.Title



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

## Dialog.Description



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

## Dialog.Close



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").AlertDialogCloseState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").AlertDialogCloseState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").AlertDialogCloseState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Dialog.Preview



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| height | `"short" \| "auto" \| undefined` | "short", "auto" | no | "auto" | `short` fixes a low frame so the body scrolls (to show the scroll edges). |
| kind | `DialogKind \| undefined` | "dialog", "palette", "alert", "side", "settings" | no | "dialog" | Semantic entity or content kind, used to choose labels and rendering. |
| size | `DialogSize \| undefined` | "full", "sm", "md", "lg", "xl" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
