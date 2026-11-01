# RouteBreadcrumb

The universal breadcrumb with router links — what the shell renders from route matches.

`import { RouteBreadcrumb } from "glass-ux/breadcrumb"`

[Live examples](https://dastari.github.io/glass-ux/components/route-breadcrumb)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. The default form is named "Breadcrumb"; the compact form falls back to "Path", so supply what the path is ("File path") and never a name that claims to be the route breadcrumb. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| collapse | `"auto" \| "current" \| undefined` | "auto", "current" | no | — | "auto" (default): measured, full → middle → compact → current. "current": always only the current crumb with the trail in its popup (a host that has measured, as the top bar does through BreadcrumbFoldContext). |
| header | `ReactNode` | See type | no | — | First in the trail popup when the context is folded into it: the module switch. |
| items | `RouteCrumb[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| scope | `BreadcrumbScope \| undefined` | See type | no | — | The scope row above the trail when folded into it: the organisation. |
| size | `BreadcrumbSize \| undefined` | "xs", "sm" | no | — | "sm" (default): the route breadcrumb, one line at `--control-h-sm`, in the top bar. "xs": a compact path inside a pane, one line at `--control-h-xs` with label-size type, for content rather than the route (a file's folders in an editor pane, R6.4). It folds within its own box like the default and never replaces or repeats the route breadcrumb. Name it with `aria-label`. |
