# KeymapProvider

The central keyboard dispatcher for an application: register commands with
`useShortcutCommands` (or `useActionShortcuts`, from an action definition) and it runs
their keys, chords included, from one listener. Rebinding is a serialisable `keymap` that
the host stores; the library never decides where preferences live.

Mount it once near the root. A widget that handles a key first keeps it, so rich text keeps
its keys, and the palette leaves alone any key the keymap holds; single-character shortcuts
obey `configureShortcuts`. `useHotkeys` is separate and unchanged.

Showing a shortcut is separate from registering one: `Kbd`, `Button shortcut`, tooltips, menu
rows and `useCommandBinding` only read. This one listener runs what is registered, and a
command can be scoped to an element or declared with no `run`.

`import { KeymapProvider } from "glass-ux/keymap"`

[Live examples](https://dastari.github.io/glass-ux/components/keymap-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| chordTimeout | `number \| undefined` | See type | no | 3000 | How long a chord waits for its next step, in milliseconds. Default 3000. 0 waits until Escape or another key, for people who need longer (WCAG 2.2.1). |
| defaultKeymap | `Readonly<Record<string, readonly string[]>> \| undefined` | See type | no | — | The changed keys at first when uncontrolled, from wherever the host keeps them. |
| keymap | `Readonly<Record<string, readonly string[]>> \| undefined` | See type | no | — | The person's changed keys. Controlled while defined; JSON-safe, so store it anywhere. |
| onKeymapChange | `((keymap: Keymap) => void) \| undefined` | See type | no | — | Called with the whole keymap after each change. Save it here: the library stores nothing. |
| pendingDisplay | `"none" \| "float" \| undefined` | "none", "float" | no | "float" | How the chord in progress shows. `float` (default): a small label above the foot of the screen. `none`: place `ShortcutPending` yourself, such as in a StatusBar. |
