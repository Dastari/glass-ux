# OrgSwitcher

Choose an organisation from a complete local hierarchy or a bounded server directory.

`import { OrgSwitcher } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/org-switcher)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| labels | `Partial<SwitcherLabels> \| undefined` | See type | no | — | Display and accessibility labels supplied by the application. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called when open change occurs. The callback type specifies its arguments. |
| onValueChange | `(value: string \| null) => void` | See type | yes | — | A choice was made (also when it is the current one: the caller may ignore it). |
| open | `boolean \| undefined` | false, true | no | — | Controlled open state, so a palette command or a shortcut can open it. |
| organisations | `readonly O[]` | See type | yes | — | Complete local hierarchy, or the loaded flat server results when remote is supplied. |
| recent | `readonly string[] \| undefined` | See type | no | [] | Recently chosen organisation ids, most recent first (useRecentOrganisations). |
| remote | `OrgSwitcherRemote \| undefined` | See type | no | — | Controlled server search/paging. Bypasses local filtering and ignores parent links and recents. |
| searchPlaceholder | `string \| undefined` | See type | no | "Find an organisation" | Placeholder of the search field. |
| value | `string \| null` | See type | yes | — | The current scope: an organisation id, or null for all organisations. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
