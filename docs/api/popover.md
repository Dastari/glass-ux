# Popover

Small, contextual, non-blocking content built from parts on Base UI's popover: `Root`
(state), `Trigger`, `Popup` (positioned, with an optional title and close button),
`Close` and `Description`. `Preview` renders a static surface for documentation.

`import { Popover } from "glass-ux/popover"`

[Live examples](https://dastari.github.io/glass-ux/components/popover)

## Popover.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `React.RefObject<PopoverRootActions \| null> \| undefined` | See type | no | — | A ref to imperative actions. - `unmount`: Ends the closing phase of the popover after an externally controlled closing animation finishes. Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the popover completes closing on its own. Whether it leaves the DOM is decided by `keepMounted` on the portal. - `close`: Closes the popover imperatively when called. |
| children | `React.ReactNode \| PayloadChildRenderFunction<Payload>` | See type | no | — | The content of the popover. This can be a regular React node or a render function that receives the `payload` of the active trigger. |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Whether the popover is initially open.  To render a controlled popover, use the `open` prop instead. |
| defaultTriggerId | `string \| null \| undefined` | See type | no | — | ID of the trigger that the popover is associated with. This is useful in conjunction with the `defaultOpen` prop to create an initially open popover. |
| handle | `PopoverHandle<Payload> \| undefined` | See type | no | — | A handle to associate the popover with a trigger. If specified, allows external triggers to control the popover's open state. |
| modal | `boolean \| "trap-focus" \| undefined` | false, true, "trap-focus" | no | — | Determines if the popover enters a modal state when open. - `true`: user interaction is limited to the popover: document page scroll is locked, and pointer interactions on outside elements are disabled. - `false`: user interaction with the rest of the document is allowed. - `'trap-focus'`: focus is trapped inside the popover, but document page scroll is not locked and pointer interactions outside of it remain enabled.  On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.  When `modal` is `true`, focus trapping is enabled only if `<Popover.Close>` is rendered inside `<Popover.Popup>`. It can be visually hidden with your own CSS if needed, such as Tailwind's `sr-only` utility.  When `modal` is `'trap-focus'`, render `<Popover.Close>` inside `<Popover.Popup>` so touch screen readers can escape the popup. |
| onOpenChange | `((open: boolean, eventDetails: PopoverRoot.ChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when the popover is opened or closed. |
| onOpenChangeComplete | `((open: boolean) => void) \| undefined` | See type | no | — | Event handler called after any animations complete when the popover is opened or closed. |
| open | `boolean \| undefined` | false, true | no | — | Whether the popover is currently open. |
| triggerId | `string \| null \| undefined` | See type | no | — | ID of the trigger that the popover is associated with. This is useful in conjunction with the `open` prop to create a controlled popover. There's no need to specify this prop when the popover is uncontrolled (that is, when the `open` prop is not set). |

## Popover.Trigger



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").PopoverTriggerState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| closeDelay | `number \| undefined` | See type | no | — | How long to wait before closing the popover that was opened on hover. Specified in milliseconds.  Requires the `openOnHover` prop. |
| delay | `number \| undefined` | See type | no | — | How long to wait before the popover may be opened on hover. Specified in milliseconds.  Requires the `openOnHover` prop. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| handle | `PopoverHandle<Payload> \| undefined` | See type | no | — | A handle to associate the trigger with a popover. |
| id | `string \| undefined` | See type | no | — | ID of the trigger. In addition to being forwarded to the rendered element, it is also used to specify the active trigger for the popover in controlled mode (with the PopoverRoot `triggerId` prop). |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (e.g. `<div>`). |
| openOnHover | `boolean \| undefined` | false, true | no | — | Whether the popover should also open when the trigger is hovered. |
| payload | `Payload \| undefined` | See type | no | — | A payload to pass to the popover when it is opened. |
| ref | `((((instance: HTMLButtonElement \| null) => void \| (() => VoidOrUndefinedOnly) \| DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) \| RefObject<HTMLButtonElement \| null>) & (((instance: HTMLElement \| null) => void \| (() => VoidOrUndefinedOnly) \| DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) \| RefObject<HTMLElement \| null>)) \| null \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").PopoverTriggerState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").PopoverTriggerState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Popover.Popup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `import("@base-ui/react/internals/useAnchorPositioning").Align \| undefined` | "center", "start", "end" | no | "center" | Alignment of the overlay relative to its anchor. |
| anchor | `Element \| import("react").RefObject<Element \| null> \| import("@floating-ui/dom").VirtualElement \| (() => Element \| import("@floating-ui/dom").VirtualElement \| null) \| null \| undefined` | See type | no | — | Anchor used to position floating content. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| side | `import("@base-ui/react/internals/useAnchorPositioning").Side \| undefined` | "top", "bottom", "left", "right", "inline-end", "inline-start" | no | "bottom" | Preferred side of the anchor; collision handling may choose another side. |
| size | `PopoverSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| title | `ReactNode` | See type | no | — | Optional title row; adds a close button. Omit it when the trigger already names the content. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| finalFocus | `boolean \| React.RefObject<HTMLElement \| null> \| ((closeType: InteractionType) => void \| boolean \| HTMLElement \| null) \| undefined` | See type | no | — | Determines the element to focus when the popover is closed.  - `false`: Do not move focus. - `true`: Move focus based on the default behavior (trigger or previously focused element). - `RefObject`: Move focus to the ref element. - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).   Return an element to focus, `true` to use the default behavior, `null` to fall back to the default behavior, or `false`/`undefined` to do nothing. |
| initialFocus | `boolean \| React.RefObject<HTMLElement \| null> \| ((openType: InteractionType) => void \| boolean \| HTMLElement \| null) \| undefined` | See type | no | — | Determines the element to focus when the popover is opened. By default, focus moves to the first tabbable element inside the popup, except when the popover is opened by touch — then the popup itself is focused to avoid opening the virtual keyboard.  - `false`: Do not move focus. - `true`: Move focus based on the default behavior (first tabbable element or popup). - `RefObject`: Move focus to the ref element. - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).   Return an element to focus, `true` to use the default behavior, `null` to fall back to the default behavior, or `false`/`undefined` to do nothing. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").PopoverPopupState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").PopoverPopupState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Popover.Close



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").PopoverCloseState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").PopoverCloseState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").PopoverCloseState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Popover.Description



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").PopoverDescriptionState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| ref | `Ref<HTMLParagraphElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").PopoverDescriptionState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").PopoverDescriptionState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Popover.Preview



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| size | `PopoverSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| title | `ReactNode` | See type | no | — | The heading or title content. |
