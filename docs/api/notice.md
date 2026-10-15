# Notice

Information that belongs to a place on the page — always rendered there, never injected
(R9.1). The tone's icon leads; text stays in text colours so it reads in every palette.
For transient outcomes use a toast; for connection state use the status bar.

`import { Notice } from "glass-ux/notice"`

[Live examples](https://dastari.github.io/glass-ux/components/notice)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| action | `ReactNode` | See type | no | — | One trailing control: a small Button or a link. |
| compact | `boolean \| undefined` | false, true | no | false | One line that truncates; the full text is available on hover and keyboard focus. |
| title | `ReactNode` | See type | no | — | A short bold lead-in. Optional: most notices are one sentence. |
| tone | `NoticeTone \| undefined` | "danger", "warning", "success", "info" | no | "info" | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
