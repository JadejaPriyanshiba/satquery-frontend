/**
 * GeoTIFF upload.
 *
 * `POST /upload` answers with `{ image_ref, info }`, where `info` carries
 * the raster profile and `info.bounds` in `AOI.bbox` *ordering*
 * (`[min, min, max, max]`) but in the file's own CRS. The previous UI
 * looked for that bbox at the top level of the response and, never
 * finding it, told the user the backend needed changing — it did not,
 * the bounds were one level in the whole time. They are still only
 * usable on the map when they are lon/lat, which `geographicBounds()`
 * decides.
 */

import { useRef, useState } from "react";

import { uploadGeoTIFF } from "../services/api";
import { geographicBounds } from "../services/jobModel";

const MAX_UPLOAD_MB = 100; // Settings.max_upload_mb on the backend.

export default function GeoTIFFUploader({ upload, onUploaded, onCleared }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const pick = (event) => {
    const chosen = event.target.files?.[0];

    setError("");
    setFile(null);

    if (!chosen) return;

    if (!/\.tiff?$/i.test(chosen.name)) {
      setError("That is not a GeoTIFF. Choose a .tif or .tiff file.");
      event.target.value = "";
      return;
    }

    if (chosen.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(
        `The backend rejects uploads over ${MAX_UPLOAD_MB} MB; this file is ` +
          `${(chosen.size / (1024 * 1024)).toFixed(1)} MB.`
      );
      event.target.value = "";
      return;
    }

    setFile(chosen);
  };

  const send = async () => {
    if (!file) return;

    try {
      setBusy(true);
      setError("");

      const result = await uploadGeoTIFF(file);

      onUploaded({
        imageRef: result.image_ref,
        info: result.info ?? null,
        // Null for a projected raster: the analysis still runs, only the
        // map placement is withheld.
        bounds: geographicBounds(result.info),
        filename: file.name,
      });
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setFile(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    onCleared();
  };

  if (upload) {
    const info = upload.info ?? {};

    return (
      <div className="field-group">
        <div className="status-banner tone-good">
          <span className="status-glyph" aria-hidden="true">
            ✓
          </span>
          <div style={{ minWidth: 0 }}>
            <strong>{upload.filename}</strong>
            <p>{upload.imageRef}</p>
          </div>
        </div>

        <dl className="kv">
          <dt>Bands</dt>
          <dd>{info.bands ?? "—"}</dd>

          <dt>Size</dt>
          <dd>
            {info.width && info.height
              ? `${info.width} × ${info.height} px`
              : "—"}
          </dd>

          <dt>CRS</dt>
          <dd>{info.crs ?? "—"}</dd>

          <dt>On disk</dt>
          <dd>{info.size_mb !== undefined ? `${info.size_mb} MB` : "—"}</dd>

          <dt>Footprint</dt>
          <dd>
            {upload.bounds
              ? upload.bounds.map((value) => value.toFixed(4)).join(", ")
              : info.bounds
                ? info.bounds.map((value) => Math.round(value)).join(", ")
                : "—"}
          </dd>
        </dl>

        {!upload.bounds && (
          <p className="inline-error">
            The bounds are reported in {info.crs ?? "the file's own CRS"},
            not longitude/latitude, so the footprint cannot be drawn on the
            map. The analysis itself is unaffected — it runs against the
            uploaded pixels.
          </p>
        )}

        <button type="button" className="ghost-btn" onClick={clear}>
          Use a different file
        </button>
      </div>
    );
  }

  return (
    <div className="field-group">
      <label className="drop-area">
        <span className="drop-glyph" aria-hidden="true">
          ↑
        </span>
        <span style={{ minWidth: 0 }}>
          <strong>{file ? file.name : "Choose a GeoTIFF"}</strong>
          <span className="drop-note">
            {file
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB — ready to upload`
              : `.tif or .tiff, up to ${MAX_UPLOAD_MB} MB`}
          </span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".tif,.tiff,image/tiff"
          onChange={pick}
          hidden
        />
      </label>

      <button
        type="button"
        className="run-btn"
        onClick={send}
        disabled={!file || busy}
      >
        {busy ? "Uploading…" : "Upload GeoTIFF"}
      </button>

      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
