/**
 * The right dock — everything that comes *out* of an analysis, in four
 * tabs: the answer, the live trace, the audit trail, and the report.
 */

import ResultView from "../views/ResultView";
import TraceView from "../views/TraceView";
import AuditView from "../views/AuditView";
import ReportView from "../views/ReportView";
import { formatClock } from "../services/jobModel";

const STATUS_COPY = {
  submitting: {
    tone: "busy",
    glyph: "◐",
    title: "Submitting",
    body: "Handing the request to the backend.",
  },
  queued: {
    tone: "busy",
    glyph: "◔",
    title: "Queued",
    body: "Accepted. Waiting for a worker to pick it up.",
  },
  running: {
    tone: "busy",
    glyph: "◑",
    title: "Running",
    body: "Routing, fetching imagery and cross-checking the answer.",
  },
  done: {
    tone: "good",
    glyph: "✓",
    title: "Done",
    body: "The analysis finished and the trace is complete.",
  },
  failed: {
    tone: "critical",
    glyph: "!",
    title: "Failed",
    body: "The job stopped. The trace records where and why.",
  },
};

export default function ResultsDock({
  tab,
  onTabChange,
  jobStatus,
  elapsedMs,
  result,
  trace,
  error,
  canOverlay,
  overlayOn,
  onOverlayChange,
  overlayOpacity,
  onOpacityChange,
}) {
  const status = jobStatus ? STATUS_COPY[jobStatus] : null;

  const tabs = [
    { id: "result", label: "Answer" },
    { id: "trace", label: "Trace" },
    {
      id: "audit",
      label: "Audit",
      badge: trace?.events?.length || undefined,
    },
    { id: "report", label: "Report" },
  ];

  return (
    <div className="dock-body">
      <div className="tab-bar" role="tablist">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={`tab${tab === entry.id ? " is-active" : ""}`}
            onClick={() => onTabChange(entry.id)}
          >
            {entry.label}
            {entry.badge ? (
              <span className="tab-badge">{entry.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {error && (
        <div className="status-banner tone-critical">
          <span className="status-glyph" aria-hidden="true">
            !
          </span>
          <div>
            <strong>Request failed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {status && (
        <div className={`status-banner tone-${status.tone}`}>
          <span className="status-glyph" aria-hidden="true">
            {status.glyph}
          </span>
          <div>
            <strong>{status.title}</strong>
            <p>{status.body}</p>
          </div>

          {(jobStatus === "queued" ||
            jobStatus === "running" ||
            jobStatus === "submitting") && (
            <span className="elapsed">{formatClock(elapsedMs)}</span>
          )}
        </div>
      )}

      {tab === "result" && (
        <ResultView
          result={result}
          trace={trace}
          canOverlay={canOverlay}
          overlayOn={overlayOn}
          onOverlayChange={onOverlayChange}
          overlayOpacity={overlayOpacity}
          onOpacityChange={onOpacityChange}
        />
      )}

      {tab === "trace" && (
        <TraceView
          trace={trace}
          jobStatus={jobStatus}
          elapsedMs={elapsedMs}
        />
      )}

      {tab === "audit" && <AuditView trace={trace} />}

      {tab === "report" && (
        <ReportView
          key={result?.job_id ?? "no-job"}
          result={result}
          trace={trace}
        />
      )}
    </div>
  );
}
