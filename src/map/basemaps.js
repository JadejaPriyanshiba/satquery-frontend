/**
 * Basemap catalogue.
 *
 * All of these are plain XYZ raster tile services, which is the one
 * thing Leaflet needs — no extra dependency buys anything here. Each
 * entry carries its own attribution because every one of these
 * providers requires it on screen; the attribution control is styled
 * down in `styles/map.css` but never removed.
 *
 * `preview` is a real tile from the service (z5 over western India), so
 * the picker shows what each basemap actually looks like rather than a
 * hand-drawn swatch that can drift from reality.
 */

const PREVIEW_TILE = { z: 5, x: 22, y: 13 };

function previewUrl(template) {
  return template
    .replace("{s}", "a")
    .replace("{z}", PREVIEW_TILE.z)
    .replace("{x}", PREVIEW_TILE.x)
    .replace("{y}", PREVIEW_TILE.y)
    .replace("{r}", "");
}

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const BASEMAPS = [
  {
    id: "satellite",
    name: "Satellite",
    note: "Esri World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
    dark: true,
  },
  {
    id: "hybrid",
    name: "Hybrid",
    note: "Imagery with place labels",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
    dark: true,
    // Drawn above the imagery so roads and place names stay readable.
    reference:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
  {
    id: "terrain",
    name: "Terrain",
    note: "OpenTopoMap — relief and contours",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      `Map data: ${OSM_ATTR}, <a href="https://viewfinderpanoramas.org">SRTM</a> | ` +
      'Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    dark: false,
  },
  {
    id: "relief",
    name: "Shaded relief",
    note: "Esri World Terrain",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri",
    maxZoom: 13,
    dark: false,
  },
  {
    id: "streets",
    name: "Streets",
    note: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_ATTR,
    maxZoom: 19,
    dark: false,
  },
  {
    id: "light",
    name: "Light",
    note: "CARTO Positron — quiet backdrop",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    subdomains: "abcd",
    maxZoom: 20,
    dark: false,
  },
  {
    id: "dark",
    name: "Dark",
    note: "CARTO Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    subdomains: "abcd",
    maxZoom: 20,
    dark: true,
  },
];

export const BASEMAPS_BY_ID = Object.fromEntries(
  BASEMAPS.map((basemap) => [
    basemap.id,
    { ...basemap, preview: previewUrl(basemap.url) },
  ])
);

export const DEFAULT_BASEMAP = "satellite";

export function getBasemap(id) {
  return BASEMAPS_BY_ID[id] ?? BASEMAPS_BY_ID[DEFAULT_BASEMAP];
}

/**
 * Demo areas the backend ships imagery for.
 *
 * Same bboxes the previous UI used — they are the AOIs the Sentinel
 * fetcher has cached scenes for, so they work without credentials.
 */
export const DEMO_AOIS = [
  { name: "Gujarat", bbox: [72.82, 21.12, 72.9, 21.2] },
  { name: "Delhi", bbox: [77.1, 28.55, 77.15, 28.6] },
  { name: "Kolkata", bbox: [88.2, 22.5, 88.3, 22.58] },
];
