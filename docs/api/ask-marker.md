# AskMarker

A pending ask's place in the transcript while the ask dock holds it: one line, the same
box as the record it becomes, and Review, which brings the ask to the front of the dock
and moves focus to it. Never a second interactive copy.

`import { AskMarker } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ask-marker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `AiAsk` | See type | yes | — | The typed request and its current resolution state. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
