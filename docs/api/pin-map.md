# PinMap

A map with one draggable pin for choosing a location: drag, click or nudge it with the arrow keys (Shift moves further). Controlled through `value`; without `onValueChange` it is a read-only preview.

`import { PinMap } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/pin-map)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| config | `MapConfig` | See type | yes | — | Typed component configuration and external provider definitions. |
| fallback | `LngLatBox \| undefined` | See type | no | WORLD | The area shown when there is no pin: [west, south, east, north]. Default: the world. |
| label | `string` | See type | yes | — | Names the map for assistive tech: "Map of 12 Example Lane". |
| maxRadius | `number \| undefined` | See type | no | 10_000 | The largest radius the handle allows. Default 10,000 m. |
| minRadius | `number \| undefined` | See type | no | 10 | The smallest radius the handle allows. Default 10 m. |
| onRadiusChange | `((metres: number) => void) \| undefined` | See type | no | — | Called with the new radius as its handle is dragged or stepped with the keyboard. Adds the handle; without it the circle is fixed. Keep `radius` controlled, in sync with a field. |
| onValueChange | `((point: PinPoint) => void) \| undefined` | See type | no | — | Called when the pin is dropped, nudged with the arrow keys or placed by a click. Without it the pin is fixed (a read-only preview). |
| radius | `number \| undefined` | See type | no | — | A circle of this many metres around the pin, such as a geofence, drawn at its true size at every zoom and moving with the pin. Omit for none. |
| radiusLabel | `string \| undefined` | See type | no | — | Names the handle: "Geofence radius". Default "Radius". Its value is read as a distance. |
| radiusStep | `number \| undefined` | See type | no | 5 | The handle's step in metres; Page Up and Down move ten. Default 5 m. |
| ref | `Ref<PinMapHandle> \| undefined` | See type | no | — | The handle for moving the view from outside the map. |
| value | `PinPoint \| null` | See type | yes | — | The pin, or null for none yet. |
| zoom | `number \| undefined` | See type | no | 16 | Zoom used to show the pin. Default 16 (a street and its buildings). |
