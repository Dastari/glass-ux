# OrgSwitcherPanel

The switcher's list, always open, for a sheet, a page or the gallery.

`import { OrgSwitcherPanel } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/org-switcher-panel)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| labels | `Partial<SwitcherLabels> \| undefined` | See type | no | — | Display and accessibility labels supplied by the application. |
| onValueChange | `(value: string \| null) => void` | See type | yes | — | Called when value change occurs. The callback type specifies its arguments. |
| organisations | `readonly O[]` | See type | yes | — | Complete local hierarchy, or the loaded flat server results when remote is supplied. |
| recent | `readonly string[] \| undefined` | See type | no | [] | Previously selected IDs, ordered most recent first. |
| remote | `OrgSwitcherRemote \| undefined` | See type | no | — | Controlled server search and paging; parent links and local recents are ignored. |
| searchPlaceholder | `string \| undefined` | See type | no | "Find an organisation" | Prompt in the searchable hierarchy. Defaults to "Find an organisation". |
| value | `string \| null` | See type | yes | — | Selected organisation ID, or null for the all-organisations scope. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
