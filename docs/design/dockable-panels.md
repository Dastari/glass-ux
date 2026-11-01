# Dockable panels: design (item 26)

Status: proposal for owner approval. Nothing here is built.

## Decision

Add one component, `PaneLayout`, in a new entry `glass-ux/pane-layout`. It sits beside SplitPane
and `glass-ux/windows`: it replaces neither and wraps neither. It is built on DragDrop and on the
Tabs drag work from item 23. (`Dock` is already the window dock in `glass-ux/windows`, so the name
is not available.)

A layout is a JSON tree of splits and stacks. Panels are host-owned string ids in it. The tree
decides where content appears, but it never owns the content's React position, and that is what
lets a pane move without remounting.

| Existing | Relationship |
| --- | --- |
| `SplitPane` | Stays as it is, for exactly two panes. Nested SplitPanes cannot do this job: a pane's React parent is its position, so a move remounts it, and each split keeps its own storage. An internal separator (length parsing, clamping, key handling) is extracted and shared, with no behaviour change. |
| `glass-ux/windows` | The outer level. Windows hold views in a workspace, with z-order, tiling, cross-tab sync, close guards and pop-out. A PaneLayout fills one bounded box, which can be a window body, and it remembers per window kind through the same storage scope as SplitPane. The entry does not import the window manager. |
| Tabs | Consumer. Stacks render `TabStrip`. Contract below. |
| DragDrop | Foundation. Handles previews, shields, announcements and keyboard lift. No manager changes are expected. |
| AppShell, Sidebar, Inspector | Unchanged, outside it. A PaneLayout goes in the content area. |

## API

```ts
/** A number is a share of the free space (`fr`); a rem length is a fixed track that follows UI scale. */
export type PaneSize = number | `${number}rem`

export interface PaneSplit {
  type: "split"
  id: string
  /** `horizontal`: side by side. `vertical`: one above the other. As SplitPane. */
  orientation: "horizontal" | "vertical"
  children: readonly PaneNode[]
  /** One per child. Stored in reading order, so RTL mirrors without changing the JSON. */
  sizes: readonly PaneSize[]
}

export interface PaneStack {
  type: "stack"
  id: string
  /** Host-owned ids, in tab order. A stack of one panel draws no tab strip by default. */
  panels: readonly string[]
  active: string | null
  /** Hidden behind a rail button, as SplitPane's collapsed pane. */
  collapsed?: boolean
  /** `auto` (default): a strip from two panels. `always` and `never` fix it. */
  tabs?: "auto" | "always" | "never"
}

export type PaneNode = PaneSplit | PaneStack

export interface PaneLayoutState {
  version: 1
  root: PaneNode
  /** A stack filling the layout. */
  maximised?: string | null
}

export interface PaneDefinition {
  /** Tab text, region name, and "Resize Layers", "Move Layers". Application text. */
  title: string
  icon?: ReactNode
  /** Mounted once, on first show, with `{ id }`. Keep it stable: a new identity remounts (R22.4). */
  component: ComponentType<{ id: string }>
  /** Default "12rem", as SplitPane. */
  minSize?: `${number}rem`
  /** `pause` (default): hidden tabs keep state and stop effects (Activity). `run`: effects continue. */
  whenHidden?: "pause" | "run"
  /** The panel that fills the box when the layout collapses (R21.3). */
  primary?: boolean
  movable?: boolean
  /** Runs before close, like a window's CloseGuard (R13.7). Without it the panel simply closes. */
  canClose?: () => boolean | Promise<boolean>
  unsaved?: boolean
  preview?: boolean
}

export interface PaneLayoutChange {
  reason: "resize" | "move" | "open" | "close" | "activate" | "collapse" | "maximise"
}

export interface PaneLayoutProps extends Omit<ComponentProps<"div">, "children" | "defaultValue"> {
  /** Resolves an id. `null` means the id is unknown: see Saved layouts. Pass a stable function. */
  panel: (id: string) => PaneDefinition | null
  layout?: PaneLayoutState
  defaultLayout?: PaneLayoutState
  /** Called once per finished change, never during a drag. */
  onLayoutChange?: (layout: PaneLayoutState, change: PaneLayoutChange) => void
  /** Resize only: no moving, closing or tabs drag. For mail and dashboards. */
  locked?: boolean
  /** Below this length the layout collapses (Phones). Default "40rem", as SplitPane. */
  collapseBelow?: `${number}rem`
  /** Called with ids `panel` could not resolve. */
  onUnknownPanels?: (ids: readonly string[]) => void
  /** As SplitPane: defaults to the window kind's scope, else nothing is remembered. */
  storageKey?: string | null
  name?: string
  /** `panel` (default): each stack is a Panel with `--gap-panels` between. `flush`: one surface. */
  chrome?: "panel" | "flush"
}

/** Pure functions, free of React and DOM, so migrations and tests run anywhere. */
export function row(...children: readonly PaneNode[]): PaneSplit
export function column(...children: readonly PaneNode[]): PaneSplit
export function stack(...panels: readonly string[]): PaneStack
export function sized(node: PaneNode, size: PaneSize): PaneNode
export function layoutOf(root: PaneNode): PaneLayoutState
export function movePanel(layout: PaneLayoutState, id: string, to: PaneTarget): PaneLayoutState
export function closePanel(layout: PaneLayoutState, id: string): PaneLayoutState
export function parsePaneLayout(value: unknown): PaneLayoutState | null
export function pruneLayout(layout: PaneLayoutState, known: (id: string) => boolean): PaneLayoutState

export type PaneTarget =
  | { stack: string; index?: number }
  | { stack: string; edge: "start" | "end" | "top" | "bottom" }

/** Inside a panel: the same operations on the live layout. Outside it, use the pure functions on a controlled layout. */
export function usePaneLayout(): {
  layout: PaneLayoutState
  open(id: string, to?: PaneTarget): void
  close(id: string): Promise<boolean>
  move(id: string, to: PaneTarget): void
  reveal(id: string): void
  setLayout(layout: PaneLayoutState): void
}
```

