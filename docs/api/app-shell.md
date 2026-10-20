# AppShell

Compose application navigation, a top bar and a workspace, with optional section drawer, inspector and phone navigation.

`import { AppShell } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/app-shell)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| brand | `ReactNode` | See type | yes | — | Top-left corner, above the rail: the product mark (ShellBrand). |
| children | `ReactNode` | See type | yes | — | The workspace: normally <Workspace primary={<Outlet />} />. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| contentAs | `"div" \| "main" \| undefined` | "div", "main" | no | "main" | Workspace element. Use div when embedding a shell inside an existing main landmark. |
| drawer | `ReactNode` | See type | no | — | The current section's navigation (SectionDrawer). Optional per section. |
| drawerShortcut | `string \| undefined` | See type | no | "mod+b" | Toggle the drawer from the keyboard. Default mod+b. |
| inspector | `ReactNode` | See type | no | — | Context pane (Inspector), docked beside the workspace on wide screens. |
| rail | `ReactNode` | See type | yes | — | L1 navigation (Rail). |
| tabBar | `ReactNode` | See type | no | — | Phone navigation (TabBar). |
| topBar | `ReactNode` | See type | yes | — | The top bar (TopBar). |
