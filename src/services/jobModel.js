/**
 * Reading the audit trace as structured facts.
 *
 * `GET /jobs/{id}/audit` returns a flat list of
 * `{step, timestamp, params, output_summary}` events (ADR-004). Every
 * step-specific detail lives in `params`, which is why the old UI could
 * only dump it as JSON. This module knows what each step puts there, so
 * the views above it can draw charts instead of `<pre>` blocks.
 *
 * It reads; it never invents. A field the backend did not record comes
 * back `null` and the view says so, rather than showing a plausible
 * number nothing measured.
 */

import { TASK_CATALOG } from "./taskRouter";

/** Human copy for each `failed` event `reason` code from `run_job()`. */
export const FAILURE_REASONS = {
  no_tool: {
    title: "No specialist for this task yet",
    hint:
      "The query routed correctly, but the tool that would answer it is " +
      "not built. Rewording toward a different task type is the way " +
      "around it — the backend will not silently substitute another tool.",
  },
  no_imagery: {
    title: "Imagery could not be acquired",
    hint:
      "The AOI or dates returned no scene. Check that Sentinel Hub " +
      "credentials are configured, or pick one of the demo areas and a " +
      "date with usable coverage.",
  },
  tool_failed: {
    title: "The analysis tool rejected the request",
    hint:
      "Usually the inputs do not match what the routed task needs — for " +
      "example two dates for a change comparison, or an AOI where an " +
      "upload was supplied.",
  },
  crashed: {
    title: "Internal error",
    hint:
      "The tool raised an unexpected exception. The backend log has the " +
      "traceback; the job was failed rather than left hanging.",
  },
};

/** Glyph per audit step, so the trace scans by shape as well as by name. */
export const STEP_GLYPHS = {
  route: "⇥",
  ingest: "▤",
  tool_call: "⚙",
  verify: "⚖",
  confidence: "◉",
  evidence: "◈",
  failed: "!",
};

const num = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Fold the event list into the facts the views need.
 *
 * Two `tool_call` events can appear — the primary and the independent
 * check — told apart by `params.role`, which is exactly what ADR-003
 * records them for.
 */
export function readTrace(auditTrace) {
  const events = auditTrace?.events ?? [];

  const first = (step) => events.find((event) => event.step === step) ?? null;

  const route = first("route");
  const ingest = first("ingest");
  const verify = first("verify");
  const confidence = first("confidence");
  const evidence = first("evidence");
  const failed = first("failed");

  const toolCalls = events.filter((event) => event.step === "tool_call");
  const primary =
    toolCalls.find((event) => event.params?.role === "primary") ??
    toolCalls[0] ??
    null;
  const check =
    toolCalls.find((event) => event.params?.role === "independent_check") ??
    null;

  const scores = route?.params?.scores ?? null;

  const scenes = ingest?.params?.scenes ?? null;

  return {
    events,
    hasTrace: events.length > 0,

    task: route?.params?.task ?? null,
    routeReason: route?.output_summary ?? null,
    routeScores: scores,
    matchedTerms: route?.params?.matched_terms ?? [],

    source: ingest?.params?.source ?? null,
    bbox: ingest?.params?.bbox ?? null,
    dates: ingest?.params?.dates ?? null,
    scenes,
    sceneCount: scenes ? Object.keys(scenes).length : null,

    primary: primary
      ? {
          tool: primary.params?.tool ?? null,
          backend: primary.params?.backend ?? null,
          model: primary.params?.model ?? null,
          adapter: primary.params?.adapter ?? null,
          modelType: primary.params?.model_type ?? null,
          certainty: num(primary.params?.certainty),
          answer: primary.output_summary ?? "",
        }
      : null,

    check: check
      ? {
          tool: check.params?.tool ?? null,
          backend: check.params?.backend ?? null,
          model: check.params?.model ?? null,
          adapter: check.params?.adapter ?? null,
          modelType: check.params?.model_type ?? null,
          method: check.params?.method ?? null,
          certainty: num(check.params?.certainty),
          answer: check.output_summary ?? "",
        }
      : null,

    verified: verify?.params?.verified === true,
    verifySkipReason: verify?.params?.reason ?? null,
    agreement: num(verify?.params?.agreement_score),
    agreementMetric: verify?.params?.metric ?? null,
    verifySummary: verify?.output_summary ?? null,

    confidenceValue: num(confidence?.params?.value),
    confidenceAgreement: num(confidence?.params?.agreement),
    toolCertainty: num(confidence?.params?.tool_certainty),
    confidenceFormula: confidence?.params?.formula ?? null,
    confidenceCaveat: confidence?.output_summary ?? null,

    evidenceType: evidence?.params?.type ?? null,
    evidenceUrl: evidence?.params?.url ?? null,
    evidenceSummary: evidence?.output_summary ?? null,

    failure: failed
      ? {
          reason: failed.params?.reason ?? null,
          message: failed.output_summary ?? "",
          ...(FAILURE_REASONS[failed.params?.reason] ?? {}),
        }
      : null,

    durations: stageDurations(events),
    totalMs: elapsedMs(events),
  };
}

/**
 * How long each step took, measured as the gap to the next event.
 *
 * The backend timestamps the *start* of each recorded step, so the last
 * event has no successor to measure against and is reported as null
 * rather than as zero.
 */
