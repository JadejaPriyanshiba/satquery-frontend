/**
 * bbox <-> Leaflet bounds.
 *
 * The backend speaks `[minLon, minLat, maxLon, maxLat]` everywhere —
 * `AOI.bbox`, the upload `info.bounds`, the `ingest` audit params —
 * while Leaflet wants `[[south, west], [north, east]]`. One conversion,
 * in one place, so no component has to remember the ordering.
 */

export function bboxToBounds(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;

  return [
    [bbox[1], bbox[0]],
    [bbox[3], bbox[2]],
  ];
}
