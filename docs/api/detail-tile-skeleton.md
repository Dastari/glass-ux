# DetailTileSkeleton

The exact box of a one-line DetailTile (plus its detail line when `detail`).

`import { DetailTileSkeleton } from "glass-ux/detail-tile"`

[Live examples](https://dastari.github.io/glass-ux/components/detail-tile-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| detail | `boolean \| undefined` | false, true | no | false | Additional detail for this value or request. |
| icon | `boolean \| undefined` | false, true | no | true | An icon element without an explicit size; the component sizes it through its tokens. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
