# Disclosure

A single show/hide section with the accordion's row and motion.

`import { Disclosure } from "glass-ux/accordion"`

[Live examples](https://dastari.github.io/glass-ux/components/disclosure)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | See type | no | — | Leading icon after the chevron. Pass it without a size. |
| meta | `ReactNode` | See type | no | — | Trailing data: a count, a status, a short value. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Whether the collapsible panel is initially open.  To render a controlled collapsible, use the `open` prop instead. |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. |
| onOpenChange | `((open: boolean, eventDetails: CollapsibleRootChangeEventDetails) => void) \| undefined` | See type | no | — | Event handler called when the panel is opened or closed. |
| open | `boolean \| undefined` | false, true | no | — | Whether the collapsible panel is currently open.  To render an uncontrolled collapsible, use the `defaultOpen` prop instead. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").CollapsibleRootState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").CollapsibleRootState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.
