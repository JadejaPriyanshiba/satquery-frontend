/**
 * The bottom rail — live map readouts, kept to facts the map already
 * knows: where the cursor is, how big the AOI is, and what is currently
 * drawn on top of the basemap.
 */

import { bboxExtent, formatLatLng } from "../services/jobModel";

export default function StatusRail({ pointer, aoi, footprint, overlayOn }) {
  const extent = bboxExtent(aoi);

  return (
    <div className="status-rail">
      <div className="readout">
        <span>Cursor</span>
        <strong>{formatLatLng(pointer.lat, pointer.lng)}</strong>
      </div>

      {extent && (
        <div className="readout">
          <span
            className="chip-dot"
            style={{ background: "#2a78d6" }}
            aria-hidden="true"
          />
          <span>AOI</span>
          <strong>
            {extent.widthKm.toFixed(1)} × {extent.heightKm.toFixed(1)} km
          </strong>
          <span className="readout-sep" aria-hidden="true" />
          <strong>{extent.areaKm2.toFixed(1)} km²</strong>
        </div>
      )}

      {footprint && (
        <div className="readout">
          <span
            className="chip-dot"
            style={{ background: "#eb6834" }}
            aria-hidden="true"
          />
          <span>GeoTIFF footprint</span>
        </div>
      )}

      {overlayOn && (
        <div className="readout">
          <span aria-hidden="true">◈</span>
          <span>Evidence overlay on</span>
        </div>
      )}
    </div>
  );
}
