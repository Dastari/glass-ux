# RouteTabs

L2 tabs as routes — the default (R6.2). Identical to `Tabs` in look and keyboard; the
active tab is read from the location and every tab, including those in More, is a link.

`import { RouteTabs } from "glass-ux/tabs"`

[Live examples](https://dastari.github.io/glass-ux/components/route-tabs)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| items | `RouteTabItem[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
