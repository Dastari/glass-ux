import { useMemo, useState } from "react"
import { ContainerLab, Example, OnCanvas, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { DEMO_MAP_CONFIG, MOCK_SITES } from "../fixtures/map.js"
import { createDataTableColumns, DataTable } from "../../ui/data-table/index.js"
import {
  DEFAULT_STATUS_LABELS,
  DefaultClusterPopup,
  GeoMap,
  GeoMapSkeleton,
  MapStatusSummary,
  MapViewToggle,
  countStatuses,
  ringSegments,
  totalOf,
  useMapRegion,
  useMapRegions,
  type MapConfig,
  type MapPoint,
  type MapStatus,
} from "../../ui/map/index.js"

/** Gallery points: the demo's sites with a fixed spread of statuses. */
const STATUSES: MapStatus[] = ["healthy", "healthy", "warning", "healthy", "danger", "healthy", "unknown", "healthy", "warning", "healthy"]
const POINTS: MapPoint<{ address: string }>[] = MOCK_SITES.map((site, index) => ({
  id: site.id,
  lng: site.location.lng,
  lat: site.location.lat,
  status: STATUSES[index % STATUSES.length]!,
  label: site.name,
  description: site.address.split(", ").at(-1),
  data: { address: site.address },
}))

const OUTLINE_ONLY: MapConfig = { ...DEMO_MAP_CONFIG, basemap: null }
const ATTRIBUTION_CONFIG: MapConfig = { ...OUTLINE_ONLY, regionAttribution: {
  label: "Natural Earth public domain boundary data",
  href: "https://www.naturalearthdata.com/",
  licence: "Public domain",
  short: "Boundary data: Natural Earth, public domain cartographic data",
  minimal: "Natural Earth",
} }

const CLUSTERS = [
  { label: "Cluster · all healthy", size: "sm", counts: { danger: 0, warning: 0, healthy: 4, unknown: 0 } },
  { label: "Cluster · mixed", size: "md", counts: { danger: 1, warning: 3, healthy: 9, unknown: 1 } },
  { label: "Cluster · one critical in many", size: "lg", counts: { danger: 1, warning: 0, healthy: 40, unknown: 2 } },
] as const

function PointPopup({ point }: { point: MapPoint<{ address: string }> }) {
  return (
    <div className="gallery-map-popup">
      <p className="fa-map-popup-title">{point.label}</p>
      <p className="gallery-map-popup-meta">{point.data.address}</p>
      <MapStatusSummary counts={countStatuses([point])} />
    </div>
  )
}

function useRegions() {
  const home = useMapRegion(DEMO_MAP_CONFIG, "AU-TAS")
  const regions = useMapRegions(DEMO_MAP_CONFIG, ["AU-VIC", "NZ-MBH"])
  return { home, regions }
}

function LiveMap({ id, config = DEMO_MAP_CONFIG, points = POINTS, className = "gallery-map-frame" }: { id: string; config?: MapConfig; points?: typeof POINTS; className?: string }) {
  const { home, regions } = useRegions()
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className={className} data-testid={id}>
      <GeoMap
        label="Sites"
        config={config}
        home={home}
        regions={regions}
        points={points}
        selectedId={selected}
        onSelect={(point) => setSelected(point?.id ?? null)}
        renderPopup={(point) => <PointPopup point={point} />}
      />
    </div>
  )
}

const listColumns = (() => {
  const col = createDataTableColumns<MapPoint<{ address: string }>>()
  return col.columns([
    col.accessor("label", { header: "Site", pin: true, width: 16, filter: { none: "A short fixed list in the gallery" } }),
    col.accessor("status", { header: "Status", width: 8, filter: { none: "A short fixed list in the gallery" } }),
    col.accessor("description", { header: "Locality", width: 12, filter: { none: "A short fixed list in the gallery" } }),
  ])
})()

