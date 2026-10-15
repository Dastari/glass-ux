# PaletteProvider

Hosts the command palette: a registry of commands contributed by whatever is mounted,
⌘K / Ctrl+K from anywhere to open it, and the registered commands' own shortcuts.
Mount once near the root; nested providers defer to the outer one.

`import { PaletteProvider } from "glass-ux/command-palette"`

[Live examples](https://dastari.github.io/glass-ux/components/palette-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| groupOrder | `readonly string[] \| undefined` | See type | no | DEFAULT_ORDER | Group order; "*" marks where unlisted groups go. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
