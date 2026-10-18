# CommandPanel

The palette's contents: search field, grouped results and keyboard hints. Rendered in
the modal palette, and on its own in the gallery.

`import { CommandPanel } from "glass-ux/command-palette"`

[Live examples](https://dastari.github.io/glass-ux/components/command-panel)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| commands | `readonly PaletteCommand[]` | See type | yes | — | Available slash commands and their typed arguments. |
| defaultQuery | `string \| undefined` | See type | no | "" | Starting query (gallery specimens). |
| groupOrder | `readonly string[] \| undefined` | See type | no | DEFAULT_ORDER | Preferred order of command or action groups; "*" marks where unlisted groups go. Defaults to `DEFAULT_PALETTE_GROUP_ORDER`. |
| loading | `boolean \| undefined` | false, true | no | false | A source is still fetching: skeleton rows follow the results. |
| onRun | `(command: PaletteCommand) => void` | See type | yes | — | Called when run occurs. The callback type specifies its arguments. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
