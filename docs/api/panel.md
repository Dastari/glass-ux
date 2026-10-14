# Panel

The standard content pane: glass-panel, surface radius, header/body/footer slots.
Every Panel is an inline-size container named `panel`, so anything inside it lays out
against the panel's width — never the viewport's.

`import { Panel } from "glass-ux/surface"`

[Live examples](https://dastari.github.io/glass-ux/components/panel)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| scroll | `boolean \| undefined` | false, true | no | false | Let the body scroll inside a bounded panel instead of growing the page. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
