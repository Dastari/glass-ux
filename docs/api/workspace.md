# Workspace

The windowed workspace: the routed `primary` view plus every open window from the
enclosing `WindowManagerProvider`, tiled, floating or maximised, with the dock. On phones
the focused window covers the screen and a switcher lists the rest. Reports its size to the
manager so new windows are placed inside it.

`import { Workspace } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/workspace)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| dock | `boolean \| undefined` | false, true | no | true | Show the dock of open windows (default true). |
| primary | `ReactNode` | See type | yes | — | The routed view. Render EntityHeader, WindowFrame.Body and WindowFrame.StatusBar. |
| primaryLabel | `string` | See type | yes | — | Accessible name for the primary window, normally the entity or page title. |
| reservePrimary | `boolean \| undefined` | false, true | no | true | Keep a column for the primary view beside tiled windows (default true). When false, tiled windows fill the stage and the primary view shows only while none is tiled: for a page that is entirely windows, such as a dashboard. Phone sheets are unchanged. |
| scopes | `WindowScopes \| undefined` | See type | no | — | The tenant scope the user is in and how to draw one (R14.4). Windows from another scope show its chip in their app bar, and the dock groups windows by scope. Omit for a product without scopes. |
| tileOrder | `readonly string[] \| undefined` | See type | no | — | Preferred order of tiled windows by id, from the start of the stage; unlisted windows follow in the order they were opened. A window closed and reopened returns to its place. Floating windows and the dock are unaffected. |
