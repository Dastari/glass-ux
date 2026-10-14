# ImageTile

One image in its reserved aspect-ratio box: it never moves anything when it loads.

`import { ImageTile } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/image-tile)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| cover | `boolean \| undefined` | false, true | no | false | Cover image or cover rendering options. |
| image | `ResultImage` | See type | yes | — | Image content or media definition. |
| onOpen | `(() => void) \| undefined` | See type | no | — | Event callback; the typed signature specifies its arguments. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
