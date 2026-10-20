# Byte size

`glass-ux/byte-size-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A size typed as people write it — "500 MB", "1.5GB", "2 GiB", "750k" — held in bytes and rewritten
when focus leaves. Decimal units (kB, MB, GB: disks and files) by default; `base="binary"` writes
KiB, MiB, GiB (memory). Added because quotas, thresholds and upload limits are everywhere in an RMM
and nobody should convert to megabytes in their head.

```tsx
import { byteSizeSchema } from "glass-ux/byte-size-field"

const schema = z.object({ quota: byteSizeSchema({ required: true, max: 100e9 }) })   // bytes

<form.AppField name="quota">{(field) => <field.ByteSizeField label="Mailbox warning" />}</form.AppField>
```

- **Value:** bytes, `number | null`; `NaN` while unreadable.
- **Options:** `base`, `defaultUnit` (a bare number's unit; default "MB"), `locale` (the decimal
  and grouping marks it writes and reads: "1,5 GB" in de-DE; default: the
  [application locale](../getting-started.md#set-the-formatting-locale)).
- **Parts:** `ByteSizeInput`, `parseBytes`, `formatBytes` (thin space before the unit, R2.7).
