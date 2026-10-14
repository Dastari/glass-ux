# SourceList

The sources behind an answer: numbered to match the markers in the text, with the site
or the Glass UX record each came from. External sources open in a new tab and say so.

`import { SourceList } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/source-list)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| sources | `AiSource[]` | See type | yes | — | Citations or data sources associated with the content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
