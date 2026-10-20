# VerticalTabNav

Route navigation for sections, with an active location indicator and responsive rail, chip and picker layouts. Links in a `<nav>`, the
current one with `aria-current="page"`; one row is tabbable and the arrow keys (↑ ↓ in the
rail, ← → as chips), Home / End and Space behave as in `VerticalTabs`. Collapses to chips
or a picker whose rows are links. Router-agnostic: `RouteVerticalTabs` adapts it.

`import { VerticalTabNav } from "glass-ux/vertical-tabs"`

[Live examples](https://dastari.github.io/glass-ux/components/vertical-tab-nav)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Accessible name when a visible label does not name the control. |
| children | `ReactNode` | See type | no | — | The section's content (the route's outlet). |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| items | `T[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| layout | `VerticalTabsLayout \| undefined` | "select", "rail", "icons", "chips" | no | — | Layout or presentation mode. |
| renderLink | `RenderVerticalTabLink<T>` | See type | yes | — | Renders a link with the host router. |
| value | `string \| null` | See type | yes | — | The active section's value — derived from the location by the route adapter. |
