# StatusBar

A general application status bar: `StatusBar` with `StatusBar.Start`, `StatusBar.End`,
`StatusBar.Item` and the live `StatusBar.Group`. `WindowFrame.StatusBar` and its parts are
built on these.

`import { StatusBar } from "glass-ux/status-bar"`

[Live examples](https://dastari.github.io/glass-ux/components/status-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the bar: "Editor status". |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | The element, for measuring or focus. |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element to render instead of a div. It keeps its own role (`<footer />`). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |

Also accepts the element’s standard HTML attributes and React DOM events.
