# PaletteProvider

Hosts the command palette: a registry of commands contributed by whatever is mounted,
⌘K / Ctrl+K from anywhere to open it, and the registered commands' own shortcuts (a
single-character shortcut can be switched off for the application with `configureShortcuts`).
The palette shortcut also works while a focusable disabled button has focus, without
activating that button.
Mount once near the root; nested providers defer to the outer one.

`import { PaletteProvider } from "glass-ux/command-palette"`

[Live examples](https://dastari.github.io/glass-ux/components/palette-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| groupOrder | `readonly string[] \| undefined` | See type | no | DEFAULT_ORDER | Group order; "*" marks where unlisted groups go. Defaults to `DEFAULT_PALETTE_GROUP_ORDER`. |
