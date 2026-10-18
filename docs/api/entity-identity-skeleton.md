# EntityIdentitySkeleton

Loading placeholder with the same boxes as the loaded identity at each tier; with `tier="auto"` (default) it measures its container like EntityIdentity. Also available as `EntityIdentity.Skeleton`.

`import { EntityIdentitySkeleton } from "glass-ux/entity"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-identity-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `boolean \| undefined` | false, true | no | — | Reserve the actions (header: one control; compact and row: the ⋯). |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| facts | `boolean \| undefined` | false, true | no | — | Reserve the facts line (header, compact) or the second line (row). Default true. |
| fill | `boolean \| undefined` | false, true | no | — | Lets the component fill a box with a definite size. |
| metric | `boolean \| undefined` | false, true | no | — | Reserve the live metric's box (header). |
| size | `"inline" \| "sm" \| undefined` | "inline", "sm" | no | — | Chip size. |
| tabs | `boolean \| undefined` | false, true | no | — | Tab definitions in display order. |
| tier | `EntityTierProp \| undefined` | "header", "row", "auto", "compact", "icon", "chip" | no | "auto" | Named size tier or automatic container-based tier selection. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
