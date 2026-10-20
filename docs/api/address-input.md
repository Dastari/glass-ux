# AddressInput

The address editor on its own (controlled or not). Inside a TanStack form, use AddressField
instead: it gives every part its own form field.

`import { AddressInput } from "glass-ux/address-field"`

[Live examples](https://dastari.github.io/glass-ux/components/address-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| bias | `GeocoderBias \| undefined` | See type | no | — | Lean suggestions towards this point: the workspace's home region. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| countries | `readonly string[] \| undefined` | See type | no | — | Only suggest addresses in these countries (ISO codes). |
| defaultValue | `AddressValue \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| errors | `Partial<Record<keyof AddressParts, string>> \| undefined` | See type | no | — | Messages per part, for a form you manage yourself. |
| geocoder | `GeocoderAdapter \| undefined` | See type | no | — | Where addresses come from. Default: Glass UX's server route (/api/geocode), Photon behind it. |
| hint | `ReactNode` | See type | no | — | Supporting text in the field’s reserved message slot. Validation errors take precedence. |
| homeCountry | `string \| undefined` | See type | no | "AU" | The country of a new address and the one not written on one-line addresses. Default "AU". |
| label | `ReactNode` | See type | yes | — | The lookup's label. |
| map | `MapConfig \| undefined` | See type | no | — | Show a map with the pin (MapLibre, lazy). Omit for no map. |
| onValueChange | `((value: AddressValue) => void) \| undefined` | See type | no | — | Called with the whole updated address whenever any part changes. Pair with `value` to control it; use `defaultValue` otherwise. |
| optional | `boolean \| undefined` | false, true | no | — | Shows the optional-field indication without changing validation. |
| placeholder | `string \| undefined` | See type | no | — | The lookup's placeholder. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| value | `AddressValue \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
