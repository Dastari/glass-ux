# ContextAvatar

A context's avatar: its logo, its icon or its initials on its tint. A rounded square, so
an organisation or project never reads as a person (people are round, ui/avatar). The
"all" scope is a glyph on a neutral tile.

`import { ContextAvatar } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/context-avatar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allLabel | `string \| undefined` | See type | no | DEFAULT_SWITCHER_LABELS.all | The accessible name for the "all" scope when not decorative (default "All organisations"). |
| decorative | `boolean \| undefined` | false, true | no | true | Hidden from assistive tech (default): a visible name sits beside it. |
| icon | `ReactNode` | See type | no | — | The glyph for the "all" scope (default the organisation glyph). |
| item | `Pick<ContextItem, "id" \| "icon" \| "name" \| "avatarSrc" \| "initials" \| "tint"> \| null` | See type | yes | — | The context, or null for the "all" scope. |
| size | `ContextAvatarSize \| undefined` | "xs", "sm", "md", "lg" | no | "sm" | xs 20 (lists, chips) · sm 24 (top bar, dock) · md 32 · lg 40 (page headers). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
