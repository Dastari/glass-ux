# AppShell

Compose application navigation, a top bar and a workspace, with optional section drawer, inspector and phone navigation.

`import { AppShell } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/app-shell)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| brand | `ReactNode` | false, true | yes | — | Top-left corner, above the rail: the product mark (ShellBrand). |
| children | `ReactNode` | false, true | yes | — | The workspace: normally <Workspace primary={<Outlet />} />. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| drawer | `ReactNode` | false, true | no | — | The current section's navigation (SectionDrawer). Optional per section. |
| drawerShortcut | `string \| undefined` | See type | no | "mod+b" | Toggle the drawer from the keyboard. Default mod+b. |
| inspector | `ReactNode` | false, true | no | — | Context pane (Inspector), docked beside the workspace on wide screens. |
| rail | `ReactNode` | false, true | yes | — | L1 navigation (Rail). |
| tabBar | `ReactNode` | false, true | no | — | Phone navigation (TabBar). |
| topBar | `ReactNode` | false, true | yes | — | The top bar (TopBar). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
