# DirectionProvider

Shares reading direction with Base UI keyboard and pointer behaviour. Does not create a DOM wrapper.

`import { DirectionProvider } from "glass-ux/locale"`

[Live examples](https://dastari.github.io/glass-ux/components/direction-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | Components using this direction, including portalled overlays. |
| direction | `TextDirection \| undefined` | "ltr", "rtl" | no | — | Reading direction. Defaults to left-to-right. |
