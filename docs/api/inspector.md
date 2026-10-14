# Inspector

Docked: a glass pane. Narrower than 80rem: the same content in a Sheet.

`import { Inspector } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/inspector)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | false, true | no | — | Header actions (ghost sm buttons), before the close button. |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| fill | `boolean \| undefined` | false, true | no | false | The child fills the body edge to edge and scrolls itself: a ConversationLog, which brings its own scroller, floating composer and ask dock. Default: a padded scrolling column. |
| footer | `ReactNode` | false, true | no | — | Pinned to the bottom (a composer, a primary action). |
| icon | `ReactNode` | false, true | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| subtitle | `ReactNode` | false, true | no | — | Under the title, as data: what the pane is showing ("North studio printing and offline PCs"). |
| title | `string` | See type | yes | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
