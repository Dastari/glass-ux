# TabNav

The same strip as `Tabs.List` for tabs that are places (R6.2: routes by default). Renders
links in a `<nav>`: the active one carries `aria-current="page"`, one link is tabbable,
and the arrow keys, Home / End and Space work exactly as in `Tabs`. Overflow moves into the
same "More" menu, whose rows are links too. Router-agnostic: `RouteTabs` adapts it to
TanStack Router.

`import { TabNav } from "glass-ux/tabs"`

[Live examples](https://dastari.github.io/glass-ux/components/tab-nav)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| items | `T[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| renderLink | `RenderTabLink<T>` | See type | yes | — | Renders a tab or More-menu row as a link, spreading the props given. |
| value | `string \| null` | See type | yes | — | The active tab's value — derived from the location by the route adapter. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
