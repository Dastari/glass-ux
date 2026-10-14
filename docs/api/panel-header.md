# PanelHeader

A Panel heading with an optional icon, description and trailing actions.

`import { PanelHeader } from "glass-ux/surface"`

[Live examples](https://dastari.github.io/glass-ux/components/panel-header)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | false, true | no | — | Right-aligned controls. Keep to ghost/secondary buttons, tabs or a segmented control. |
| description | `ReactNode` | false, true | no | — | Additional content describing the value, state, or consequence. |
| icon | `ReactNode` | false, true | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| level | `2 \| 3 \| 4 \| undefined` | 2, 3, 4 | no | 2 | Heading level for the title; panels on a page are normally h2. |
| title | `ReactNode` | false, true | yes | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
