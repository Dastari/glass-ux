# AddressField

AddressInput bound to an AddressValue form field. Each part is its own form field
(`<name>.line1`…), so `addressSchema()`'s messages land on the right row. Pair it with
`addressSchema()`.

`import { AddressField } from "glass-ux/address-field"`

[Live examples](https://dastari.github.io/glass-ux/components/address-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| bias | `GeocoderBias \| undefined` | See type | no | — | Lean suggestions towards this point: the workspace's home region. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| countries | `readonly string[] \| undefined` | See type | no | — | Only suggest addresses in these countries (ISO codes). |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| geocoder | `GeocoderAdapter \| undefined` | See type | no | — | Where addresses come from. Default: Glass UX's server route (/api/geocode), Photon behind it. |
| hint | `ReactNode` | See type | no | — | Supporting text in the field’s reserved message slot. Validation errors take precedence. |
| homeCountry | `string \| undefined` | See type | no | — | The country of a new address and the one not written on one-line addresses. Default "AU". |
| label | `ReactNode` | See type | yes | — | The lookup's label ("Address", "Site address"). |
| map | `MapConfig \| undefined` | See type | no | — | Show a map with the pin (MapLibre, lazy). Omit for no map. |
| optional | `boolean \| undefined` | false, true | no | — | Shows the optional-field indication without changing validation. |
| placeholder | `string \| undefined` | See type | no | — | The lookup's placeholder. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
