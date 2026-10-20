# ContextSwitcherPanel

The switcher's list, always open, for a sheet, a page or the gallery.

`import { ContextSwitcherPanel } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/context-switcher-panel)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| all | `boolean \| undefined` | false, true | no | true | Offer an "all" row (default true). |
| icon | `ReactNode` | See type | no | — | The glyph for the "all" scope (default the organisation glyph). |
| items | `readonly I[]` | See type | yes | — | Complete local hierarchy, or the loaded flat server results when remote is supplied. |
| labels | `Partial<SwitcherLabels> \| undefined` | See type | no | — | The words it shows and announces; see ContextSwitcher's `labels`. |
| onValueChange | `(value: string \| null) => void` | See type | yes | — | Called with the chosen context id, or null for all, when the person picks a row (also when it is the current one). |
| recent | `readonly string[] \| undefined` | See type | no | [] | Previously selected ids, ordered most recent first. |
| remote | `ContextSwitcherRemote \| undefined` | See type | no | — | Controlled server search and paging; parent links and local recents are ignored. |
| value | `string \| null` | See type | yes | — | Selected context id, or null for the "all" scope (or none, when `all` is false). |
