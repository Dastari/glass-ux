# RouteVerticalTabs

L3 sections as routes — the default (R6.2): `/settings/security/sessions`. The current
section is read from the location (child routes stay inside their section); every row,
chip and picker entry is a link.

`import { RouteVerticalTabs } from "glass-ux/vertical-tabs"`

[Live examples](https://dastari.github.io/glass-ux/components/route-vertical-tabs)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Accessible name when a visible label does not name the control. |
| children | `ReactNode` | See type | no | — | The section's content: normally the route's `<Outlet />`. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| items | `RouteTabItem[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| layout | `VerticalTabsLayout \| undefined` | "select", "rail", "icons", "tabs", "chips" | no | — | Layout or presentation mode. |
