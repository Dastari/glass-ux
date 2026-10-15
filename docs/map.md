# Maps

`glass-ux/map` plots typed points, clusters them, outlines regions and renders an optional
OpenMapTiles-compatible basemap. A point's `data` belongs to the caller. Selection and
navigation callbacks connect markers to the host application.

Supply a `MapConfig` containing the basemap, region URL template, attribution and zoom
limits. `basemap: null` draws region outlines and points without an external tile service.
The demo uses this mode and fictional Northstar and Cedar Vale sites. Natural Earth
region outlines are public-domain geographic data, not customer locations.

The static docs bundle includes its own `/geo/admin1/{country}/{code}.json` files. A
package consumer must serve the needed region files or provide a different `regions`
URL. Geographic fixture files in the source repository are under `public/geo`; they are
not installed into a consumer's public directory automatically.

For a basemap, supply the vector tile source, OpenMapTiles schema, glyph URL, font names
and attribution. The application chooses whether to self-host or use an external service.
Keep required data and font credits visible through the attribution control. The host
also owns its CSP, including MapLibre's worker and permitted tile/glyph sources.

The credit line stays inside the map's available width, including configured insets.
It uses each credit's `minimal` label below 30rem wide or 16rem tall and wraps longer
labels when necessary. The information button always retains the complete source and
licence links. The line folds to that button after five seconds or the first map
interaction. Zoom buttons collapse separately below 20rem wide or 16rem tall; below
8rem tall the other map controls also disappear.

MapLibre loads lazily. Use the `glassUx()` Vite plugin for its worker asset imports.
The [Map component page](https://dastari.github.io/glass-ux/components/map/) provides live
examples, complete source and the exact typed contract for `MapConfig`, `MapPoint` and
component props.