Controlled and uncontrolled follow R22.3. Tracks map directly to CSS grid
(`18rem minmax(0, 1fr) …`), so the first frame is correct before anything is measured, as in
SplitPane. An empty stack closes and the tree normalises.

## Saved layouts and unknown ids

The JSON holds only structure and ids, never React nodes, callbacks or credentials (R14.2). A named
workspace is one of these objects held by the host; `setLayout` switches between them, and a panel
present in both keeps its mount.

- `parsePaneLayout` validates like `parseWindows`: malformed nodes drop, sizes renormalise, and a
  newer `version` returns null so the host falls back to its default.
- An id `panel()` cannot resolve stays in the JSON but is **dormant**: no tab, no track. A stack of
  only dormant panels takes no space and its siblings absorb the room. When the id resolves again
  (a feature returns, an older build runs) it reappears in place. `onUnknownPanels` reports it, and
  `pruneLayout` removes it for a host that prefers that.

## Moving without remounting

`createPortal` into a stable element keeps React's position fixed while the DOM element moves.

1. The root renders one flat list, `ids.map(id => <PaneHost key={id} />)`. Each is
   `createPortal(<Activity><Suspense><Component id={id} /></Suspense></Activity>, hostFor(id), id)`,
   where `hostFor` creates one `div` per id and keeps it until the panel closes. This list never
   reorders with the layout.
2. The layout tree renders separately. Each stack draws a slot element. A layout effect puts each
   panel's host in its stack's slot: `slot.moveBefore(host, null)` when the browser has it and both
   are connected, otherwise `insertBefore` plus a restore step.
3. Hidden tabs stay in their slot, hidden in place. Hosts are not parked elsewhere.

