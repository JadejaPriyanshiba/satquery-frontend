/**
 * HTTP client for the SatQuery backend.
 *
 * One function per documented endpoint in `app/main.py` / `app/api/`.
 * Every response shape here is the wire contract from
 * `app/models/schemas.py` — if a field is missing from a response,
 * treat it as a backend change, not as something to paper over.
 */

export const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/** Turn a FastAPI error body into a single readable message. */
function messageFrom(data, response) {
  const detail = data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  // 422 bodies are a list of {loc, msg, type} — flatten them so the user
  // sees which field the backend rejected, not "[object Object]".
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const where = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== "body").join(".")
          : "";
        return where ? `${where}: ${item.msg}` : item.msg;
      })
      .join("; ");
  }

  if (detail) {
    return JSON.stringify(detail);
  }

  return `Request failed (HTTP ${response.status}).`;
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (cause) {
    // fetch only rejects for network-level failures, which for this app
    // almost always means the backend is not running.
    throw new Error(
      `Cannot reach the SatQuery backend at ${API_URL}. ` +
        "Start it with `uvicorn app.main:app --reload` and try again.",
      { cause }
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(messageFrom(data, response));
    error.status = response.status;
    throw error;
  }

  return data;
}

/** `GET /health` — used for the live backend indicator in the top bar. */
export async function getHealth() {
  return request("/health");
}

/**
 * `POST /jobs` — queue an analysis.
 *
 * `aoi` is a bbox array `[minLon, minLat, maxLon, maxLat]`. `imageRef` is
 * the token from `POST /upload`; it is only sent when present, because
 * `AnalysisRequest` forbids extra/null keys it did not ask for.
 */
export async function createJob({ query, aoi, dates, imageRef = null }) {
  const body = { query };

  if (aoi) {
    body.aoi = { bbox: aoi, crs: "EPSG:4326" };
  }

  if (dates && dates.length > 0) {
    body.dates = dates;
  }

  if (imageRef) {
    body.image_ref = imageRef;
  }

  return request("/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** `GET /jobs/{id}` — status plus the result fields (always present). */
export async function getJob(jobId, { signal } = {}) {
  return request(`/jobs/${jobId}`, { signal });
}

/** `GET /jobs/{id}/audit` — `{ job_id, events: AuditEvent[] }`. */
export async function getJobAudit(jobId, { signal } = {}) {
  return request(`/jobs/${jobId}/audit`, { signal });
}

/**
 * `GET /jobs/{id}/report?format=json` — the authoritative report.
 *
 * This is richer than anything the frontend can assemble: it carries the
 * original request, the ADR-000 confidence formula and its caveat, and
 * the scrubbed audit trace.
 */
export async function getJobReport(jobId) {
  return request(`/jobs/${jobId}/report?format=json`);
}

/**
 * `POST /upload` — store a GeoTIFF and get back `{ image_ref, info }`.
 *
 * `info` carries `bounds` as `[minLon, minLat, maxLon, maxLat]` plus the
 * raster profile (bands, width, height, crs, size_mb).
 */
export async function uploadGeoTIFF(file) {
  const formData = new FormData();
  formData.append("file", file);

  return request("/upload", { method: "POST", body: formData });
}

/** Absolute URL for a server-relative artifact path (`/artifacts/...`). */
export function artifactUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

/**
 * Download a report straight from the backend.
 *
 * `format` is "json" or "pdf"; both are rendered from the same
 * `build_report()` output server-side, so they can never disagree with
 * each other the way a client-assembled file could.
 */
export async function downloadJobReport(jobId, format = "json") {
  const response = await fetch(
    `${API_URL}/jobs/${jobId}/report?format=${format}`
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(messageFrom(data, response));
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = href;
  link.download = `satquery-report-${jobId}.${format}`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(href);
}
