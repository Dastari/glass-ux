# Performance

Import the component entry you use, such as `glass-ux/button`. Large families such as
MapLibre and syntax highlighting load on demand.

During drag or resize, the window system writes transforms to the moving element and
commits state at the end of the gesture. Avoid adding React state updates per pointer
frame. Keep native scrolling and passive listeners. Changing inherited CSS variables
on an ancestor per frame can cause every descendant to be restyled.

Use fill materials around long scrolling content. Moving glass panels set `data-moving`
while the gesture is active so they can use an opaque fill instead of repeated blur work.
Virtualized tables require a bounded body; give their parent a definite size and use the
table's fill mode. Measure rendering and interaction in the consuming application.

Pointer-driven light (`installPointerLight`, installed by `AppearanceProvider`) uses one
passive document listener, writes at most once per animation frame and only to the hovered
`fa-lit` element's own `--light-x`/`--light-y`; it paints inside that element and stops
under reduced motion and in Solid. Skeleton shimmer moves each placeholder's own `::after`
with transform, so it never repaints; `installShimmerSync` aligns the sweeps to one beat.
Gliding indicators clip a single element (`fa-glide`) between two registered edge lengths
instead of animating its width. Keep `fa-lit` off blurred layers: repainting inside a
layer redraws its blur pass.

Apart from a disclosure's height and window state changes, nothing animates layout. Slider
ranges and thumbs move with transform against their track's container width; the workspace
snap preview lays out once at its new zone and plays the inverse transform; the phone tab
bar condenses with transform and opacity. The shell's drawer and inspector never animate
grid tracks: the pane slides over the workspace and its track commits once (immediately
when closing, after the slide when opening), so the workspace is laid out once per toggle
rather than every frame. Window geometry changes between states (tile, snap, maximise)
still transition `left`/`top`/`width`/`height`, because their content must reflow to the
new size; they run once per state change and never during a drag.

A compositor-only animation still forces any blurred layer it sits in to re-blur. Chromium
redraws a backdrop-filtered element in full, blur included, whenever damage touches it,
even when the damage comes from an element painted above it; the blur's reach then carries
the damage into neighbouring blurred layers. In a resting shell trace (software compositing,
1920×1080) a live pulse in the docked drawer and inspector held the display compositor at
about 980 ms/s, against none without it and about 20 ms/s for the same pulse on the bare
canvas. Giving the halo its own layer (`will-change`, `contain: paint`), isolating it, or
drawing it as a separate element above the material made no difference. So an infinite
animation runs only while its state lasts (pending, live, loading), never on a blurred
material itself, and `pnpm css-perf:check` asks every other one for a `perf:infinite` note
saying when it runs. `AppShell` names its routed view for view transitions only while one
runs: a named element is a backdrop root, so its panels would blur nothing but the view.

## Baked frost

With `configureAppearance({ glassRendering: "baked" })`, panel and chrome layers on the page
canvas stop blurring live. `installBakedFrost` (installed by `AppearanceProvider`) draws the
canvas — its colour, gradient and image layers and Silk's lines — with the 2D canvas API,
blurs and saturates it once per material and level at half resolution, and each layer shows
that bitmap fixed to the viewport under its own fill. The canvas does not move, so the
result matches the live blur (within 2–5/255 on every background, light and dark), and
nothing that animates inside or near a layer makes it blur again. The bake runs in idle time
in short steps, about 150 ms after load, and again when the mode, palette, background,
material level or window size changes; the live blur covers the gap.

The bitmap is wrong wherever something other than the static canvas is behind a layer, so
those keep the live blur: a scroller while it scrolls (`data-frost-live` on it until it has
been still for 200 ms, so its panels never repaint a fixed background every scroll frame), a
pane while it slides (a transform transition), a dragged window, overlays, floating windows,
the window dock and phone tab bar, mode islands, a layer inside another layer and a layer on
any canvas other than the page's. A route cross-fade keeps the bake, where the live blur loses
the canvas for the transition. Baked rendering needs `background-clip: border-area` and fixed
backgrounds, so other browsers, and iOS and iPadOS, keep the live blur; an image in the canvas
that cannot be loaded for drawing does the same. Text on a baked panel sits on an opaque
background, so where the platform uses subpixel text (Windows and Linux at standard density)
Chromium draws it with subpixel antialiasing instead of greyscale.

A surface's own level (`glass` on `Surface` and `Panel`, `data-glass` on any element) is
baked like the page's.

A `ConversationLog` with 20 or more children lays out and paints only the turns near the
viewport (`content-visibility: auto`): a 200-turn transcript mounted in half the time in the
fixture. A turn far from the view keeps the size it last rendered at, or a 24rem estimate
before it has rendered, so scroll to a turn with `useConversationLog().scrollToTurn(index)`,
which lays the transcript out for one frame first, rather than calling `scrollIntoView` on
it. Shorter logs render every turn, because a turn rendering late can defeat the page's
scroll anchoring for that frame.

Edge refraction through an SVG displacement filter (`backdrop-filter: url(#…)`) was
prototyped and left out. It renders only in Chromium; at the library's blur radii the
bent rim is barely visible except over sharp text; sampling outside the box mirrors the
backdrop at the edge; and with content moving beneath it, it roughly doubled the
compositor's draw time and multiplied compositor-thread work several times over
a blur-only layer in a software-rendered trace. Thicker rims, the lens glow and the
pointer light carry the material instead.