Tested on 1 November 2026 in Chromium 156, with React 19 under jsdom for the mount counts:

| Operation | Scroll | Focus | iframe | WebGL context |
| --- | --- | --- | --- | --- |
| `appendChild` | Lost | Lost | Reloaded | Kept |
| `moveBefore` | Kept | Kept | Kept | Kept |
| Hide in place with `display: none`, or `visibility: hidden` | Kept | Lost | Kept | Kept |
| `moveBefore` into a `display: none` parent and back | Lost | Lost | Kept | Kept |

Moving the host three times with parent re-renders gave one mount, one render and no effect
cleanup. Selection in an input survived every case.

The restore step runs on any move without `moveBefore` and on any move out of a hidden parent. It
records `scrollTop` and `scrollLeft` of scrolled descendants and the active element, then restores
them in the same task. It runs once per move, not per frame.

**Not tested:** Firefox and WebKit. Neither would launch here, and I could not confirm their
`moveBefore` status. Feature detection means the design holds either way, but the iframe row
depends on the answer. Verify both before building.

What breaks it:

- **iframes** reload on a browser without `moveBefore`. Nothing else in the table does.
- **Another document.** A browser pop-out always remounts; `moveBefore` refuses it, and a detached
  host or target throws `HierarchyRequestError`. Content that pops out must keep its own state.
- **An unstable `component`** or a changed panel id remounts, by React's rules.
- **Closing a panel** unmounts it, deliberately.

Consequences to accept:

- Content sees React context from above `PaneLayout`, not from its stack. What a stack knows comes
  through `usePaneLayout`.
- React events bubble to the root's flat list, while native events bubble through the visible
  stack. Stack handlers are native listeners on the slot.
- There is no server render of content. Slots render a Skeleton in their final tracks (R10).

A flat overlay that positions hosts over their slots would avoid moves altogether. It is rejected
because tab order and screen-reader order would stop following the visual order.

## Drags

- **Resize.** The separator takes pointer capture and writes custom properties on the split
  (`--_t0`, `--_t1`), one per affected track, exactly as SplitPane writes `--_size`. Limits are read
  at pointer down. Release commits once through `onLayoutChange`; content re-renders never (R14.5,
  R18.5). A cancelled pointer restores the old size.
- **Move.** DragDrop's preview and shield carry the drag. Each stack has one body zone. `onDragMove`
  works out the edge from the pointer and writes `data-edge` on that stack's indicator, without
  React state. The outer quarter on each side means split, the centre means add as a tab. Nothing in
  the tree changes until the drop, which commits one `movePanel` and moves one host.

## Keyboard and non-dragging paths

WCAG 2.5.7 requires a single-pointer path without dragging, so a keyboard drag alone is not enough.

| Task | Path |
| --- | --- |
| Resize | Separator keys as SplitPane: arrows, Shift for bigger steps, Home, End, Enter to collapse. Double-click resets. |
| Move, any input | Every tab and panel header has a menu and context menu (R11.6): **Move to** lists other stacks, then Split left, right, up, down. It needs no drag and no keyboard. |
| Move between strips | Lift the tab and use arrows, from item 23. Body zones refuse keyboard drags through `validate`, so the arrows stop only at strips. |
| Close, maximise | Same menu, plus Tabs' keyboard close. |
| Commands | Each move is a `defineActions` action (R1.2), so the palette and Shortcuts reach them. No default global keys. |

Focus stays with the moved content and the result is announced politely (R20.9). Each stack is a
labelled region, which item 20's F6 can walk.

## Phones

The layout adapts to its own box, not the device (R7.1, R21.1). Below `collapseBelow`:

- The `primary` panel fills the box, or the first stack's active panel if none is marked (R21.3).
- One bottom `TabStrip` lists the other panels in tree reading order, with overflow in More (R6.6).
- Tapping a panel marked `primary` replaces the content. Tapping any other opens it in a non-modal
  bottom Sheet with snap points. Its host moves into the Sheet and back, using the restore step.
