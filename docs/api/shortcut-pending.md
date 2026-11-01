# ShortcutPending

The keys of a chord in progress and that it waits for the next one. It renders nothing
until then, so put it where it can appear without moving anything: `StatusBar.End`, or a
slot with its width reserved. Announcing is the provider's.

`import { ShortcutPending } from "glass-ux/keymap"`

[Live examples](https://dastari.github.io/glass-ux/components/shortcut-pending)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
