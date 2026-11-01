# ShortcutHelpDialog

Searchable, grouped list of the registered commands and their keys, in Kbd; with `rebind`, each can be changed.

`import { ShortcutHelpDialog } from "glass-ux/keymap"`

[Live examples](https://dastari.github.io/glass-ux/components/shortcut-help-dialog)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Opens the uncontrolled overlay initially. |
| groupOrder | `readonly string[] \| undefined` | See type | no | [] | Group headings in this order; groups not listed follow in registration order. |
| onOpenChange | `((open: boolean, details: DialogChangeDetails) => void) \| undefined` | See type | no | — | Called with the next open state and Base UI change details (the reason; `details.cancel()` keeps it open) when the trigger, Esc, an outside press, a close control or a sheet swipe opens or dismisses it. Pair with `open` to control it. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| rebind | `boolean \| undefined` | false, true | no | false | Let the person change keys. Each change reaches the provider's `onKeymapChange`. |
| title | `ReactNode` | See type | no | — | The dialog's title. Default "Keyboard shortcuts". |
