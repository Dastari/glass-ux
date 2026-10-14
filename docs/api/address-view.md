# AddressView

An address to read, not edit: the postal block in a recessed well with Copy, and optionally
its map. Put it in a Field for a label ("Address") and a hint ("Change it in …").

`import { AddressView } from "glass-ux/address-field"`

[Live examples](https://dastari.github.io/glass-ux/components/address-view)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| copyable | `boolean \| undefined` | false, true | no | true | A copy button for the one-line address. Default true. |
| empty | `ReactNode` | false, true | no | "No address yet" | Shown when the address is empty. |
| homeCountry | `string \| undefined` | See type | no | "AU" | The country left off the postal block. Default "AU". |
| map | `MapConfig \| undefined` | See type | no | — | A small map with the pin, when the address has a position. |
| value | `AddressValue` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