- Handles and drags are gone; the Move submenu is hidden (R12.3). Close stays.
- This is a view, not an edit. The JSON keeps the desktop tree, and widening restores it. Only
  activation reaches `onLayoutChange`.

## Contract needed from Tabs (item 23)

`feat/sister-g3-extensions` has no commits yet, so none of this could be checked against code.

1. **Shared provider.** Strips join a `DragDropProvider` above them and bring their own only when
   there is none.
2. **Configurable drag type and zone id.** `dragType` and `zoneId` props. Strips with the same type
   exchange tabs. A tab's `DragItem.id` is its value, and `data` carries `{ value, stripId }`.
3. **The strip owns no list.** One callback, `onTabMove({ value, from, to, index })`, and the strip
   never mutates its items. PaneLayout turns that into one layout commit.
4. **Tabs are droppable elsewhere.** A DropZone outside a strip can accept the type, and a release
   there is an ordinary drop.
5. **External panels.** `TabStrip` renders no panels. It needs a way to set each tab's
   `aria-controls`, such as `panelId(value)`, because the tabpanel is a host-side element.
6. **Focus after a cross-strip drop** lands on the tab in the new strip, so a stable lookup by value
   or an imperative `focusTab(value)`.
7. **Overflow** accepts a drop at the end while the active tab stays visible (R6.6).
8. **Per-item state:** close, unsaved, preview and the context menu slot come through `TabItem`, so
   the layout can pass them straight on.

Points 2 and 4 are the ones this design cannot work without.

## How each uses it

An image editor, with Docked and Focus workspaces as two saved objects:

```tsx
const docked = layoutOf(row(sized(stack("tools"), "3rem"), stack("canvas"),
  sized(column(stack("layers", "adjust"), stack("histogram")), "18rem")))

<PaneLayout panel={imagePanel} layout={workspace} onLayoutChange={onWorkspaceChange} />
```

The IDE workbench passes its `layout` and `onLayoutChange` straight through. An editor group is a
stack, and panel ids carry the document (`"editor:file:///src/a.ts"`), so `panel` parses them:

```tsx
const panel = (id: string) =>
  id.startsWith("editor:") ? { title: nameOf(id), component: EditorPanel, primary: true }
    : (views[id] ?? null)

<PaneLayout panel={panel} layout={layout} onLayoutChange={saveLayout} />
```

A mail application that edits nothing, with no tabs and no drag:

```tsx
<PaneLayout locked panel={mailPanel} storageKey="mail.layout"
  defaultLayout={layoutOf(row(sized(stack("folders"), "16rem"), stack("list"), stack("message")))} />
```

## Left out

Floating panels and tear-out (decision 1), browser pop-out, automatic placement of panels new in an
upgrade, tree animation on drop beyond DragDrop's settle, per-panel header toolbars beyond what the
host renders inside, and any file, document or tool concept.

## Open decisions

1. **Floating panels.** Recommended: not in the first version, with an optional `floating` field
   added later without a version bump. If built, render frames inside PaneLayout with `WindowFrame`,
   so hosts stay put. Handing a panel to the window manager would remount it.
2. **Unknown ids.** Recommended: dormant and invisible. The alternative is an "unavailable"
   placeholder like the one windows show, which is noisier for a panel that a feature flag removed.
3. **iframes without `moveBefore`.** Recommended: accept the reload and document it. An overlay mode
   for iframe panels would be a second mechanism.
4. **Hidden tabs.** Recommended: `pause` by default. It stops observers and timers at the cost of
   effects re-running on show. `run` is opt-in per panel.
5. **Fixed tracks.** Recommended: rem and `fr` together, so a side panel keeps its width when the
   window resizes. Fractions alone are simpler but make side panels grow.
6. **Phone form.** Recommended: strip and Sheet as above. The alternative is a single-column stack
   of all panels, which pushes primary content down.
