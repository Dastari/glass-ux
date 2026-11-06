# Inspector

Docked: a glass pane. Narrower than 80rem: the same content in a Sheet.

`import { Inspector } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/inspector)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | See type | no | — | Header actions (ghost sm buttons), before the close button. |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| closeName | `string \| undefined` | See type | no | — | The pane's name for its close button, docked or as a sheet: "Close Meridian Assistant". Pass the title, or a steadier name when the title follows the selection. Default: the docked pane's button is "Hide inspector" and the sheet's is "Close". |
| fill | `boolean \| undefined` | false, true | no | false | The child fills the body edge to edge and scrolls itself: a ConversationLog, which brings its own scroller, floating composer and ask dock. Default: a padded scrolling column. |
| footer | `ReactNode` | See type | no | — | Pinned to the bottom (a composer, a primary action). |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| subtitle | `ReactNode` | See type | no | — | Under the title, as data: what the pane is showing ("North studio printing and offline PCs"). |
| title | `string` | See type | yes | — | The heading or title content. |