Chromium tries a rule only on elements that carry the key of its rightmost compound (a class,
id, attribute or type). A rightmost `:is()` or `:where()` list of several selectors has no
key, so it is tried on every element at every style recalc. The package build splits those
lists in the shipped CSS (`scripts/css-buckets.mjs`) into separate selectors of the same
specificity; source files keep the compact lists. In the 10,000-row table fixture, style
recalc while scrolling fell by about a tenth. The `@scope` fallback (`scope-fallback.css`)
sits behind `@supports not at-rule(@scope)`, so browsers that report `@scope` skip it, and
the reduced-transparency copies of the Solid rules are generated from them by `pnpm styles`.

Under a `TooltipProvider`, a `Tooltip` renders only its trigger: one host per provider
listens for pointer and focus events and shows the bubble, following the same rest delay,
group timing, focus, press and Escape rules as Base UI's own trigger. A controlled tooltip
(`open`) or one outside any provider keeps its own Base UI tooltip.
`scripts/profile-tooltips.mjs` records frame-by-frame timelines of both designs for
comparison. A button that tracks a status mounts one hidden reserve for its other faces
until its first status, and ActionBar measures markup-only replicas of its buttons.

Measure without forcing layout mid-commit. A layout read in a layout effect makes the
browser lay out the whole pending page inside the commit; read it in a ResizeObserver
callback instead, where layout is already done, and flush the state update there so the
first frame is still right (`useChildWidths`, ConversationLog's dock, DataTable's body).
Read everything before writing, write only values that changed, and measure when content
or size changes rather than after every render (a live entity header). Keep the size you
observe independent of the state the measurement sets, or the observer cannot deliver the
change in the same frame. Shared stores serve the page: one root rem (`lib/rem.ts`), one
relative-time clock (`lib/clock.ts`) and one `MediaQueryList` per query.

A docked inspector that is closed keeps its content under `<Activity mode="hidden">`: its
state and DOM stay, its effects and animations stop. A line chart whose live window only
moved on redraws its paths at once instead of morphing every point; any other data change
still morphs. Every chart keeps an accessible data table mounted: at 4x throttle it costs
about 50–65 ms of mount and 6 ms (60 samples) to 30 ms (500 or more; it shows at most 500
rows) of each live update, with 186 to 1,506 DOM nodes.

When authoring components, run `pnpm css-perf:check` and `pnpm tokens:check`. Avoid root
`:has()` selectors and universal sibling selectors. Use stable row IDs and preserve data
identity across updates. The library's tests cover table layout and filter semantics;
application tests must cover the fetched data and actual container sizes.

The repository checks build the documentation separately from the package and inspect
representative component pages in desktop and phone viewports. For performance budgets,
profile the production host with its real routes and dataset rather than using the entire
component catalogue as a runtime benchmark.

## Measurements (0.9.9)

Production builds of the fixtures in `scripts/performance` (`node scripts/performance/build.mjs`
with `PERF_ENTRY`), Chromium 156 headless with software compositing, 4x CPU throttle unless
noted; medians of 3–9 runs. `scripts/profile-compositor.mjs` and
`scripts/profile-interactions.mjs` record them. Software compositing makes blur far dearer
than a GPU does; compare the columns, not the absolute compositor figures.

| Measure | 0.9.8 | 0.9.9 |
| --- | --- | --- |
| Resting shell, pulse in drawer and inspector: compositor cost per frame | 39 ms (25 fps) | live 40 ms (24 fps); baked 0.7 ms (60 fps) |
| Resting shell, pulse in drawer and inspector: compositor ms/s | 980 | live 975; baked 65 |
| Resting shell, pending spinner only: compositor ms/s | 706 | live 633; baked 26 |
| Scrolling a view of 26 panels: compositor ms/s (raster s) | 477 (0.18) | live 467 (0.17); baked 459 (0.29) |
| Baking the canvas at load (4x throttle): longest task added | — | none (Silk); 55 ms (Contours) |
| Resting shell, nothing animating: compositor ms/s | 0 | 0 |
| Closed inspector with live content: main thread ms/s | 20 | 7 |
| Mount 300 icon buttons with tooltips | 182 ms | 80 ms |
| Mount 50 entity action bars | 452 ms | 294 ms |
| Mount and lay out a 200-turn transcript | 2.8 s | 1.3 s |
| DataTable sort, interaction to next paint | 64 ms | 48 ms |
| DataTable filter typing, interaction to next paint | 104 ms | 88 ms |
| Hydrate under AppearanceProvider, nothing stored: longest task | 191 ms | 67 ms |
| Hydrate, nothing stored: appearance consumer renders | 2 per consumer | 1 |
| Hydrate with stored preferences: longest task | 159 ms | 74 ms |
| Live line chart slide, 500 samples: commit and layout | 51 ms | 44 ms |
| Style recalc over 10 scroll steps, 10,000-row table (no throttle) | 20 ms | 18 ms |
| `glass-ux/button` `Button`, gzip | 31.6 KB | 32.3 KB |
| Library stylesheet as the shell fixture bundles it, gzip | 70.9 KB | 72.6 KB |
| `glass-ux/appearance`, gzip (baked renderer loaded on demand) | 4.5 KB | 6.7 KB (renderer 11.7 KB min) |
