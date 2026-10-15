# ListRow

A clickable list row sharing the library's item recipe and native keyboard activation.

`import { ListRow } from "glass-ux/list-row"`

[Live examples](https://dastari.github.io/glass-ux/components/list-row)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| icon | `ReactNode` | See type | no | — | Leading icon or identity glyph. |
| meta | `ReactNode` | See type | no | — | Secondary information, below the title. |
| selected | `boolean \| undefined` | false, true | no | false | Marks the currently selected destination. |
| title | `ReactNode` | See type | yes | — | Main row label; rich nodes receive a truncation tooltip. |
| trailing | `ReactNode` | See type | no | — | Non-interactive trailing metadata or count. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
