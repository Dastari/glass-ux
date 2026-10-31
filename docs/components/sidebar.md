# Sidebar

`glass-ux/sidebar` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A docked pane of navigation (or of details) beside the content, for any application layout
that does not use `AppShell`. It collapses off canvas or to a strip of icons, resizes, remembers
its state without a flash on load, toggles with ⌘B / Ctrl+B, and becomes a sheet on phones.

```tsx
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "glass-ux/sidebar"

<SidebarProvider storageKey="app.sidebar">
  <Sidebar collapsible="icon" resizable aria-label="Workspace navigation">
    <Sidebar.Header icon={<Logo />} title="Northstar Studio" subtitle="Pro plan" />
    <Sidebar.Search value={query} onValueChange={setQuery} />
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton icon={<IconInbox />} render={<Link to="/inbox" />} active>Inbox</Sidebar.MenuButton>
            <Sidebar.MenuBadge value={12} />
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton icon={<IconFolder />}>Projects</Sidebar.MenuButton>
            <Sidebar.MenuSub id="projects">
              <Sidebar.MenuSubItem>
                <Sidebar.MenuSubButton render={<Link to="/projects/atlas" />}>Atlas</Sidebar.MenuSubButton>
              </Sidebar.MenuSubItem>
            </Sidebar.MenuSub>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer>{/* account menu */}</Sidebar.Footer>
    <Sidebar.Rail />
  </Sidebar>
  <SidebarInset>
    <header><SidebarTrigger /></header>
    <Outlet />
  </SidebarInset>
</SidebarProvider>
```

The provider is a flex row that fills its container: give the container a definite height
(`100dvh` for a whole application). The document never scrolls (R5.1); `Sidebar.Content` and
your content scroll inside themselves.

## Options

- **`collapsible`:** `offcanvas` (default) slides the pane away; `icon` narrows it to a strip
  where every item keeps its name, shows its label as a tooltip, carries its count on the
  icon's corner and opens its sub-menu as a flyout (hover, press, Enter, Space or ↓); `none`
  keeps it open with no toggle, shortcut or phone sheet. The flyout's menu code loads just
  after an icon-mode sidebar with sub-menus mounts.
- **`variant`:** `sidebar` (default) a flush chrome pane; `floating` a glass panel inset from
  the edges; `inset` puts the sidebar on the canvas and raises `SidebarInset` as the panel.
  Put content cards, not more panels, inside a raised inset (R4.2).
- **`side`:** `start` (default) or `end`, following the reading direction. Put an end sidebar
  after `SidebarInset` in the markup.
