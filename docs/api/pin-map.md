# PinMap

Points with a status anywhere in the world, clustered with a status ring, over a token-themed vector basemap with the home region glowing in the data hue.

`import { PinMap } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/pin-map)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| config | `MapConfig` | See type | yes | — | Typed component configuration and external provider definitions. |
| fallback | `LngLatBox \| undefined` | See type | no | WORLD | The area shown when there is no pin: [west, south, east, north]. Default: the world. |
| label | `string` | See type | yes | — | Names the map for assistive tech: "Map of 12 Example Lane". |
| onValueChange | `((point: PinPoint) => void) \| undefined` | See type | no | — | Called when the pin is dropped, nudged with the arrow keys or placed by a click. Without it the pin is fixed (a read-only preview). |
| value | `PinPoint \| null` | See type | yes | — | The pin, or null for none yet. |
| zoom | `number \| undefined` | See type | no | 16 | Zoom used to show the pin. Default 16 (a street and its buildings). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
