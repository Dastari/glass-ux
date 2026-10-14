# Port

`glass-ux/port-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)


A TCP or UDP port: whole numbers 1–65535, no grouping, the service usually on it named inside the
box ("443 HTTPS"), arrow keys to step (Shift by 1,000), no steppers. Short width by default. Built
on NumberField.

```tsx
import { portSchema } from "glass-ux/port-field"

const schema = z.object({ port: portSchema({ required: true }) })   // number | null

<form.AppField name="port">{(field) => <field.PortField label="Port" services={{ 8443: "UniFi" }} />}</form.AppField>
```

- **Options:** `service` (default true), `services` (your own names, checked first).
- **Message:** "Enter a port from 1 to 65535".
- **Parts:** `PortInput`, `WELL_KNOWN_PORTS`, `serviceOf`, `parsePort`, `isPort`.
