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
saying when it runs. The routed view's panels in `AppShell` draw without blur: they sit on
the canvas, and the view is named for view transitions only while one runs.

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

When authoring components, run `pnpm css-perf:check` and `pnpm tokens:check`. Avoid root
`:has()` selectors and universal sibling selectors. Use stable row IDs and preserve data
identity across updates. The library's tests cover table layout and filter semantics;
application tests must cover the fetched data and actual container sizes.

The repository checks build the documentation separately from the package and inspect
representative component pages in desktop and phone viewports. For performance budgets,
profile the production host with its real routes and dataset rather than using the entire
component catalogue as a runtime benchmark.
