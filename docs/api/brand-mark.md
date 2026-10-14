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

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
