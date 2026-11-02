# Pane layout

`glass-ux/pane-layout` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Panels in a JSON tree of splits and stacks, in one bounded box. A panel moves between stacks and
splits without remounting. It works with no tabs at all, for mail and dashboards. Give it a parent
with a definite height (R7.3).

```tsx
import { layoutOf, PaneLayout, row, sized, stack, type PaneDefinition } from "glass-ux/pane-layout"

const panels: Record<string, PaneDefinition> = {
  files: { title: "Files", component: FilesPanel },
  editor: { title: "Editor", component: EditorPanel, primary: true },
  terminal: { title: "Terminal", component: TerminalPanel, whenHidden: "run" },
  output: { title: "Output", component: OutputPanel },
}
const panel = (id: string) => panels[id] ?? null // stable: declared outside the component

const start = layoutOf(row(sized(stack("files"), "16rem"), stack("editor"), stack("terminal", "output")))

<PaneLayout panel={panel} defaultLayout={start} storageKey="app.layout" />
```

`SplitPane` stays the choice for exactly two panes. `glass-ux/windows` is the outer level: a
PaneLayout fills one box, which can be a window body. This entry does not import the window
manager.

## Hidden panels: `whenHidden`

A panel is hidden when another tab is active in its stack, its stack is collapsed or behind a
maximised stack, or a phone is showing something else.

| `whenHidden` | Hidden panel | Use for |
| --- | --- | --- |
| `"pause"` (default) | State and DOM stay. Effects are cleaned up, and run again on show. | Anything that can stop while unseen: observers, timers, polling (R17.2) |
| `"run"` | Effects keep running: no cleanup, no second setup and no remount. | Anything that must stay connected: a remote session, a terminal, a live stream |

**A remote session in a background panel needs `whenHidden: "run"`.** Under the default, its
effect cleanup runs when the tab is hidden, which disconnects it, and it reconnects on show. A
`run` panel is still hidden with `display: none`, so size observers report zero while it is hidden.

Either way a panel mounts on first show. A `run` panel in a background tab of a restored layout
does not start until someone opens it; call `reveal` if it must.

## Layouts

A layout is plain JSON: structure and ids, never React nodes, callbacks or credentials. Stacks hold
host-owned ids and the tree says where they appear. Sizes are in reading order, so RTL mirrors with
no change to the JSON.

| Build | Result |
| --- | --- |
| `stack("a", "b")` | Panels in one place, the first active. One panel draws no strip unless `tabs: "always"`, which an editor needs to keep a file's name and unsaved mark in view. |
| `row(...)`, `column(...)` | Children side by side, or one above the other. |
| `sized(node, 2)` | A share of the free space (`fr`). The default is 1. |
| `sized(node, "16rem")` | A fixed track that follows UI scale and keeps its width as the box resizes. |
| `layoutOf(root)` | The object to pass or store. |

Tracks are CSS grid tracks, so the first frame is right before anything is measured. A track never
goes below its panels' `minSize` by drag, and a box too small for every minimum squeezes tracks to
equal shares rather than clipping them.

`layout` and `onLayoutChange` control it; `defaultLayout` starts it uncontrolled. `onLayoutChange`
fires once per finished change with a `reason`, never during a drag. `storageKey` remembers an
uncontrolled layout; inside a window body it defaults to one key per window kind, and
`paneLayoutStorageKey(kind)` names it for clearing.

The pure functions work on any layout, with no React or DOM: `openPanel`, `movePanel`, `closePanel`,
`panelsOf`, `stacksOf`, `stackOf`, `parsePaneLayout` and `pruneLayout`. A host that holds `layout`
outside the panels, opening a file from a Sidebar for instance, uses these. Inside a panel, `usePaneLayout()` gives `open`, `close`, `move`,
`reveal`, `setLayout` and the live `layout`. `setLayout` switches saved workspaces, and a panel in
both keeps its mount.

### Saved layouts and upgrades

- `parsePaneLayout` drops malformed nodes, renormalises sizes, and returns null for a newer
  `version`, so the host falls back to its default.
- An id `panel()` returns null for stays in the JSON but is **dormant**: no tab and no track. A stack
  of only dormant panels takes no space. When the id resolves again it reappears in place.
  `onUnknownPanels` reports these ids, and `pruneLayout` removes them for a host that prefers that.
- Fields this release does not know pass through, so a later optional field survives a save.

## Moving panels

| Task | Path |
| --- | --- |
| Move, any input | Each tab's context menu and each bar's Actions menu: **Move to** lists the other stacks, then Split left, right, up and down. It needs no drag and no keyboard (WCAG 2.5.7). |
| Move by drag | Drag a tab or a panel's title. The outer quarter of a stack splits it, the centre adds a tab, and a strip takes it at that position. |
| Reorder tabs | Drag, Shift and the arrow keys, or the context menu. |
| Close | Delete on a tab, its close mark, or the same menus. `canClose` can refuse (R13.7). |
| Commands | `usePanelActions()` inside a panel gives the same list as an action set, for `usePaletteActions`. No keys are bound by default. |

The moved panel's tab takes focus, or its panel when the new stack has no strip, and the move is
announced politely. `movable: false` refuses moves, and `closable: false` offers no close.
`locked` allows only resizing: no menus, no closing and no drag.

## Resizing

Separators take the keys SplitPane's does: arrows, Shift for bigger steps, Home and End for the
limits, and Enter to hide a stack behind a rail button. Enter hides the neighbour that does not
hold the `primary` panel. Double-click returns a track to the starting layout's size. A drag writes
a custom property and commits once on release (R14.5, R18.5); a cancelled pointer restores the size.

## Phones

Below `collapseBelow` (default `40rem`, measured on the box, not the device) the `primary` panel
fills the box, or the first stack's active panel if none is marked. A strip reaches every panel,
with overflow in More. Choosing a `primary` panel replaces the content; any other opens in a
non-modal bottom sheet with snap points. Drags, separators and Move to are gone, and Close stays.

The collapsed view is a view. Choosing a panel writes nothing, and widening restores the tree. Only
closing a panel reaches `onLayoutChange`.

## Content

The content is in a host element that fills its stack and scrolls when its content is taller. Use
`Panel.Body` inside a panel for the standard inset, and `Panel.Header` for a header of your own.

- A panel sees React context from above PaneLayout, not from its stack. Use `usePaneLayout` for what
  a stack knows.
- React events bubble to PaneLayout's flat list of panels, and native events through the visible stack.
- Nothing inside a panel renders on a server. Stacks render a Skeleton in their final tracks.
- Pass a stable `component` and `panel`: a new `component` identity remounts (R22.4).

### What survives a move

A move keeps state, DOM, effects, input values, scroll and focus, with one mount. `moveBefore` keeps
these natively. Without it, the layout restores scroll and focus in the same task.

| Browser tested | `moveBefore` | iframe in a moved panel |
| --- | --- | --- |
| Chromium 156 | Yes | Keeps running |
| Firefox 157 | Yes | Keeps running |
| WebKit 27.2 (Playwright's WPE build) | No | **Reloads** |

An iframe reloads on a browser without `moveBefore`, by decision: an overlay for iframe panels would
be a second mechanism. Closing a panel unmounts it, and so does a browser pop-out, because another
document always means a remount.

Library examples and the API are in the [catalogue](https://dastari.github.io/glass-ux/components/pane-layout/).
