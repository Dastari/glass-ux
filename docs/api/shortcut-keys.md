# ShortcutKeys

The keys of a shortcut, as keycaps: "g e" → G E; "mod+k" → Ctrl K.

`import { ShortcutKeys } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/shortcut-keys)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| shortcut | `string` | See type | yes | — | The shortcut: space-separated steps of a sequence ("g e"), each a `+`-joined chord ("mod+k"). |
