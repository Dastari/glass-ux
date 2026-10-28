# Theme and layout contract

Use the component's geometry props and content slots. `Surface` supplies the selected
material, radius and padding; `Panel.Header`, `Panel.Body` and `Panel.Footer` supply their
own insets. Drawer search and body slots also own their spacing. Adding a glass material
class to an arbitrary element supplies appearance only, without those layout defaults.

Apply the [screen content rules](ui-rules.md#screen-content-rules) when composing any screen.
Keep primary content near the top: no stacked decorative headings, repeated route titles,
non-informational slogans or paragraphs explaining obvious controls. This is the default
for consuming applications unless explicit user or project instructions say otherwise.
Reserve geometry for asynchronous content so loading, validation, live updates, hover and
focus do not move buttons or menus after the user has targeted them.

| Purpose                        | Use                                                    | Theme role                          |
| ------------------------------ | ------------------------------------------------------ | ----------------------------------- |
| Navigation pane                | `Surface material="chrome" padding="panel"`            | `--inset-panel`, `--radius-surface` |
| Content pane                   | `Panel` with `PanelHeader` and `PanelBody`             | `--inset-panel`, `--radius-surface` |
| Many catalogue or board cards  | `Surface material="card" radius="tile" padding="tile"` | `--inset-tile`, `--radius-tile`     |
| Group heading and page framing | Plain semantic elements on the canvas                  | `--gap-panels`, `--gap-section`     |
| Documentation article          | Centered, padded scrolling document                    | `--inset-panel`, `--measure`        |

`padding="none"` is Surface's default so compound content slots do not get double padding.
Choose padding explicitly when placing content directly in a Surface. A search control owns
its internal icon/text spacing; its surrounding pane owns the distance from the pane edge.

Focus rings and the text-entry halo paint up to `--focus-reach` outside a control, so a
container that clips cuts off a control flush with its edge (R11.10). Library panes,
dialog bodies and disclosures leave that room. An application's own scrolling or
`overflow: hidden` wrapper needs it too. Add `fa-focus-room`, which moves the clip edge out
and takes the space back with a negative margin so nothing shifts, or add the reach to the
wrapper's own padding.

```css
.job-list {
  overflow-y: auto;
  padding: calc(var(--space-3) + var(--focus-reach)); /* its own padding, plus the room */
}
```

Do not put a group of panels inside another panel solely to draw a frame. A group heading,
toolbar and its panels belong on the canvas. Repeated cards use the `card` material to avoid
one backdrop-blur pass per item. Code blocks and surfaces being demonstrated retain their
own actual containers.

```tsx
import { useState } from "react";
import { SearchField } from "glass-ux/input";
import { Surface } from "glass-ux/surface";

export function ComponentDirectory() {
  const [query, setQuery] = useState("");
  return (
    <Surface as="nav" aria-label="Components" material="chrome" padding="panel">
      <SearchField aria-label="Find a component" value={query} onValueChange={setQuery} />
    </Surface>
  );
}
```

## CSS names and verification

`configureAppearance({ defaults: { style: "flat" } })` selects opaque, undecorated
surfaces with smaller corner roles and still motion. Palettes, light/dark modes, density,
UI scale, radius scale and line weight continue to apply. Flat displays a plain canvas;
the stored material, background and motion choices return with `style: "glass"`.
Layout slots and insets are the same in both visual styles. Focus outlines, semantic
status colours, selection and loading indicators remain visible.

The canvas background is a persisted appearance preference, set with
`configureAppearance({ defaults: { background: "grid" } })` or
`useAppearance().update({ background: "grid" })`. `BACKGROUNDS` and `BACKGROUND_LABELS`
are exported from `glass-ux/appearance` for application controls. The boot script applies
the choice before first paint, alongside palette and mode.

| Kind | Backgrounds |
| --- | --- |
| Colour fields | `silk` (fields and flowing hairlines, the default), `mesh`, `currents`, `waves`, `contours`, `facets`, `grid` |
| Digital | `pixels`, `circuit`, `network` |
| Scenes | `skyline`, `harbour`, `forest`, `hills`, `garden` |
| Plain and pictures | `plain`, `image` (shows `backgroundImage` under a veil of the canvas colour) |

Put `class="canvas-ambient"` (or `canvas-background`) on the application canvas. Keep one
`<div class="canvas-silk" aria-hidden="true"></div>` behind the shell: it is the artwork
layer for every background that has artwork (the name predates the others), and it hides
itself for the rest and for Solid material. Artwork is an alpha mask painted in the
palette's own roles, so it follows palette and mode, and none of it loads remote images.
A bounded preview, such as a background swatch, can set `data-background="contours"` and
`background-attachment: scroll` locally and hold its own artwork layer with
`<span class="canvas-silk" data-background="contours" data-contained></span>`.

Applications can register their own background with `defineBackground(id, label)` and
style `:where(:root[data-background="<id>"]) :is(.canvas-ambient, .canvas-background)` by
setting `--canvas-image` and `--canvas-image-size`.

Glass UX includes Ocean, Aurora, Emerald, Sunset, Graphite, Ruby, Lagoon, Indigo, Rose,
Moss, Sand and Slate palettes. Select a palette through `configureAppearance` or the
appearance provider, and use semantic roles such as `--accent-text` in components.
Application palettes can be registered with `definePalette`; their CSS and branding belong
to the host.

A person's own colours layer over the palette: `accentColor`, `accentColor2` and
`canvasTint` take `#rrggbb` values. The accent's lightness is adjusted until text on it
and accent text meet AA, so any colour is safe to offer; `customColourVars` returns the
parameters for previews. A picture background is `background: "image"` with
`backgroundImage` set to a URL or a data URL; pass uploads through
`prepareBackgroundImage(file)`, which downsizes them to fit in stored preferences.

Tailwind's `p-panel` utility reads `--inset-panel`. It is not a CSS variable named `--p-panel`.
Use `--inset-tile`, `--inset-panel`, `--inset-dialog`, semantic gap roles and radius roles in
host CSS. Keep geometry responsive to density, UI scale, radius scale and line weight.
Radius roles name what the corner belongs to: `--radius-control`, `--radius-tile`,
`--radius-surface`, `--radius-overlay`, `--radius-dialog`, `--radius-item`, `--radius-check`
and `--radius-tooltip`, plus the small roles `--radius-compact` (xs controls),
`--radius-chip` (code, keycaps and links inside text), `--radius-line` (highlighted rows in
code, logs and tables), `--radius-mark` (data cells and small marks), `--radius-skeleton`,
`--radius-media`, `--radius-tail`, `--radius-icon`, `--radius-tile-icon`, `--radius-thumb` and
`--radius-elbow`. The steps `--radius-xs` … `--radius-2xl` belong to `tokens.css`;
`pnpm tokens:check` rejects them elsewhere. `Surface padding="overlay"` with
`radius="overlay"` holds `.fa-item` rows with nested corners.

```sh
pnpm exec glass-ux check-layout src
```

The check finds CSS variable references with neither a definition nor an explicit fallback.
It reads the installed library styles and supplied host CSS/inline style declarations. Pass
all host style directories, including any separate token stylesheet. Dynamically constructed
host variables need a documented CSS default or fallback. This check detects misspelled
tokens; it does not prove visual composition.

Verify the first screen in light/dark/Solid, comfortable/compact density, non-default radius
and line weight, and a narrow viewport. Check actual pane insets, card corners, focus rings,
scroll edges and clipping. A page rendering without errors or passing axe is insufficient
evidence for those layout properties. The library's catalogue regression checks compare
computed geometry with the theme and require group sections to stay on the canvas.
Check the computed root accent and rendered syntax-token colours when changing palettes:
a selected swatch or a changed `data-palette` alone does not prove that the CSS applied.
Before publishing, run `pnpm test:production` against the built documentation site. It
verifies all presets in both modes, appearance persistence and lazy highlighting under
the `/glass-ux/` deployment path. Set `GLASS_UX_TEST_URL` to the published docs URL to
repeat those checks against the deployed artifact.

Documentation section navigation stays outside the article, left aligned and inset from
the parent's corners. Desktop uses `--space-16` (64px at the default UI scale) between rail
and article; phones use chips. Size previews stack in ascending width-times-height order;
the free resize frame follows the preset examples.

Documentation uses one 64rem maximum article width. Explanatory prose, code and guide
tables fill that column; assistant specimens retain their own reading measures. Foundation
pages use `FoundationDocumentation` so their display heading and summary belong inside
the same article as the examples. `ComponentDocumentation` keeps its section rail outside
the article, pinned in the content viewport while the article flows normally.

Mark the surrounding scroll viewport with `data-scroll-container`. The gallery's content
viewport reaches the screen's right and bottom edges; only the sidebar retains its outer
gutter. Do not add an independently scrolling, fixed-height article inside that viewport.

API property names remain on one line so identifiers can be read and copied intact.
On narrow screens, the API table scrolls inside its own keyboard-accessible region;
it must not widen the page. Types and descriptions may wrap within their columns.

The documentation directory search covers guides, Foundations, components and utility
links. It matches titles, identifiers and available summaries or group names without
case sensitivity, and ignores surrounding spaces. Hide groups with no matches, explain
an empty result, and restore the directory when the search is cleared or a page is opened.
