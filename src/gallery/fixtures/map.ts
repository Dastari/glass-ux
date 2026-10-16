import type { MapConfig } from "../../ui/map/index.js";

/** Public, key-free tiles for the gallery. Applications supply their own map provider. */
export const DEMO_MAP_CONFIG: MapConfig = {
  basemap: {
    source: { type: "tilejson", url: "https://tiles.openfreemap.org/planet" },
    schema: "openmaptiles",
    maxZoom: 14,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    fonts: {
      regular: "Noto Sans Regular",
      bold: "Noto Sans Bold",
      italic: "Noto Sans Italic",
    },
    attribution: [
      {
        label: "Data © OpenStreetMap contributors",
        short: "© OpenStreetMap",
        minimal: "© OpenStreetMap",
        href: "https://www.openstreetmap.org/copyright",
        licence: "ODbL 1.0",
      },
      {
        label: "© OpenMapTiles",
        short: "© OpenMapTiles",
        minimal: "© OpenMapTiles",
        href: "https://openmaptiles.org/",
      },
      {
        label: "Tiles provided by OpenFreeMap",
        short: "OpenFreeMap",
        href: "https://openfreemap.org/",
      },
    ],
  },
  minZoom: 1.5,
  maxZoom: 18,
  regions: `${import.meta.env.BASE_URL}geo/admin1/{country}/{code}.json`,
  regionAttribution: {
    label: "Natural Earth",
    href: "https://www.naturalearthdata.com/",
    licence: "Public domain",
  },
};
export const MOCK_SITES = [
  {
    id: "studio-east",
    name: "East studio",
    address: "12 Example Lane, Melbourne",
    location: { lat: -37.812, lng: 144.972 },
  },
  {
    id: "studio-west",
    name: "West studio",
    address: "24 Sample Avenue, Melbourne",
    location: { lat: -37.805, lng: 144.945 },
  },
  {
    id: "workshop",
    name: "Workshop",
    address: "8 Fiction Road, Melbourne",
    location: { lat: -37.828, lng: 144.953 },
  },
];
