# Address

`glass-ux/address-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A street address found by typing, then kept as structured parts. Choosing a suggestion fills
every part and drops a pin; the parts stay editable, and "Enter manually" opens them without a
lookup. An optional map shows the pin, which can be dragged, nudged with the arrow keys or placed
by clicking the map.

## Usage

```tsx
import { addressSchema } from "glass-ux/address-field"

const schema = z.object({
  address: addressSchema({ required: true }),   // messages on line1, locality, postcode, country
  billing: addressSchema(),                     // empty is fine
})

<form.AppField name="address">
  {(field) => (
    <field.AddressField
      label="Address"                            // names it while empty
      bias={{ lat: -42.88, lng: 147.33, zoom: 6 }}  // the workspace's home region
      countries={["AU", "NZ"]}                  // suggest only these
      homeCountry="AU"                          // a new address's country; left off one-line addresses
      map={mapConfig}                           // optional: the pin map (MapLibre, lazy)
    />
  )}
</form.AppField>
```

Read-only: `<Field label="Address"><AddressView value={address} map={mapConfig} /></Field>`.
Outside a form: `<AddressInput label="Site address" value={value} onValueChange={setValue} />`.

## Value

```ts
interface AddressValue {
  line1: string; // the street: "12 Example Lane", or "PO Box 12"
  line2: string; // unit, level or building: "Level 2"
  locality: string; // suburb, town or city
  region: { code: string; name: string }; // ISO 3166-2 "AU-TAS" / "Tasmania"; code "" when unknown
  postcode: string;
  country: { code: string; name: string }; // ISO 3166-1 alpha-2
  location: { lat: number; lng: number } | null;
  pinned: boolean; // the pin was placed by hand
}
```

The bound field gives every part its own form field (`address.line1`, `address.postcode`…), so a
schema message lands on the row to fix and Save focuses it. A new lookup of the same street keeps a
unit already typed and a pin already placed by hand.

Helpers: `formatAddress(value, homeCountry)` ("Level 2, 12 Example Lane, Hobart TAS 7000"),
`addressLines`, `sameAddress`, `isEmptyAddress`, `emptyAddress(country)`, `resolveRegion`,
`addressConvention(country)` (labels: ZIP code, Province…; postcode pattern).

## The geocoder

Lookups go through a `GeocoderAdapter`:

```ts
interface GeocoderAdapter {
  search(query, { signal, bias, countries, lang, limit }): Promise<AddressSuggestion[]>;
  attribution: { provider; providerHref?; data; dataHref? }; // shown in the suggestions' footer
  minChars?: number; // default 3
  debounceMs?: number; // default 300
}
```

The field debounces typing, cancels stale requests (only the latest query renders) and caches
recent queries. Pass `geocoder` to change the provider.

The default `createServerGeocoder()` sends a same-origin `GET /api/geocode` request.
**Your application must implement this endpoint** or pass another `GeocoderAdapter`.
Glass UX does not include a server, proxy, authentication layer or upstream rate limiter.

The default adapter sends `q`, `limit`, `lang`, repeated `country` parameters and optional
`lat`, `lon`, `zoom`. It expects `{ features: PhotonFeature[] }`; use
`photonToSuggestions` when adapting Photon-compatible results. A non-success response
may return `{ code: string }`, which becomes a `GeocoderError`.

Choose your own provider, attribution, caching, rate limits and authentication. A
self-hosted Photon can use `createPhotonGeocoder({ url })`, subject to your network and
privacy requirements. A fully custom adapter can return structured suggestions directly.
The public component demos use a deterministic fictional adapter and make no external
address requests.

The field debounces and cancels stale lookups. Choosing a suggestion fills editable parts
and places the pin; manual entry remains available. Show attribution for real providers.
See the [AddressInput API](../api/address-input.md), the `AddressValue` type declared in
`glass-ux/address-field` and the [maps guide](../map.md) for the full component and map
contract.
