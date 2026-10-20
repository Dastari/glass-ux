# WindowSwitcher

Phones: every open window in a bottom sheet, plus the routed view.

`import { WindowSwitcher } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-switcher)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onOpenChange | `(open: boolean) => void` | See type | yes | — | Called with the next open state when the sheet is dismissed (swipe, Esc, scrim) and with false after the person chooses a window. Pair with `open`. |
| open | `boolean` | false, true | yes | — | Controls whether the overlay is open. |
| primaryLabel | `string \| undefined` | See type | no | "Current page" | Visible label for the primary action. |
