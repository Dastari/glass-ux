# BrandMark

A configured mark by name. Renders nothing when the product has not configured it.

`import { BrandMark } from "glass-ux/brand"`

[Live examples](https://dastari.github.io/glass-ux/components/brand-mark)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | — | Accessible name ("Glass UX"). Omit when a visible label or the parent names it. |
| mark | `BrandMarkName` | "product", "wordmark", "ai" | yes | — | The configured product, wordmark or assistant mark to render. |
| tones | `BrandTones \| undefined` | "palette", "brand", "mono" | no | — | Default: the configured tones. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| ref | `Ref<SVGSVGElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
