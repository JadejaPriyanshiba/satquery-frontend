/**
 * The takeaway artifact.
 *
 * The backend already builds an authoritative report — request, result,
 * the ADR-000 methodology with its caveat, and the scrubbed audit trace
 * — and renders the same content as a PDF. The old UI ignored that
 * endpoint and hand-assembled a thinner JSON blob in the browser, which
 * could disagree with the server's version and carried no methodology at
 * all. This panel serves the real thing.
 */

import { useEffect, useState } from "react";

import { downloadJobReport, getJobReport } from "../services/api";
import { Gauge, StatRow, StatTile } from "../viz/charts";
import { confidenceTone } from "../viz/scales";
import { formatBbox, formatDuration } from "../services/jobModel";
import { TASK_CATALOG } from "../services/taskRouter";
import { ConfidenceSplit, RouteChart } from "./TraceView";

export default function ReportView({ result, trace }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const jobId = result?.job_id;
  const terminal =
    result?.status === "done" || result?.status === "failed";

  // Mounted fresh per job (ResultsDock keys this component on the job
  // id), so there is nothing to clear here — the effect only fetches,
  // and only once the job can actually produce a report.
  useEffect(() => {
    if (!jobId || !terminal) return undefined;

    let cancelled = false;

    getJobReport(jobId)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setError("");
      })
      .catch((reportError) => {
        if (!cancelled) setError(reportError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, terminal]);

  if (!result) {
    return (
      <div className="empty">
        <span className="empty-glyph" aria-hidden="true">
          ◌
        </span>
        <strong>No report yet</strong>
        <p>
          A report can only be produced once a job has finished — a
          snapshot of a running job would be presented as a record.
        </p>
      </div>
    );
  }

  const download = async (format) => {
    try {
      setBusy(format);
      setError("");
      await downloadJobReport(jobId, format);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setBusy(null);
    }
  };

  const tone = confidenceTone(result.verified ? result.confidence : null);
  const taskMeta = trace?.task ? TASK_CATALOG[trace.task] : null;

  return (
    <>
      <StatRow>
        <StatTile
          label="Status"
          value={result.status}
          tone={result.status === "done" ? "good" : "critical"}
          glyph={result.status === "done" ? "✓" : "!"}
        />
        <StatTile
          label="Confidence"
          value={result.verified ? result.confidence : 0}
          unit="/100"
          note={result.verified ? tone.label : "unverified"}
        />
        <StatTile
          label="Task"
          value={taskMeta?.short ?? "—"}
          note={taskMeta?.label}
        />
        <StatTile
          label="Runtime"
          value={formatDuration(trace?.totalMs)}
          note="recorded steps"
        />
      </StatRow>

      {result.status === "done" && (
        <div className="card">
          <Gauge
            value={result.confidence ?? 0}
            max={100}
            color={tone.color}
            label={`${tone.label} confidence`}
            caption={
              trace?.confidenceCaveat ??
              "An agreement heuristic, not a probability."
            }
          />
        </div>
      )}

      {trace?.confidenceValue !== null &&
        trace?.confidenceValue !== undefined && (
          <div className="card">
            <div className="card-head">
              <h3>How the score was reached</h3>
              <span className="card-sub">ADR-000</span>
            </div>
            <ConfidenceSplit trace={trace} />
          </div>
        )}

      {trace?.routeScores && (
        <div className="card">
          <div className="card-head">
            <h3>Why this specialist</h3>
            <span className="card-sub">deterministic keyword routing</span>
          </div>

          <RouteChart
            scores={trace.routeScores}
            task={trace.task}
            matchedTerms={trace.matchedTerms}
          />

          {trace.routeReason && (
            <p className="audit-summary" style={{ marginTop: 10 }}>
              {trace.routeReason}
            </p>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Request on record</h3>
          <span className="card-sub">{jobId}</span>
        </div>

        <dl className="kv">
          <dt>Query</dt>
          <dd>{report?.request?.query ?? "—"}</dd>

          <dt>Imagery</dt>
          <dd>
            {report?.request?.image_source === "upload"
              ? "Uploaded raster"
              : "Fetched for the AOI"}
          </dd>

          <dt>AOI</dt>
          <dd>
            {report?.request?.aoi?.bbox
              ? formatBbox(report.request.aoi.bbox)
              : "—"}
          </dd>

          <dt>Dates</dt>
          <dd>{report?.request?.dates?.join(" → ") ?? "—"}</dd>

          <dt>Generated</dt>
          <dd>
            {report?.generated_at
              ? new Date(report.generated_at).toLocaleString()
              : "—"}
          </dd>
        </dl>
      </div>

      {report?.methodology && (
        <div className="card">
          <div className="card-head">
            <h3>Methodology</h3>
            <span className="card-sub">travels with the number</span>
          </div>

          <dl className="kv">
            <dt>Formula</dt>
            <dd>{report.methodology.confidence_formula}</dd>

            <dt>Reference</dt>
            <dd>{report.methodology.reference}</dd>
          </dl>

          <p
            className="audit-summary"
            style={{ marginTop: 10, lineHeight: 1.55 }}
          >
            {report.methodology.caveat}
          </p>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Download</h3>
          <span className="card-sub">served by the backend</span>
        </div>

        <p className="field-hint" style={{ marginBottom: 10, lineHeight: 1.5 }}>
          The JSON is the authoritative artifact; the PDF renders exactly
          the same content for a reader. Both carry the request, the
          result, the methodology and the full audit trace.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => download("json")}
            disabled={!terminal || busy !== null}
          >
            {busy === "json" ? "Preparing…" : "↓ JSON"}
          </button>

          <button
            type="button"
            className="ghost-btn"
            onClick={() => download("pdf")}
            disabled={!terminal || busy !== null}
          >
            {busy === "pdf" ? "Preparing…" : "↓ PDF"}
          </button>
        </div>

        {!terminal && (
          <p className="field-hint" style={{ marginTop: 9 }}>
            Available once the job reaches a terminal state.
          </p>
        )}

        {error && (
          <p className="inline-error" style={{ marginTop: 9 }}>
            {error}
          </p>
        )}
      </div>
    </>
  );
}
