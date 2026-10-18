# Migration

Upgrade steps between releases. Each section lists the changes that need code edits first,
then behaviour changes to review. The [changelog](../CHANGELOG.md) lists everything else.

## 0.7.1 → 0.7.2

No code changes are required. Meters stay neutral while healthy unless you pass
`tone="data"`.

## 0.7.0 → 0.7.1

No code changes are required.

- Remove any workaround that pinned the docked Inspector's or drawer's width; AppShell sizes
  both panes again.
- Import `resolveActions` from `glass-ux/actions` instead of
  `glass-ux/lib/actions/actions`.
- A window body that is still loading is now announced as a `status` named "Loading
  window". Tests that find it by role should query `getByRole("status", { name: "Loading
  window" })`.

## 0.6 → 0.7

### Required changes

**The GraphQL filter adapter has its own entry.** The `where`/`evaluate` translation for
GraphQL ORM servers moved out of the core library. Core DataTable filters and search no
longer refer to any server shape.

```diff
- import { toWhere, searchWhere } from "glass-ux/lib/graphql-orm/where";
- import { evaluateWhere } from "glass-ux/lib/graphql-orm/evaluate";
+ import { toWhere, searchWhere, evaluateWhere } from "glass-ux/adapters/graphql-orm";
```

Every export keeps its name: `toWhere`, `searchWhere`, `columnWhere`, `columnEntries`,
`toFilterInput`, `decimalText`, `rfc3339`, `evaluateWhere`, `WhereInput`, `WhereOptions`
and `EvaluateOptions`. In-memory matching (`filterRows`, `matchesFilter`, `searchRows`)
stays in `glass-ux/data-table`.

**`CustomFilterSpec` is a type, not an interface.** A custom filter now requires exactly one
of `toCondition` or the deprecated `toWhere`. Object literals and `satisfies` checks are
unchanged. An interface that extends it must become an intersection:

```diff
- interface TagFilter extends CustomFilterSpec<string[]> {
-   suggestions: string[];
- }
+ type TagFilter = CustomFilterSpec<string[]> & {
+   suggestions: string[];
+ };
```

**Removed deep-import helpers.** These were reachable only through the wildcard paths and were
unused by the library:

| Removed                                        | Replacement                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `readMotionScale` from `glass-ux/ui/map/theme` | `motionScale()` from `glass-ux/appearance`                                                  |
| `fitRect` from `glass-ux/windows/geometry`     | `clamp` from the same module on each of `x`, `y`, `w`, `h`                                  |
| `stackOrder` from `glass-ux/windows/geometry`  | `windows.filter((w) => !w.poppedOut && w.layout !== "tiled").toSorted((a, b) => a.z - b.z)` |

### Deprecated names

The old names still work in 0.7 and will be removed in 0.8.

| Deprecated                                     | Use                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `toWhere` on DataTable filter and search specs | `toCondition`                                                             |
| `WhereInput` from `glass-ux/data-table`        | `FilterCondition`                                                         |
| `EndpointStatus` (badge, data-table)           | `StatusKind`                                                              |
| `DesktopSession` `endpoint` prop               | `target`                                                                  |
| `POPUP_OFFSET`, `POPUP_COLLISION_PADDING`      | Popups read `--popup-offset` and `--popup-collision`; override the tokens |

The GraphQL adapter keeps its own `toWhere()` function and `WhereInput` type; those names
describe that server's `Where` input and are not deprecated.

### Behaviour to review

- **Command palette group order.** The default order is now
  `DEFAULT_PALETTE_GROUP_ORDER` (`["Recent", "*", "Actions", "Navigation"]`). It no longer
  places "Endpoints" and "Organisations" last. To keep the previous order, pass
  `groupOrder={[...DEFAULT_PALETTE_GROUP_ORDER, "Endpoints", "Organisations"]}` to
  `PaletteProvider`.
- **Tree default icons** are `IconFolder` (branches) and `IconFile` (leaves). Supply
  `icon` per node to restore device or organisation icons.
- **Popup gaps.** Every anchored popup uses `--popup-offset` (6px at the default scale), so
  popovers and preview cards sit 2px closer to their trigger; arrowed tooltips sit 12px
  away and context menus 3px. Gaps now follow UI scale and density.
- **Unavailable controls stay focusable.** Map, topology and calendar controls that cannot
  act are `aria-disabled` with a reason instead of `disabled`; at the minimum or maximum
  month the calendar's previous/next buttons remain in the tab order.
- **Button announcements.** A Button that tracks pending, success and failure renders a
  visually hidden polite live region beside itself. Pass `statusAnnouncement={false}` when
  the host already announces the outcome. Host selectors such as `:last-child` around such
  buttons may need adjusting.
- **Clearable inputs clear on Escape.** Any `Input` with `clearable` now clears on Escape,
  as `SearchField` already did.
- **`null` as a controlled value.** `Segmented` (`value`), `TagInput` (`value`),
  `MultiSelect` (`value`) and `Tree` (`expanded`) treat `null` like `undefined`
  (uncontrolled). `SwatchPicker` keeps `value={null}` as a controlled “nothing chosen”.
- **Opaque materials in Solid.** In Solid, reduced transparency and browsers without
  `backdrop-filter`, `glass-card` and `glass-float` are opaque. An overlay rendered inside a
  panel or chrome layer uses an opaque fill instead of a second blur.
- **DataTable cards** show the subtitle under the title and flow fields on wrapping lines by
  column priority. Below 36rem the toolbar stays on one row and search folds to an icon.
- **Motion.** Popups, dialogs, toasts and indicators use spring easing; under Still or the
  operating system's reduced-motion setting they remain instant, as before.
- **SwatchPicker folds instead of wrapping.** By default (`collapse="auto"`) the swatches
  stay on one line, and when they do not fit the box they are given the picker becomes one
  menu button showing the chosen swatch. It used to wrap onto more lines. Pass
  `collapse="none"` to keep every swatch and wrap, for example in a phone sheet. The picker
  also follows `SegmentedCollapseContext`, so a host that forces `"menu"` (the TopBar's module
  slot on a phone) folds a picker placed there; its own `collapse` prop wins. Tests that
  find swatches by name in a narrow box should open the menu (`Palette: Ocean`) and pick the
  `menuitemradio` instead.

### Package contents

- `dist/gallery/api.generated.json` and `demo-coverage.generated.json` are no longer
  published; no package export pointed at them.
- Declaration maps (`*.d.ts.map`) are no longer published. Go-to-definition opens the
  declaration file.
- Generated icons are tree-shakeable: importing one icon no longer bundles all of them.
