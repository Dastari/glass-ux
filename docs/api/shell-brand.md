# ShellBrand

The product mark in the top-left corner, centred over the rail: the home link. In Glass UX it
goes to the All organisations dashboard, so it also resets the scope (R5.2).

`import { ShellBrand } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/shell-brand)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string` | See type | yes | — | Accessible name and tooltip: "Glass UX home, all organisations". |
| mark | `ReactNode` | See type | no | — | The mark. Default: the product's configured mark (<BrandMark mark="product" />). |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Render as a router link. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLAnchorElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
