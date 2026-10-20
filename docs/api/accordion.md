# Accordion

Sections that open in place. The chevron turns; items are set apart by space and hover
fills, never by dividers (R5.8). Use for secondary detail (advanced settings, raw data),
not for primary navigation.

`import { Accordion } from "glass-ux/accordion"`

[Live examples](https://dastari.github.io/glass-ux/components/accordion)

## Accordion.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| defaultValue | `AccordionValue<unknown> \| undefined` | See type | no | — | The uncontrolled value of the item(s) that should be initially expanded.  To render a controlled accordion, use the `value` prop instead. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| hiddenUntilFound | `boolean \| undefined` | false, true | no | — | Allows the browser's built-in page search to find and expand the panel contents.  Overrides the `keepMounted` prop and uses `hidden="until-found"` to hide the element without removing it from the DOM. |
| keepMounted | `boolean \| undefined` | false, true | no | — | Whether to keep the element in the DOM while the panel is closed. This prop is ignored when `hiddenUntilFound` is used. |
| loopFocus | `boolean \| undefined` | false, true | no | — | Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434) to remove roving focus.  This prop no longer affects keyboard focus behavior. |
| multiple | `boolean \| undefined` | false, true | no | — | Whether multiple items can be open at the same time. |
| onValueChange | `((value: AccordionValue<unknown>, eventDetails: AccordionRootChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when an accordion item is expanded or collapsed. Provides the new value as an argument. |
| orientation | `Orientation \| undefined` | "horizontal", "vertical" | no | — | Deprecated following the [APG guidance update](https://github.com/w3c/aria-practices/pull/3434) to remove roving focus.  This prop no longer affects keyboard focus behavior. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").AccordionRoot.State<unknown>> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").AccordionRoot.State<unknown>) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `AccordionValue<unknown> \| undefined` | See type | no | — | The controlled value of the item(s) that should be expanded.  To render an uncontrolled accordion, use the `defaultValue` prop instead. |

Also accepts the element’s standard HTML attributes and React DOM events.

## Accordion.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | See type | no | — | Leading icon after the chevron. Pass it without a size. |
| level | `2 \| 3 \| 4 \| 5 \| undefined` | 2, 3, 4, 5 | no | 3 | Heading level of the trigger, to fit the page outline. |
| meta | `ReactNode` | See type | no | — | Trailing data: a count, a status, a short value. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| onOpenChange | `((open: boolean, eventDetails: AccordionItem.ChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when the panel is opened or closed. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").AccordionItemState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").AccordionItemState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `any` | See type | no | — | A unique value that identifies this accordion item. If no value is provided, a unique ID will be generated automatically. Use when controlling the accordion programmatically, or to set an initial open state. |

Also accepts the element’s standard HTML attributes and React DOM events.