export function stageDurations(events) {
  return events.map((event, index) => {
    const next = events[index + 1];

    const start = Date.parse(event.timestamp);
    const end = next ? Date.parse(next.timestamp) : NaN;

    const ms =
      Number.isFinite(start) && Number.isFinite(end)
        ? Math.max(0, end - start)
        : null;

    return { step: event.step, index, ms };
  });
}

/** Wall-clock span of the whole trace, or null if it cannot be measured. */
export function elapsedMs(events) {
  if (!events || events.length < 2) return null;

  const start = Date.parse(events[0].timestamp);
  const end = Date.parse(events[events.length - 1].timestamp);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return Math.max(0, end - start);
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatClock(ms) {
  const total = Math.floor((ms ?? 0) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ *
 * Geometry helpers — exact arithmetic on the bbox, no estimates.
 * ------------------------------------------------------------------ */

const METRES_PER_DEG_LAT = 110574;
const METRES_PER_DEG_LON = 111320;

/** Ground extent of a `[minLon, minLat, maxLon, maxLat]` bbox. */
export function bboxExtent(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);

  const widthKm =
    ((maxLon - minLon) * METRES_PER_DEG_LON * Math.cos(midLat)) / 1000;
  const heightKm = ((maxLat - minLat) * METRES_PER_DEG_LAT) / 1000;

  return {
    widthKm,
    heightKm,
    areaKm2: Math.abs(widthKm * heightKm),
  };
}

/** A bbox that is usable as lon/lat: four finite, ordered, in-range values. */
function asLonLat(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  if (!bbox.every((value) => Number.isFinite(value))) return null;

  const [minLon, minLat, maxLon, maxLat] = bbox;

  const inRange =
    Math.abs(minLon) <= 180 &&
    Math.abs(maxLon) <= 180 &&
    Math.abs(minLat) <= 90 &&
    Math.abs(maxLat) <= 90;

  const ordered = minLon < maxLon && minLat < maxLat;

  return inRange && ordered ? bbox : null;
}

/**
 * An uploaded raster's footprint in lon/lat, or null if it cannot be placed.
 *
 * `info.bounds` is in the file's **own** CRS — metres for a UTM scene,
 * which drawn as degrees would land the footprint in the Gulf of Guinea.
 * The backend therefore also reports `info.bounds_wgs84`, reprojected
 * with rasterio (ADR-010), and that is what gets used.
 *
 * Against an older backend that predates that field, native bounds are
 * trusted only when the file declares a geographic CRS — a range check
 * alone is not enough, since a small projected raster can have
 * coordinates that happen to fall inside ±180/±90.
 */
export function geographicBounds(info) {
  if (!info) return null;

  if ("bounds_wgs84" in info) {
    return asLonLat(info.bounds_wgs84);
  }

  const geographic = /^(EPSG:4326|OGC:CRS84)$/i.test(info.crs ?? "");
  return geographic ? asLonLat(info.bounds) : null;
}

export function formatBbox(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return "—";
  return bbox.map((value) => value.toFixed(4)).join(", ");
}

export function formatLatLng(lat, lng) {
  if (lat === null || lng === null) return "—";
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns}  ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

/* ------------------------------------------------------------------ *
 * Pipeline model — the visual trace on the right of the console.
 * ------------------------------------------------------------------ */

/**
 * The stages `run_job()` actually walks, in order.
 *
 * These are the backend's own step names, not a parallel invention, so a
 * stage lights up because the trace says it ran — not because the UI
 * guessed from a status string.
 */
export const PIPELINE = [
  {
    id: "route",
    title: "Route the query",
    desc: "Score the wording against each specialist and pick one.",
  },
  {
    id: "ingest",
    title: "Acquire imagery",
    desc: "Resolve the scenes the routed task needs.",
  },
  {
    id: "tool_call",
    title: "Run the specialist",
    desc: "Execute the routed tool over those scenes.",
  },
  {
    id: "verify",
    title: "Cross-check",
    desc: "Re-answer independently and measure agreement.",
  },
  {
    id: "confidence",
    title: "Score confidence",
    desc: "Blend agreement with the tool certainty (ADR-000).",
  },
  {
    id: "evidence",
    title: "Publish evidence",
    desc: "Render the overlay the answer points at.",
  },
];

/**
 * Stage states, driven by the trace where there is one and by the job
 * status before the first event arrives.
 */
export function pipelineStates(trace, jobStatus) {
  const seen = new Set((trace?.events ?? []).map((event) => event.step));
  const failedAt = trace?.failure ? failedStage(trace) : null;
  const running = jobStatus === "queued" || jobStatus === "running";

  let activeAssigned = false;

  return PIPELINE.map((stage) => {
    if (failedAt === stage.id) return { ...stage, state: "failed" };
    if (seen.has(stage.id)) return { ...stage, state: "done" };

    if (running && !activeAssigned && !failedAt) {
      activeAssigned = true;
      return { ...stage, state: "active" };
    }

    return { ...stage, state: "pending" };
  });
}

/** Which stage a failure landed on, inferred from what was recorded. */
function failedStage(trace) {
  const reason = trace.failure?.reason;

  if (reason === "no_tool") return "route";
  if (reason === "no_imagery") return "ingest";
  return "tool_call";
}

export function taskMeta(task) {
  return TASK_CATALOG[task] ?? null;
}
