# BrandLogo

A brand source drawn in its two tones. Size it from the outside (width/height or CSS).

`import { BrandLogo } from "glass-ux/brand"`

[Live examples](https://dastari.github.io/glass-ux/components/brand-logo)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | — | Accessible name ("Glass UX"). Omit when a visible label or the parent names it. |
| source | `BrandSource` | See type | yes | — | The typed source adapter or asset definition consumed by this component. |
| tones | `BrandTones \| undefined` | "palette", "brand", "mono" | no | — | Default: the configured tones. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| ref | `Ref<SVGSVGElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
