# Glass UX icon specification

Glass UX draws its own icons. They are SVGs in `src/icons/svg/` (kebab-case file names)
compiled by `pnpm icons` into tree-shaken React components (`IconEndpoint`, …).
`pnpm icons:check` enforces the mechanical rules (marked ⚙). Review enforces the rest.
The gallery's Icons section (`/foundations/icons`) is where every icon is reviewed.

## The visual language

Six traits make the set read as one hand. A new icon has all six.

1. **Soft geometry.** A 1.75 stroke with round caps and joins. Lines run at multiples of
   45°, curves are circular arcs, and closed shapes have rounded corners sized by a rule
   (see Corners). Freehand béziers are not used.
2. **One pane of glass.** At most one duotone tint region, on the part that carries the
   meaning: the screen of a monitor, the face of a shield, the body of a bell. It echoes
   the glass materials of the interface.
3. **Air.** Interior details float clear of the outline. Where two parts overlap, the part
   behind is knocked out with a 3-unit gap instead of being drawn through. Examples are
   the slash in `eye-off`, the cursor on `remote-control` and the back person in `users`.
4. **Dots for points.** Status lights, keyholes, list bullets, ellipses and the points of
   `!`, `i` and `?` are solid dots, not tiny circles or short strokes.
5. **Shared parts.** A concept is drawn once and reused, so related icons look related:
   - **monitor:** `endpoint`, `remote-control`, `view-only`, `system`, `desktop`
   - **shield:** `shield`, `ai`, `antivirus`
   - **page:** `file`, `file-text`, `file-transfer` and every file type (`file-pdf`, …)
   - **cloud:** `cloud`, `cloud-off`, `backup`
   - **window frame:** `sidebar`, `inspector`, `columns`, `terminal`, `task-manager`
   - **status circle:** `success`, `error`, `info`, `help`, `pending`, `offline`
   - **cube:** `software`, `package`
   - **ground line:** `organisation`, `office`, `warehouse`, `store`, `school`, `hospital`,
     `factory`
   - **dome:** `camera-dome`, `camera-ptz`, `siren`
   - **contactless arcs:** `nfc`, `access-reader`, `access-card`
   - **doorway:** `door`, `door-open`
6. **Even mass.** Every glyph fills the keyline shape nearest to it, so a circle, a square
   and a monitor read as the same weight at 14px.

## Grid

- ⚙ **Canvas** 24 × 24, `viewBox="0 0 24 24"`, no other root attributes.
- ⚙ **Live area** 2–22. Stroke centre lines may reach 1.5–22.5 for optical balance; the
  generator rejects anything outside.
- **Keyline shapes.** Pick the one closest to the glyph:

  | Keyline   | Size                     | Used by                         |
  | --------- | ------------------------ | ------------------------------- |
  | Circle    | Ø18–19, centred on 12,12 | status icons, `clock`, `globe`  |
  | Square    | 17 × 17 (3.5–20.5)       | `tasks`, `tag`, `dashboard`     |
  | Portrait  | 15 × 19                  | `file`, `clipboard`, `bookmark` |
  | Landscape | 18 × 12–16               | `endpoint`, `terminal`, `mail`  |

- **Centring.** Centre the stroke centre-line bounding box on 12,12, snapped to 0.25.
  Shapes with uneven mass are centred optically:
  - triangles sit about 0.5 low
  - a play glyph sits about 0.5 right
  - an arrowhead that leaves a circle (`history`, `restart`) moves the circle the other
    way

## Stroke

- One stroke weight: 1.75 on the grid. Never vary stroke width inside the file. The frame
  compensates per rendered size, from `xs` ×1.2 to `2xl` ×0.78.
- `stroke-linecap: round` and `stroke-linejoin: round` are set by the frame. Do not
  repeat them.
- ⚙ Coordinates carry at most two decimals. Straight geometry sits on the 0.25 grid.
  Points computed on arcs (tangents, polygon vertices on a circle) are rounded to 0.01.
- **Clearance.** Keep at least 3 units centre to centre between parallel strokes and
  between a detail and the outline. That leaves a visible gap of 1.25, which survives the
  ×1.2 stroke at 14px.

## Corners

Closed shapes are rounded by the length of their **shorter side**:

| Shorter side | Radius |
| ------------ | ------ |
| 12 or more   | 2.5    |
| 7 to 12      | 2      |
| 4.5 to 7     | 1.5    |
| under 4.5    | 1      |

Some cases override the table:

