# ShellBrand

The product mark in the top-left corner, centred over the rail: the home link. In Glass UX it
goes to the All organisations dashboard, so it also resets the scope (R5.2).

`import { ShellBrand } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/shell-brand)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string` | See type | yes | — | Accessible name and tooltip: "Glass UX home, all organisations". |
| mark | `ReactNode` | false, true | no | — | The mark. Default: the product's configured mark (<BrandMark mark="product" />). |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Render as a router link. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
