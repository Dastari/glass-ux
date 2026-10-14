# Coordinates

`glass-ux/coordinates-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Latitude and longitude in one box. Paste anything a person has and it becomes
"-42.88334, 147.32688" when focus leaves:

- decimal pairs with a comma or a space; hemisphere letters before or after (`42.88S 147.33E`)
- degrees, minutes and seconds (`42°53′0″S 147°19′37″E`, `'` and `"` too) and decimal minutes
- Google Maps (`@lat,lng`, the place's `!3d…!4d…`, `?q=`), OpenStreetMap (`#map=`, `mlat`),
  Apple Maps (`ll=`) links and `geo:` URIs
- a pair that only fits as longitude, latitude (GeoJSON order) is read that way

Buttons: Copy; "Pick on map" (a popover with a PinMap: click to place, drag to adjust; needs `map`);
"Use my location" (the Geolocation API; asked only when pressed; a blocked site is disabled with
how to allow it; failures toast the reason).

```tsx
import { coordinatesSchema } from "glass-ux/coordinates-field"

const schema = z.object({ position: coordinatesSchema({ required: true }) })

<form.AppField name="position">
  {(field) => <field.CoordinatesField label="Site position" map={mapConfig} mapFallback={[143.8, -43.7, 148.5, -39.5]} />}
</form.AppField>
```

- **Value:** `{ lat, lng } | null`, five decimals (about a metre). While the text cannot be read the
  value is `{ lat: NaN, lng: NaN }`; out-of-range numbers are kept, so the schema says which is wrong.
- **Messages:** "Enter a latitude and longitude, such as -42.88334, 147.32688", "Latitude must be
  between -90 and 90", "Longitude must be between -180 and 180".
- **Hint:** the point in DMS ("42°53′0.0″S 147°19′36.8″E") unless a hint is given.
- **Parts:** `CoordinatesInput`, `parseCoordinates`, `formatCoordinates`, `formatDms`, `toDms`.
