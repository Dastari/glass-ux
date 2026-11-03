# PaneLayout

Panels in a JSON tree of splits and stacks, in one bounded box. Hosts own the panels and their
ids; a stack with several shows tabs. Panels move between stacks and splits by drag or the
Move to menu without remounting, and a saved layout keeps ids that no longer resolve.

`import { PaneLayout } from "glass-ux/pane-layout"`

[Live examples](https://dastari.github.io/glass-ux/components/pane-layout)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| chrome | `"panel" \| "flush" \| undefined` | "panel", "flush" | no | "panel" | `panel` (default): each stack is a Panel with `--gap-panels` between. `flush`: one surface. A layout drawn in `overlay` placement draws each stack as its own Panel whatever this says, since a floating stack needs its own material. |
| collapseBelow | ``${number}rem` \| undefined` | See type | no | "40rem" | Below this width the layout collapses to one panel and a strip. Default "40rem", as SplitPane. |
| defaultLayout | `PaneLayoutState \| undefined` | See type | no | — | The layout an uncontrolled PaneLayout starts with when none is remembered. |
| layout | `PaneLayoutState \| undefined` | See type | no | — | The layout, controlled. Pair with `onLayoutChange`. |
| locked | `boolean \| undefined` | false, true | no | false | Resize only: no moving, closing or tabs drag. For mail and dashboards. |
| moving | `boolean \| undefined` | false, true | no | false | A gesture is moving the content under floating stacks (a pan, a zoom, a scrub): while true they take the material's `data-moving` treatment, an opaque fill instead of a blur of something that changes every frame. Set it for the gesture only. Ignored while docked. Panels can say the same with `usePaneLayout().setMoving`. |
| name | `string \| undefined` | See type | no | "layout" | Tells several layouts in one window kind apart in storage. Default "layout". |
| onLayoutChange | `((layout: PaneLayoutState, change: PaneLayoutChange) => void) \| undefined` | See type | no | — | Called once per finished change, never during a drag. A phone's collapsed view reports only closes. |
| onUnknownPanels | `((ids: readonly string[]) => void) \| undefined` | See type | no | — | Called with ids `panel` could not resolve, and again when that list changes. |
| panel | `(id: string) => PaneDefinition \| null` | See type | yes | — | Resolves an id. `null` means the id is unknown: it stays in the JSON, dormant and invisible, until it resolves again. Pass a stable function. |
| storageKey | `string \| null \| undefined` | See type | no | — | Where an uncontrolled layout is remembered (localStorage). Inside a window body it defaults to one key per window kind (`glass-ux.panes:window:<kind>:<name>`); elsewhere nothing is remembered unless you pass one. null turns it off. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
