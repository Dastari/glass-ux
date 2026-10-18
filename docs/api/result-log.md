# ResultLog

Log or terminal output: time, a level word in its tone (the same roles as badges),
and the message in monospace. Long output shows its last lines first; expanding shows
the rest above. Copy takes every line.

`import { ResultLog } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-log)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "log"; lines: LogLine[]; }` | See type | yes | — | The log result: `lines` in order, each with a level, the text and an optional time; the line and error counts are the data line. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
