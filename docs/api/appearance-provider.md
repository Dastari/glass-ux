# AppearanceProvider

Provide persisted appearance preferences and synchronize theme, palette, density, motion and typography with the document. Also installs the pointer light for lit glass (`installPointerLight`), the shared shimmer beat (`installShimmerSync`) and, when the application selects baked glass rendering, the baked frost (`installBakedFrost`).

`import { AppearanceProvider } from "glass-ux/appearance"`

[Live examples](https://dastari.github.io/glass-ux/components/appearance-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