- **Pills and capsules** (`mic`, `patch`) use half their width.
- **Polygons with non-right angles** (`warning`, `tag`, `filter`, `send`, `bolt`, `play`)
  take 0.75–2.25. Acute corners take less, so the visible rounding matches a right-angle
  corner of the same size.
- **Compound outlines** keep the radius of their main shape. The annex of
  `organisation` is an example.
- **Tips are not corners.** Arrowheads, chevrons, star and sparkle points, the foot of a
  shield and the point of a pin take the round join only.
- Never mix rounded and sharp corners on one shape.

## Arrows and heads

- Standalone chevrons and arrowheads are a 90° corner with **5.5-unit arms**. A chevron
  spans 11 × 5.5.
- Heads inside a compound glyph (`download`, `sort`, `undo`, `file-transfer`) use
  **2.25–4.5-unit arms**, sized to the glyph.
- Diagonal arrows (`arrow-up-right`, `external-link`, `trend-up`) end in an axis-aligned
  L, with arms of 5.5–8.
- Circular arrows (`refresh`, `restart`, `history`) end in an axis-aligned L with
  **3.5-unit arms**. Each head sits at a 45° point of its arc.
- Directional glyphs point in reading direction: right and forward mean next.

## Modifiers

- **Off:** a 45° slash from 3.5,3.5 to 20.5,20.5. Every stroke it crosses is cut back
  3 units on each side. A narrow glyph is cut back 2.5 instead, so enough of it survives to
  be recognised (`unpin`). The off icon drops the tint. Examples are `eye-off`, `mic-off`
  and `cloud-off`. When the slash would cut away the parts that carry the
  meaning, move them clear of it instead: `image-off` keeps the frame but puts its mountain
  below the slash and its sun above it.
- **Add:** a plus with 2.75-unit arms beside the base glyph (`user-plus`) or inside a
  container (`new-chat`).
- **Overlay:** a second glyph overlapping the base, with the base knocked out 3 units
  around it (`remote-control`).

## Duotone tint

- An icon has at most one tint region (⚙ one element). It is the shape that holds the
  glyph's meaning. Mark it `class="t"`.
  - The tint may be a sub-region of the outline. Examples are the charge of `battery`,
    the light half of `system` and the tray of `inbox`.
  - Repeated parts (the bars of `pause`, the units of `server`) may share one tint path
    with several sub-paths.
- The tint is filled with `currentColor` at `--icon-tint-opacity` (16%). It can be turned
  off globally (`--icon-tint-opacity: 0`) or per instance (`tint={false}`).
- ⚙ Tint shapes come before the strokes, and ⚙ a tint path is closed. Usually the tint
  repeats the outline.
- Line glyphs have no tint. That covers chevrons, arrows, close, check, plus, menus and
  window controls.

## Dots

- Solid dots (`class="d"`) mark points of information. ⚙ Their radius is at least 1.
- Sizes:
  - 1–1.25 for keys, bullets and LEDs
  - 1.15 for the points of `!`, `i` and `?`
  - 1.4–1.6 for standalone ellipses and grips
- The only larger solid mark is the core of `record`.

## Allowed SVG

⚙ Use only `path`, `circle`, `rect`, `line`, `polyline`, `polygon` and `ellipse`, with
geometry attributes and `class` (`t` or `d`).

The following are not allowed: `fill`, `stroke`, `style`, `transform`, `opacity`, groups,
masks, clip paths, text and gradients. Knockouts are drawn by cutting the path, not by
masking.

## Metaphors

- One glyph, one meaning, everywhere. An endpoint is always the monitor and an
  organisation is always the building. Never reuse a glyph for a different concept, and
  never draw a near-duplicate of an existing one.
  - `play` is media playback. `automation` is a trigger node flowing into a step.
  - `refresh` reloads data. `restart` power-cycles a device. `history` goes back in time.
  - `moon` is the dark theme and `sleep` is the power state.
  - `external-link` leaves Glass UX. `pop-out` moves a window into its own browser window,
    and `pop-in` brings it back.
  - `desktop` is a monitor beside a tower case: the computer as hardware. The monitor alone
    stays `endpoint`, the managed device.
  - `copy` uses portrait pages. `restore` and `windows` use window frames.
  - Sites are buildings told apart by silhouette: `office` a tower of windows, `warehouse`
    an arched shed, `store` an awning, `school` a gabled hall with a clock, `hospital` a
    cross, `factory` a sawtooth roof and chimney. `partner` is a handshake and `supplier` a
    delivery truck; `package` stays the software package.
- Cameras are told apart by housing: `camera` a bullet on its wall arm, `camera-dome` a
  half dome under a ceiling cap, `camera-turret` a ball beneath its base and `camera-ptz` a
  pendant dome over the pan arrow. `nvr` is the recorder, marked with the `record` ring.
