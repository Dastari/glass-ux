# ContextSwitcher

Choose a context (an organisation, a project, a workspace) from a complete local hierarchy or a bounded server directory.

`import { ContextSwitcher } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/context-switcher)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| all | `boolean \| undefined` | false, true | no | true | Offer an "all" row that clears the scope (default true). Without it, null means nothing is chosen yet and the trigger reads `labels.choose`. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | See type | no | — | The glyph for the "all" scope and for nothing chosen (default the organisation glyph). |
| items | `readonly I[]` | See type | yes | — | Complete local hierarchy, or the loaded flat server results when remote is supplied. |
| labels | `Partial<SwitcherLabels> \| undefined` | See type | no | — | The words it shows and announces. Default: organisations. Build a set for another noun with `switcherLabels({ one: "project", other: "projects" })`; single overrides merge over the default. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state when the popup (or phone sheet) opens or closes, including the close after a choice. Pair with `open` to control it. |
| onValueChange | `(value: string \| null) => void` | See type | yes | — | A choice was made (also when it is the current one: the caller may ignore it). |
| open | `boolean \| undefined` | false, true | no | — | Controlled open state, so a palette command or a shortcut can open it. |
| recent | `readonly string[] \| undefined` | See type | no | [] | Recently chosen context ids, most recent first (useRecentContexts). |
| remote | `ContextSwitcherRemote \| undefined` | See type | no | — | Controlled server search/paging. Bypasses local filtering and ignores parent links and recents. |
| value | `string \| null` | See type | yes | — | The current scope: a context id, or null for all (or none, when `all` is false). |
