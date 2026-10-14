/**
 * Region outlines on demand: one small GeoJSON file per admin-1 region (a few KB), fetched
 * once per page and shared. The map loads the home region's outline and the outlines of
 * the regions that hold points, never a world file.
 */
import { useEffect, useState } from "react"
import type { MapConfig, MapRegion } from "./types.js"

const cache = new Map<string, Promise<MapRegion | null>>()

/** "/geo/admin1/{country}/{code}.json" → "/geo/admin1/AU/AU-TAS.json". */
export function regionUrl(template: string, code: string): string {
  const country = code.split("-")[0] ?? ""
  return template.replace("{country}", encodeURIComponent(country)).replace("{code}", encodeURIComponent(code.replace(/[^A-Za-z0-9-]/g, "")))
}

/** Fetch a region; resolves null when it does not exist (an unknown code, offline). */
export function loadRegion(template: string, code: string): Promise<MapRegion | null> {
  const url = regionUrl(template, code)
  let pending = cache.get(url)
  if (!pending) {
    pending = fetch(url)
      .then((response) => (response.ok ? (response.json() as Promise<MapRegion>) : null))
      .catch(() => null)
    cache.set(url, pending)
    // A failure is not remembered: the next mount tries again.
    void pending.then((region) => {
      if (!region) cache.delete(url)
    })
  }
  return pending
}

/**
 * One region: undefined while loading, null when there is none (no code, or it failed to
 * load: the map then frames its points instead of a region).
 */
export function useMapRegion(config: Pick<MapConfig, "regions">, code: string | null | undefined): MapRegion | null | undefined {
  const [state, setState] = useState<{ code: string; region: MapRegion | null } | null>(null)
  useEffect(() => {
    if (!code) return
    let live = true
    void loadRegion(config.regions, code).then((region) => {
      if (live) setState({ code, region })
    })
    return () => {
      live = false
    }
  }, [config.regions, code])
  if (!code) return null
  return state?.code === code ? state.region : undefined
}

/** Several regions (faint outlines): those loaded so far, in the order asked. */
export function useMapRegions(config: Pick<MapConfig, "regions">, codes: readonly string[]): readonly MapRegion[] {
  const key = codes.join(",")
  const [regions, setRegions] = useState<readonly MapRegion[]>([])
  useEffect(() => {
    let live = true
    const list = key ? key.split(",") : []
    void Promise.all(list.map((code) => loadRegion(config.regions, code))).then((loaded) => {
      if (live) setRegions(loaded.filter((region): region is MapRegion => region !== null))
    })
    return () => {
      live = false
    }
  }, [config.regions, key])
  return regions
}