- `nfc` is the contactless mark (arcs opening to the reading side), never `wifi`. `gate` is
  a pedestrian or driveway gate; `barrier` is the boom across a vehicle lane. `vehicle` is a
  car; `supplier` stays the delivery truck.
- Use the simplest metaphor that survives at 14px, with at most three ideas per icon.
- Status icons: `success` (check in a circle), `warning` (triangle), `error` (× in a
  circle), `info`, `help`, `pending` (dashed ring) and `offline` (slashed circle). They
  take status colours from their container: a tile tone, a badge, a toast or a row tone.
- Social and company identifiers have custom monochrome adaptations in the icon set.
  They identify the named service, account or destination; do not use them as generic
  action, device or status metaphors. `operating-system` remains the generic OS fallback.
  Full-colour application branding and supplied official artwork belong in `public/brand`.

## File types

File type icons (`file-*`, authored in `scripts/icon-authoring/defs/file-types.mjs`) are the
`file` page and fold, unchanged, with the page as the tint and one emblem inside it. The
emblem names a kind of file, never a format: there are no letters, so PDF is a page layout
rather than "PDF". The exact format is text beside the icon.

- The emblem sits in the body box 7.5–16.5 × 10.5–18.5, which keeps 3 units clear of the
  outline and the fold. Only `file-archive` uses the column left of the fold, for its
  zipper teeth.
- Reuse the set's glyph for the idea: `image` mountains, `play`, the `code` chevrons, the
  `table` grid, the `terminal` prompt, `mail`, `calendar`, `user`, `lock`, `key` and the
  software cube (`file-executable`). A 3D model is a tetrahedron so it never reads as the
  cube.
- The emblem is drawn smaller than its standalone glyph, with heads of 2.5-unit arms. It
  must still read as a distinct silhouette at `xs`.
- `FileIcon` (`glass-ux/file-icon`) picks the icon from a name and MIME type. A new kind
  needs its icon here, an entry in `FileKind` and its MIME types and extensions in
  `src/ui/file-icon/file-kind.ts`.

## Company and manufacturer icons

Author these in `scripts/icon-authoring/defs/brands.mjs`, then run the authoring build
and `pnpm icons`. They follow the same 24 grid, live area, circular arcs, rounded stroke,
optional tint and size compensation as the rest of the set. Brand letterforms and symbols
may require angles other than 45°; preserve their identifying geometry without adding
freehand Béziers, embedded text, gradients or hard-coded brand colours. Use deliberate
joins for connected symbol parts and simplify detail until the identifier reads at 14px.

File names use the service's familiar lower-case name (`github`, `linkedin`, `youtube`).
Generated imports follow the existing casing rule: `IconGithub`, `IconLinkedin`,
`IconYoutube`. Review them in the **Social and company logos** gallery group in both
modes, every size, and with tint disabled. Put an accessible service name on icon-only
links; decorative icons beside a visible service name remain unlabelled.

Device manufacturers are authored in `device-computers-network.mjs` and
`device-printers-voip.mjs` in the same directory and filed under **Device manufacturers**.
Search also accepts device classes such as `VoIP`, `printer`, `network`, `NAS` and `UPS`,
and common aliases such as `Polycom` and `WD`. Use a simplified geometric monogram when
a wordmark has no standalone symbol; avoid squeezing a full word into the icon frame.
Manufacturer names with several words use hyphens (`tp-link`, `western-digital`), yielding
`IconTpLink` and `IconWesternDigital`. These identifiers describe the manufacturer;
keep a generic device icon available when the manufacturer is unknown.

## Naming

- Name by meaning, not shape: `endpoint` not `monitor`, `restart` not
  `circular-arrow`. Variants use a suffix: `chevron-down`, `sort-asc`, `eye-off`.
- **Aliases** exist only for compatibility. Each one repeats its canonical artwork
  exactly:
  - `alert` is an alias of `warning`. New code uses `warning`.
- `star` is the favourite glyph. There is no separate `favourite` icon.

## Review loop

1. Author the SVG to this spec, run `pnpm icons`, then `pnpm icons:check`.
2. Open `/foundations/icons` and search for the icon:
   - Check it at every size with the size switch, in light and dark, with and without
     tint.
   - Check it in the **Keylines** specimen style: the 24 grid, the live area and the
     nearest keyline.
3. An icon is approved when it reads at `xs`, holds the same weight and mass as its
   neighbours, and nothing in it touches without meaning to.
