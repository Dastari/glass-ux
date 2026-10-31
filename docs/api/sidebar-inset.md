# SidebarInset

The content beside the sidebar: a `<main>` that takes the remaining width and reflows once
when the sidebar settles, never during its motion. With `variant="inset"` it is drawn as a
raised glass panel inset from the edges.

`import { SidebarInset } from "glass-ux/sidebar"`

[Live examples](https://dastari.github.io/glass-ux/components/sidebar-inset)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Render another element instead of `<main>`: `render={<div />}` for the inner provider of a second sidebar, which sits inside the outer `<main>`. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
