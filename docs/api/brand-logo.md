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

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
