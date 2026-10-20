# ListRow

A clickable list row sharing the library's item recipe and native keyboard activation.

`import { ListRow } from "glass-ux/list-row"`

[Live examples](https://dastari.github.io/glass-ux/components/list-row)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| icon | `ReactNode` | See type | no | — | Leading icon or identity glyph. |
| meta | `ReactNode` | See type | no | — | Secondary information, below the title. |
| selected | `boolean \| undefined` | false, true | no | false | Marks the currently selected destination. |
| title | `ReactNode` | See type | yes | — | Main row label; rich nodes receive a truncation tooltip. |
| trailing | `ReactNode` | See type | no | — | Non-interactive trailing metadata or count. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| ((state: import("@base-ui/react").ButtonState) => string \| undefined) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| focusableWhenDisabled | `boolean \| undefined` | false, true | no | — | Whether the button should be focusable when disabled. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| nativeButton | `boolean \| undefined` | false, true | no | — | Whether the component renders a native `<button>` element when replacing it via the `render` prop. Set to `false` if the rendered element is not a button (for example, `<div>`). |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| render | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>> \| ComponentRenderFn<HTMLProps, import("@base-ui/react").ButtonState> \| undefined` | See type | no | — | Allows you to replace the component's HTML element with a different tag, or compose it with another component.  Accepts a `ReactElement` or a function that returns the element to render. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").ButtonState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.
