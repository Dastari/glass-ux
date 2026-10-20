# Breadcrumb

The universal breadcrumb (R6.4): one line at --control-h-sm in the top bar. Every crumb
but the current one navigates; a crumb with siblings carries a switcher. It collapses
against its own width — first the middle crumbs, then to `‹ parent · current` — and each
crumb truncates with an ellipsis at a maximum width.

`import { Breadcrumb } from "glass-ux/breadcrumb"`

[Live examples](https://dastari.github.io/glass-ux/components/breadcrumb)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| collapse | `"auto" \| "current" \| undefined` | "auto", "current" | no | "auto" | "auto" (default): measured, full → middle → compact → current. "current": always only the current crumb with the trail in its popup (a host that has measured, as the top bar does through BreadcrumbFoldContext). |
| header | `ReactNode` | See type | no | — | First in the trail popup when the context is folded into it: the module switch. |
| items | `Crumb[]` | See type | yes | — | Root first, current place last. Feed it from the router's matches. |
| renderLink | `RenderCrumbLink \| undefined` | See type | no | — | Renders crumbs with `link` as router links (RouteBreadcrumb supplies this). |
| scope | `BreadcrumbScope \| undefined` | See type | no | — | The scope row above the trail when folded into it: the organisation. |