function ListViewExample() {
  const { home, regions } = useRegions()
  const [view, setView] = useState<"map" | "list">("list")
  const rows = useMemo(() => POINTS.slice(0, 12), [])
  return (
    <div className="gallery-map-frame" data-size="list" data-testid="map-list-example">
      <GeoMap
        label="Sites"
        config={OUTLINE_ONLY}
        home={home}
        regions={regions}
        points={rows}
        view={view}
        onViewChange={setView}
        renderPopup={(point) => <PointPopup point={point} />}
        list={
          <DataTable
            id="gallery-map-list"
            label="Sites"
            rows={rows}
            rowCount={rows.length}
            columns={listColumns}
            getRowId={(row) => row.id}
            selectable={false}
            toolbar={<MapViewToggle view="list" onViewChange={setView} size="sm" />}
            noun={{ one: "site", other: "sites" }}
          />
        }
      />
    </div>
  )
}

export default function MapSection() {
  const tasmania = useMapRegion(DEMO_MAP_CONFIG, "AU-TAS")
  const sample = POINTS.slice(0, 9)
  return (
    <SectionPage>
      <OnCanvas
        title="Home region"
        description="The map has no material of its own, so the canvas shows through as the sea. The home region glows in the data hue, and basemap detail fades in as you zoom. Sites outside Tasmania are counted in the pill at the bottom."
      >
        <LiveMap id="map-hero" />
      </OnCanvas>

      <Specimen title="Attribution in narrow maps" description="The required minimal credit stays readable in narrow containers and at larger UI scales. The information control retains the complete source and licence links." layout="bare">
        <LiveMap id="map-attribution" config={ATTRIBUTION_CONFIG} />
      </Specimen>

      <Specimen
        title="Modes and palettes"
        description="The style is generated from tokens at the map's own element, so a mode or palette island recolours it: the glow, water, roads and labels all follow. Glass, Frosted and Solid (the toolbar above) change only the controls; the map is never a material."
        layout="bare"
        wide
      >
        <div className="gallery-map-islands">
        <Example label="Light">
          <div data-mode="light" className="canvas-ambient gallery-map-island">
            <LiveMap id="map-light" className="gallery-map-frame" />
          </div>
        </Example>
        <Example label="Dark · ocean">
          <div data-mode="dark" data-palette="ocean" className="canvas-ambient gallery-map-island">
            <LiveMap id="map-dark" className="gallery-map-frame" />
          </div>
        </Example>
        </div>
      </Specimen>

      <Specimen
        title="Clusters and markers"
        description="Nearby points cluster. A cluster shows its count inside a ring with one segment per status, worst first; a lone point shows its status as a dot with a ring, its name from zoom 8.5, and an accent halo when selected. A live status change pulses the marker once; the motion switch stops it."
        layout="bare"
        wide
      >
        <div className="gallery-map-marker-row" aria-hidden>
          {(["healthy", "warning", "danger", "unknown"] as const).map((status) => (
            <Example key={status} label={DEFAULT_STATUS_LABELS[status]}>
              <span className="fa-map-marker" data-kind="point" data-status={status}>
                <span className="fa-map-dot" />
              </span>
            </Example>
          ))}
          <Example label="Selected">
            <span className="fa-map-marker" data-kind="point" data-status="healthy" data-selected="">
              <span className="fa-map-dot" />
            </span>
          </Example>
          {CLUSTERS.map(({ label, counts, size }) => (
            <Example key={label} label={label}>
              <span className="fa-map-marker" data-kind="cluster" data-size={size}>
                <span className="fa-map-cluster">
                  <svg viewBox="-18 -18 36 36" className="fa-map-ring" focusable="false">
                    {ringSegments(counts, 15).map((segment) => (
                      <path key={segment.status} d={segment.d} data-status={segment.status} />
                    ))}
                  </svg>
                  <span className="fa-map-cluster-count">{totalOf(counts)}</span>
                </span>
              </span>
            </Example>
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Popups"
        description="The shared popup look (glass-overlay fa-popup), not MapLibre's. Hovering or focusing a marker previews it; clicking or Enter pins it and moves focus inside; Esc closes it and returns focus. The caller renders the content and can add detail once zoomed in."
      >
        <Example label="Point">
          <div className="glass-overlay fa-popup fa-map-popup" data-pinned="">
            <PointPopup point={POINTS[1]!} />
          </div>
        </Example>
        <Example label="Cluster">
          <div className="glass-overlay fa-popup fa-map-popup">
            <DefaultClusterPopup
              cluster={{ id: 1, lng: 147.9, lat: -42.5, points: sample }}
              size={sample.length}
              counts={countStatuses(sample)}
              labels={{ danger: "Critical", warning: "Warning", healthy: "Healthy", unknown: "Offline" }}
              noun={{ one: "site", other: "sites" }}
              onZoom={() => undefined}
              onOpen={() => undefined}
            />
          </div>
        </Example>
      </Specimen>

      <Specimen title="List view" description="“View as list” swaps the map for the caller's table in the same box; “View as map” in the table's toolbar swaps back. The map keeps its camera while hidden." layout="bare" wide>
        <ListViewExample />
      </Specimen>

      <Specimen title="Loading" description="Before the map engine arrives, the home region's outline stands in, framed exactly as the map will frame it, so the map fades in over it without a shift. Never a spinner." layout="bare" wide>
        <div className="gallery-map-frame" data-size="short" data-testid="map-skeleton">
          <GeoMapSkeleton region={tasmania} />
        </div>
      </Specimen>

      <Specimen title="Data, privacy and credits" description="Where everything on the map comes from, what leaves the browser, and how the credits behave. The full account is docs/map.md." layout="stack">
        <ul className="gallery-map-sources">
          <li>
            <strong>Basemap tiles and label glyphs:</strong> OpenFreeMap (OpenMapTiles schema, OpenStreetMap data, ODbL 1.0). No key and no account. Glass UX draws them with its own style,
            generated from tokens; nothing else is borrowed.
          </li>
          <li>
            <strong>Privacy:</strong> OpenFreeMap's servers see each visitor's tile requests: their IP address and the area they look at. Where that must not reach a third party,
            self-host OpenFreeMap or any OpenMapTiles-compatible server and point the map config at it.
          </li>
          <li>
            <strong>Region outlines and the loading silhouette:</strong> Natural Earth 10 m admin-1 (public domain), one small file per region, always self-hosted. Australia and New
            Zealand are in the repository; a production build generates the rest. A region with no file draws no outline.
          </li>
          <li>
            <strong>Credits:</strong> the full line shows when the map loads and folds to ⓘ after five seconds or at the first pan, zoom or click, as the OpenStreetMap
            Foundation's Attribution Guidelines allow. ⓘ always opens every credit.
          </li>
        </ul>
      </Specimen>

      <ContainerLab description="The map fills whatever box it is given. In small boxes the zoom buttons and then the other controls drop out, while pinch and scroll still zoom, and the credits shorten without losing their source links.">
        {() => <LiveMap id="map-lab" className="gallery-map-fill" />}
      </ContainerLab>

      <Rules
        do={[
          "Give the map a definite height; it fills its box.",
          "Configure where tiles come from in MapConfig; the style stays Glass UX's.",
          "Credit the tile source and OpenStreetMap through the attribution control.",
          "Offer the list view wherever the map is the main way to find something.",
        ]}
        dont={[
          "Colour points with the brand accent; status tones mean status only.",
          "Load a third-party map style and recolour it.",
          "Put the map inside a glass panel; it sits on the canvas.",
          "Animate the camera without the motion tokens.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--chart-1", "The home region's glow (--fa-map-glow), its core mixed toward --fg; water mixes it with --canvas"],
          ["--fg-muted", "Major roads and labels"],
          ["--fg-subtle", "Local roads, boundaries and unknown points"],
          ["--canvas", "Label halos, and the sea: the map has no background"],
          ["--accent", "The selected point's halo"],
          ["--success", "Healthy points and ring segments"],
          ["--warning", "Warning"],
          ["--danger", "Critical"],
          ["--duration-slower", "Camera moves take twice this"],
        ]}
      />
    </SectionPage>
  )
}
