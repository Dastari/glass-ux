# OrgAvatar

An organisation's avatar: its logo, or its initials on its tint. A rounded square, so an
organisation never reads as a person (people are round, ui/avatar). All organisations is
the organisation glyph on a neutral tile.

`import { OrgAvatar } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/org-avatar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| decorative | `boolean \| undefined` | false, true | no | true | Hidden from assistive tech (default): a visible name sits beside it. |
| org | `Pick<SwitcherOrganisation, "id" \| "name" \| "avatarSrc" \| "initials" \| "tint"> \| null` | See type | yes | — | The organisation, or null for "All organisations". |
| size | `OrgAvatarSize \| undefined` | "xs", "sm", "md", "lg" | no | "sm" | xs 20 (lists, chips) · sm 24 (top bar, dock) · md 32 · lg 40 (page headers). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
