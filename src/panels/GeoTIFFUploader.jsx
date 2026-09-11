/**
 * GeoTIFF upload.
 *
 * `POST /upload` answers with `{ image_ref, info }`. `info.bounds` is in
 * the file's own CRS (metres for a UTM scene); `info.bounds_wgs84` is the
 * same extent reprojected to lon/lat by the backend (ADR-010), and is
 * what places the footprint on the map. `geographicBounds()` picks the
 * right one.
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
    const projected =
      Boolean(info.crs) && !/^(EPSG:4326|OGC:CRS84)$/i.test(info.crs);

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
              : "—"}
          </dd>

          {projected && info.bounds && (
            <>
              <dt>Native extent</dt>
              <dd>
                {info.bounds.map((value) => Math.round(value)).join(", ")}
              </dd>
            </>
          )}
        </dl>

        {projected && upload.bounds && (
          <p className="field-hint" style={{ lineHeight: 1.5 }}>
            {info.crs} is a projected CRS, so its native extent is in
            metres. The footprint above has been reprojected to
            longitude/latitude for the map.
          </p>
        )}

        {!upload.bounds && (
          <p className="inline-error">
            {info.crs
              ? `This raster's extent could not be converted from ${info.crs} ` +
                "to longitude/latitude, so its footprint cannot be drawn."
              : "This raster carries no coordinate reference system, so " +
                "there is no way to know where on Earth it is."}{" "}
            The analysis still runs against the uploaded pixels — only the
            map placement is missing.
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