- **Width:** `width` (default the theme's `--sidebar-w`, 16.5rem); with `resizable`,
  `minWidth`/`maxWidth` (14rem and 28rem by default) bound the Rail's drag and its keys.
- **Landmark:** `as="nav"` (default), `as="aside"` for a details pane at the top level, or
  `as="div"`. `aria-label` is required: it names the landmark and the phone sheet.

## State

`SidebarProvider` takes `open`/`defaultOpen`/`onOpenChange(open, details)` for the desktop
state and `openMobile`/`onOpenMobileChange` for the phone sheet; `details.reason` says what
asked (`trigger`, `shortcut`, `rail`, `resize`, `navigation`, `dismiss`, `search` or `api`).
`useSidebar()` returns `state`, `open`, `setOpen`, `toggle`, `openMobile`, `setOpenMobile`,
`isMobile`, `side` and `collapsible`.

**Persistence.** With `storageKey` the open state, the dragged width and the open state of every
`Sidebar.Group` and `Sidebar.MenuSub` that has an `id` are saved in localStorage (inside a
window body the storage scope is appended). Layout comes from attributes on `.fa-sidebar`,
which React sets before the first paint of a client render. With server rendering, each
Sidebar emits a small blocking script as its first child that applies the remembered state
before the page paints; `sidebarBootScript(key)` returns it, to hash for a
Content-Security-Policy, or pass `nonce` to the provider. A controlled `open` is left to you;
the width still applies.

**Phones.** Below `mobileQuery` (default `PHONE_QUERY`, `(width < 48rem)`) the docked pane gives
way to a modal `Sheet` from the sidebar's edge with the same parts. Swipe, Esc or the scrim
closes it, and choosing a destination (a `MenuButton` or `MenuSubButton` press) closes it too
unless its click handler calls `event.preventDefault()`. The sheet's code loads when the
viewport first matches `mobileQuery`, so a desktop-only application never downloads it.

## Rows

- **`detail`:** a second line of data under the label (an owner, a path, the last message),
  read with it. The row grows to two lines.
- **`count`:** a quiet tabular count at the trailing edge, inside the button and read as part
  of its name (conversations in a folder). For a count that asks for attention use
  `Sidebar.MenuBadge`, which sits outside the button and describes it.
- **`face`:** an entity's identity (an avatar and name, an organisation or device identity)
  drawn instead of `icon`, the label and `detail`, so the sidebar shows the entity as a table
  does. The face names the button; `children` stays its plain name for the icon-mode tooltip.
- **`Sidebar.GroupLabel count`:** how many items the group holds, after the label.
- **`Sidebar.Match`:** `<Sidebar.Match text={label} query={query} />` as a button's label marks
  the filter's matches (ignoring case and accents), as a Tree and a Combobox do.
- **`Sidebar.Content fill`:** the content stops scrolling and its last child takes the
  remaining height and scrolls itself (a virtualised Tree or list), so the sidebar never shows
  two scrollbars.

## Keyboard and focus

- The shortcut (`shortcut`, default `"mod+b"` for a start sidebar and none for an end one;
  `false` switches it off) toggles the sidebar, or the sheet on phones. It is ignored in rich
  text and custom text boxes, where Ctrl+B means bold. Triggers show it in their tooltip and
  `aria-keyshortcuts`.
- Items keep native link and button semantics, so Tab walks them. With a `Sidebar.Search`,
  / or ⌘F / Ctrl F (while focus is in the sidebar) focuses the filter, ↓ moves into the
  items, ↑ and ↓ walk them and continue into a Tree in the content (whose own keys then
  apply; ↑ from its first row comes back), and ↑ from the first item returns to the filter.
  Esc clears the filter, then returns focus. In icon mode the filter is a button that expands
  the sidebar and focuses the field.
- A `MenuButton` beside a `MenuSub` (a direct child of the same `MenuItem`) discloses it (`aria-expanded`); a link keeps navigating and
  gets a chevron button of its own.
- `Sidebar.Rail` toggles on a press. On a resizable sidebar it is a separator: drag it, or
  use ← → (Shift for 4rem steps), Home and End; Enter or Space toggles. Dragging below 60% of
  the minimum collapses the sidebar and dragging out from the edge expands it.
- Collapsing never strands focus: from a part that hides it moves to the item's own button,
  the icon-mode filter button, the header's expand button, a `SidebarTrigger`, the Rail or the
  content, in that order.

## Two sidebars

A start navigation sidebar and an end details sidebar are two providers, the second inside
the first's `SidebarInset` (render that one as a `div`: there is one `<main>`). Name a provider
to reach it from inside the other: `<SidebarTrigger sidebar="navigation" />` or
`useSidebar("navigation")`.

```tsx
<SidebarProvider name="navigation">
  <Sidebar collapsible="icon" aria-label="Tickets">…</Sidebar>
  <SidebarInset>
    <SidebarProvider name="details">
      <SidebarInset render={<div />}>
        <SidebarTrigger sidebar="navigation" /> … <SidebarTrigger aria-label="Toggle details" />
      </SidebarInset>
      <Sidebar side="end" variant="floating" as="aside" aria-label="Ticket details">…</Sidebar>
    </SidebarProvider>
  </SidebarInset>
</SidebarProvider>
```

## Loading

`Sidebar.MenuSkeleton` (`icon`, `width`, `size`) is a row with the same box, icon and label as
a `MenuButton` of that size, so the loaded items replace it in place (R9.3).

`AppShell`'s `SectionDrawer` is built from these parts, under its own class names and geometry.

**Parts:** `Sidebar` with `Header`, `Search`, `Content`, `Match`, `Group`, `GroupLabel`, `GroupAction`,
`GroupContent`, `Menu`, `MenuItem`, `MenuButton`, `MenuAction`, `MenuBadge`, `MenuSub`,
`MenuSubItem`, `MenuSubButton`, `MenuSkeleton`, `Separator`, `Footer` and `Rail`;
`SidebarProvider`, `SidebarInset`, `SidebarTrigger`, `useSidebar`, `sidebarBootScript`,
`sidebarStorageKey`, `normaliseSidebarPrefs`.
