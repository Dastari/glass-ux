# IP address

`glass-ux/ip-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)


An IPv4 or IPv6 address, optionally with a prefix length (CIDR). When focus leaves it becomes
canonical: leading zeros dropped (`010.013.004.001` → `10.13.4.1`, read as decimal, never octal),
IPv6 lower-cased and compressed per RFC 5952 (`2001:db8::1`), IPv4-mapped tails kept, brackets and
zone ids dropped. The hint says what it is ("Private · 1,022 hosts · 10.13.4.1–10.13.7.254", or
"Host bits set: the network is 192.168.1.0/24"); Copy appears once it is valid.

```tsx
import { ipSchema } from "glass-ux/ip-field"

const schema = z.object({
  gateway: ipSchema({ version: 4, required: true }),
  subnet: ipSchema({ version: 4, cidr: "required" }),   // "Add a prefix length, such as /24"
})

<form.AppField name="subnet">{(field) => <field.IpField label="Subnet" version={4} cidr="required" width="medium" />}</form.AppField>
```

- **Options:** `version` (4, 6 or "any"), `cidr` ("none" default, "optional", "required");
  `describe` (default true) on the bound field.
- **Parts:** `IpInput`, `parseIp`, `normaliseIp`, `networkOf`, `isNetworkAddress`,
  `describeRange`, `scopeOf`.
