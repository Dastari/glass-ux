# Kbd

A keyboard shortcut, formatted for the viewer's platform: ⌘K on macOS, Ctrl K elsewhere.
The text is announced in its platform form; `aria-keyshortcuts` belongs on the control
the shortcut triggers, not here.

`import { Kbd } from "glass-ux/kbd"`

[Live examples](https://dastari.github.io/glass-ux/components/kbd)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| keys | `string` | See type | yes | — | A shortcut such as "mod+k", "mod+shift+r", "shift+f10" or a single key ("esc"). |
| size | `"sm" \| "md" \| undefined` | "sm", "md" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| variant | `"text" \| "keys" \| undefined` | "text", "keys" | no | "keys" | `keys` draws keycaps (help text, palette hints). `text` is the quiet inline form used at the trailing edge of menu and palette rows. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
