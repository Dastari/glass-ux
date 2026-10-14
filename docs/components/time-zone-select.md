# Time zone

`glass-ux/time-zone-select` · [Live component catalogue](https://dastari.github.io/glass-ux/)


An IANA time zone chosen by typing a city or region. Rows show the abbreviation and offset now
("AEDT · UTC+11:00"), so daylight saving is visible; suggested zones (this browser's and UTC by
default) are listed first; the hint shows the time there now. The list comes from the platform
(Intl.supportedValuesOf), so there is no table to maintain.

```tsx
import { timeZoneSchema } from "glass-ux/time-zone-select"

const schema = z.object({ zone: timeZoneSchema({ required: true }) })   // "Australia/Hobart"

<form.AppField name="zone">{(field) => <field.TimeZoneField label="Time zone" suggested={["Australia/Hobart", "UTC"]} />}</form.AppField>
```

Store the IANA name, never an offset. Parts: `TimeZoneSelect`, `timeZoneOptions`,
`describeTimeZone`, `offsetMinutes`, `formatOffset`, `localTimeZone`, `isTimeZone`.
