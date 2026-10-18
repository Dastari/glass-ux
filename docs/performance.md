# Performance

Import the component entry you use, such as `glass-ux/button`. Keep `glass-ux/gallery`
in a documentation route; it includes the demonstration registry and sample fixtures.
Large families such as MapLibre and syntax highlighting load on demand.

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

Edge refraction through an SVG displacement filter (`backdrop-filter: url(#…)`) was
prototyped and left out. It renders only in Chromium; at the library's blur radii the
bent rim is barely visible except over sharp text; sampling outside the box mirrors the
backdrop at the edge; and with content moving beneath it, it roughly doubled the
compositor's draw time and multiplied compositor-thread work several times over
a blur-only layer in a software-rendered trace. Thicker rims, the lens glow and the
pointer light carry the material instead.

When authoring components, run `pnpm css-perf:check` and `pnpm tokens:check`. Avoid root
`:has()` selectors and universal sibling selectors. Use stable row IDs and preserve data
identity across updates. The library's tests cover table layout and filter semantics;
application tests must cover the fetched data and actual container sizes.

The repository checks build the documentation separately from the package and inspect
representative component pages in desktop and phone viewports. For performance budgets,
profile the production host with its real routes and dataset rather than using the entire
component catalogue as a runtime benchmark.
