# Sidebar

A docked pane of navigation or details, built from parts. Put it in a SidebarProvider beside
a SidebarInset:

```tsx
<SidebarProvider storageKey="app.sidebar">
  <Sidebar collapsible="icon" aria-label="Workspace">
    <Sidebar.Header icon={<Mark />} title="Northwind" />
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton icon={<IconHome />} href="/" active>Home</Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Rail />
  </Sidebar>
  <SidebarInset>…</SidebarInset>
</SidebarProvider>
```

Parts: `Header`, `Search`, `Content`, `Match`, `Group`, `GroupLabel`, `GroupAction`, `GroupContent`,
`Menu`, `MenuItem`, `MenuButton`, `MenuAction`, `MenuBadge`, `MenuSub`, `MenuSubItem`,
`MenuSubButton`, `MenuSkeleton`, `Separator`, `Footer` and `Rail`.

`import { Sidebar } from "glass-ux/sidebar"`

[Live examples](https://dastari.github.io/glass-ux/components/sidebar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the landmark and the phone sheet: "Workspace navigation", "Ticket details". Required. |
| as | `"div" \| "aside" \| "nav" \| undefined` | "div", "aside", "nav" | no | "nav" | The landmark: `nav` for navigation, `aside` for complementary details (an end sidebar with the selection's properties), or `div` for none. |
| children | `ReactNode` | See type | no | — | The parts: Header, Search, Content, Footer and Rail. |
| collapsible | `SidebarCollapsible \| undefined` | "none", "icon", "offcanvas" | no | "offcanvas" | `offcanvas`: collapsing slides it fully away. `icon`: it narrows to a strip of icons whose labels become tooltips and whose sub-menus become flyouts. `none`: always expanded, with no toggle, shortcut or phone sheet. |
| maxWidth | ``${number}rem` \| undefined` | See type | no | — | The widest a resize can make it. |
| minWidth | ``${number}rem` \| undefined` | See type | no | — | The narrowest a resize can make it. |
| resizable | `boolean \| undefined` | false, true | no | false | Let the person drag the Rail (or use its arrow keys) to set the width, within `minWidth` and `maxWidth`. The width is remembered with the provider's storageKey. |
| side | `SidebarSide \| undefined` | "start", "end" | no | "start" | The edge it docks to, following the reading direction: `start` (left in LTR) or `end`. |
| variant | `SidebarVariant \| undefined` | "sidebar", "floating", "inset" | no | "sidebar" | `sidebar`: a flush chrome pane along the edge. `floating`: a glass panel inset from the edges with its own corners. `inset`: the sidebar sits on the canvas and SidebarInset is drawn as the raised panel beside it. |
| width | ``${number}rem` \| undefined` | See type | no | — | The expanded width before the person resizes it. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
