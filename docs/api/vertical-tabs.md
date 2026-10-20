# VerticalTabs

Sections held in component state: `Root` (the selected value, controlled or uncontrolled;
a rail, chip strip or picker depending on its own width) and `Panel`. For sections that
are routes, use `RouteVerticalTabs`.

`import { VerticalTabs } from "glass-ux/vertical-tabs"`

[Live examples](https://dastari.github.io/glass-ux/components/vertical-tabs)

## VerticalTabs.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the rail, e.g. "Agent settings sections". |
| defaultValue | `string \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| items | `VerticalTabItem[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| layout | `VerticalTabsLayout \| undefined` | "select", "rail", "icons", "chips" | no | — | Force a layout instead of following the container. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the chosen section's `value` when the person selects a tab, chip or picker item. Pair with `value` to control it. |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## VerticalTabs.Panel



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").TabsPanelState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| keepMounted | `boolean \| undefined` | false, true | no | — | Whether to keep the HTML element in the DOM while the panel is hidden. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").TabsPanelState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").TabsPanelState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `any` | See type | yes | — | The value of the TabPanel. It will be shown when the Tab with the corresponding value is active. |

Also accepts the element’s standard HTML attributes and React DOM events.
