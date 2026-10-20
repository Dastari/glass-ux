# Menu

A dropdown menu of actions built from parts on Base UI's menu: `Root` (state), `Trigger`,
`Popup`, items (`Item`, `LinkItem`, `CheckboxItem`, `RadioGroup`/`RadioItem`), `Group`,
`GroupLabel`, `Separator` and `Submenu`. A disabled item or submenu with `disabledReason`
stays highlightable and shows the reason as its tooltip.

`import { Menu } from "glass-ux/menu"`

[Live examples](https://dastari.github.io/glass-ux/components/menu)

## Menu.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `React.RefObject<MenuRootActions \| null> \| undefined` | See type | no | — | A ref to imperative actions. - `unmount`: Ends the closing phase of the menu after an externally controlled closing animation finishes.   Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the menu completes closing on its own.   Whether it leaves the DOM is decided by `keepMounted` on the portal. - `close`: Closes the menu imperatively when called. |
| children | `React.ReactNode \| PayloadChildRenderFunction<Payload>` | See type | no | — | The content of the menu. This can be a regular React node or a render function that receives the `payload` of the active trigger. |
| closeParentOnEsc | `boolean \| undefined` | false, true | no | — | When in a submenu, determines whether pressing the Escape key closes the entire menu, or only the current child menu. |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Whether the menu is initially open.  To render a controlled menu, use the `open` prop instead. |
| defaultTriggerId | `string \| null \| undefined` | See type | no | — | ID of the trigger that the menu is associated with. This is useful in conjunction with the `defaultOpen` prop to create an initially open menu. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| handle | `MenuHandle<Payload> \| undefined` | See type | no | — | A handle to associate the menu with a trigger. If specified, allows external triggers to control the menu's open state. |
| highlightItemOnHover | `boolean \| undefined` | false, true | no | — | Whether moving the pointer over items should highlight them. Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state. |
| loopFocus | `boolean \| undefined` | false, true | no | — | Whether to loop keyboard focus back to the first item when the end of the list is reached while using the arrow keys. |
| modal | `boolean \| undefined` | false, true | no | — | Determines if the menu enters a modal state when open. - `true`: user interaction is limited to the menu: document page scroll is locked and pointer interactions on outside elements are disabled. - `false`: user interaction with the rest of the document is allowed.  On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.  Nested menus ignore this prop, and menus opened by hover are never modal. |
| onItemHighlighted | `((highlightedItem: HTMLElement \| undefined, eventDetails: MenuRoot.HighlightEventDetails) => void) \| undefined` | See type | no | — | Callback fired when an item is highlighted or unhighlighted. Receives the highlighted item element (or `undefined` if no item is highlighted) and details containing the reason for the change, the event, and the item's text label. The `reason` can be: - `'keyboard'`: the highlight changed due to keyboard navigation. - `'pointer'`: the highlight changed due to pointer hovering. The event may be a `MouseEvent`   rather than a `PointerEvent`. - `'none'`: the highlight changed for another reason, such as automatic highlighting while   filtering, the item list changing, or the popup opening or closing. |
| onOpenChange | `((open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when the menu is opened or closed. |
| onOpenChangeComplete | `((open: boolean) => void) \| undefined` | See type | no | — | Event handler called after any animations complete when the menu is opened or closed. |
| open | `boolean \| undefined` | false, true | no | — | Whether the menu is currently open. |
| orientation | `MenuRootOrientation \| undefined` | "horizontal", "vertical" | no | — | The visual orientation of the menu. Controls whether roving focus uses up/down or left/right arrow keys. |
| triggerId | `string \| null \| undefined` | See type | no | — | ID of the trigger that the menu is associated with. This is useful in conjunction with the `open` prop to create a controlled menu. There's no need to specify this prop when the menu is uncontrolled (that is, when the `open` prop is not set). |

## Menu.Trigger



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `React.ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").MenuTriggerState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| closeDelay | `number \| undefined` | See type | no | — | How long to wait before closing the menu that was opened on hover. Specified in milliseconds.  Requires the `openOnHover` prop. |
| delay | `number \| undefined` | See type | no | — | How long to wait before the menu may be opened on hover. Specified in milliseconds.  Requires the `openOnHover` prop. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| handle | `MenuHandle<Payload> \| undefined` | See type | no | — | A handle to associate the trigger with a menu. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). |
| openOnHover | `boolean \| undefined` | false, true | no | — | Whether the menu should also open when the trigger is hovered. |
| payload | `Payload \| undefined` | See type | no | — | A payload to pass to the menu when it is opened. |
| ref | `((((instance: HTMLButtonElement \| null) => void \| (() => VoidOrUndefinedOnly) \| DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) \| RefObject<HTMLButtonElement \| null>) & (((instance: HTMLElement \| null) => void \| (() => VoidOrUndefinedOnly) \| DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) \| RefObject<HTMLElement \| null>)) \| null \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").MenuTriggerState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").MenuTriggerState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.Popup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `import("@base-ui/react/internals/useAnchorPositioning").Align \| undefined` | "center", "start", "end" | no | "start" | Alignment of the overlay relative to its anchor. |
| alignOffset | `number \| undefined` | See type | no | 0 | Alignment offset from the anchor, in CSS pixels. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| side | `import("@base-ui/react/internals/useAnchorPositioning").Side \| undefined` | "top", "bottom", "left", "right", "inline-end", "inline-start" | no | — | Preferred side of the anchor; collision handling may choose another side. |
| sideOffset | `number \| undefined` | See type | no | — | Gap between the overlay and its anchor, in CSS pixels. Defaults to `--popup-offset`. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `React.ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| finalFocus | `boolean \| React.RefObject<HTMLElement \| null> \| ((closeType: InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | Determines the element to focus when the menu is closed.  - `false`: Do not move focus. - `true`: Move focus based on the default behavior (trigger or previously focused element). - `RefObject`: Move focus to the ref element. - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ContextMenuPopupState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ContextMenuPopupState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| disabledReason | `string \| null \| undefined` | See type | no | — | Disable the row and say why. The row is dimmed but stays highlightable; the reason is its tooltip on hover and keyboard highlight, and its accessible description. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| reasonId | `string \| undefined` | See type | no | — | Ignored. Rows used to point at a shared reason line; each row now describes itself. |
| reasonShown | `boolean \| undefined` | false, true | no | — | Ignored. Rows used to share one reason line; the reason is now each row's tooltip. |
| shortcut | `string \| undefined` | See type | no | — | e.g. "mod+shift+r". Shown in the platform's form at the trailing edge. |
| tone | `MenuItemTone \| undefined` | "danger", "default" | no | "default" | The semantic tone. Use danger and warning for consequences and states. |
| trail | `ReactNode` | See type | no | — | A short trailing note: the current value of what the row changes ("last 7 days"). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| closeOnClick | `boolean \| undefined` | false, true | no | — | Whether to close the menu when the item is clicked. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `string \| undefined` | See type | no | — | Overrides the text used for keyboard text navigation and filtering. Falls back to the rendered text when not provided. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `true` if the rendered element is a native button. |
| onClick | `((event: import("@base-ui/react/types").BaseUIEvent<React.MouseEvent<HTMLDivElement, MouseEvent>>) => void) \| undefined` | See type | no | — | The click handler for the menu item. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ContextMenuItemState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ContextMenuItemState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.LinkItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| closeOnClick | `boolean \| undefined` | false, true | no | — | Whether to close the menu when the item is clicked. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `string \| undefined` | See type | no | — | Overrides the text used for keyboard text navigation and filtering. Falls back to the rendered text when not provided. |
| ref | `Ref<Element> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, import("@base-ui/react").ContextMenuLinkItemState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ContextMenuLinkItemState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.CheckboxItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown with the control, using the host platform’s modifier keys. |
| trail | `ReactNode` | See type | no | — | A short trailing note in the trail slot, e.g. where a hidden column went ("In row details"). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| checked | `boolean \| undefined` | false, true | no | — | Whether the checkbox item is currently ticked.  To render an uncontrolled checkbox item, use the `defaultChecked` prop instead. |
| closeOnClick | `boolean \| undefined` | false, true | no | — | Whether to close the menu when the item is clicked. |
| defaultChecked | `boolean \| undefined` | false, true | no | — | Whether the checkbox item is initially ticked.  To render a controlled checkbox item, use the `checked` prop instead. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `string \| undefined` | See type | no | — | Overrides the text used for keyboard text navigation and filtering. Falls back to the rendered text when not provided. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `true` if the rendered element is a native button. |
| onCheckedChange | `((checked: boolean, eventDetails: MenuCheckboxItem.ChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when the checkbox item is ticked or unticked. |
| onClick | `((event: import("@base-ui/react/types").BaseUIEvent<React.MouseEvent<HTMLDivElement, MouseEvent>>) => void) \| undefined` | See type | no | — | The click handler for the menu item. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ContextMenuCheckboxItemState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ContextMenuCheckboxItemState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.RadioGroup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `React.ReactNode` | See type | no | — | The content of the component. |
| className | `string \| ((state: import("@base-ui/react").ContextMenuRadioGroupState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| defaultValue | `any` | See type | no | — | The uncontrolled value of the radio item that should be initially selected.  To render a controlled radio group, use the `value` prop instead. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| onValueChange | `((value: any, eventDetails: MenuRadioGroup.ChangeEventDetails) => void) \| undefined` | See type | no | — | Function called when the selected value changes. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ContextMenuRadioGroupState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ContextMenuRadioGroupState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `any` | See type | no | — | The controlled value of the radio item that should be currently selected.  To render an uncontrolled radio group, use the `defaultValue` prop instead. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.RadioItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown with the control, using the host platform’s modifier keys. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| closeOnClick | `boolean \| undefined` | false, true | no | — | Whether to close the menu when the item is clicked. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `string \| undefined` | See type | no | — | Overrides the text used for keyboard text navigation and filtering. Falls back to the rendered text when not provided. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `true` if the rendered element is a native button. |
| onClick | `((event: import("@base-ui/react/types").BaseUIEvent<React.MouseEvent<HTMLDivElement, MouseEvent>>) => void) \| undefined` | See type | no | — | The click handler for the menu item. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ContextMenuRadioItemState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ContextMenuRadioItemState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `any` | See type | yes | — | Value of the radio item. This is the value that will be set in the MenuRadioGroup when the item is selected. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.Group



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").ContextMenuGroupState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `React.ReactNode` | See type | no | — | The content of the component. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ContextMenuGroupState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ContextMenuGroupState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.GroupLabel



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").ContextMenuGroupLabelState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ContextMenuGroupLabelState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ContextMenuGroupLabelState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.Separator



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").SeparatorState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| orientation | `Orientation \| undefined` | "horizontal", "vertical" | no | — | The orientation of the separator. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").SeparatorState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").SeparatorState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Menu.Submenu



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| disabledReason | `string \| null \| undefined` | See type | no | — | Disable the row and say why. The row is dimmed but stays highlightable; the reason is its tooltip on hover and keyboard highlight, and its accessible description. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| label | `ReactNode` | See type | yes | — | The visible or accessible label for this component. |
| reasonId | `string \| undefined` | See type | no | — | Ignored. Rows used to point at a shared reason line; each row now describes itself. |
| reasonShown | `boolean \| undefined` | false, true | no | — | Ignored. Rows used to share one reason line; the reason is now each row's tooltip. |
| tone | `MenuItemTone \| undefined` | "danger", "default" | no | "default" | The semantic tone. Use danger and warning for consequences and states. |
