/**
 * The audit trail, as something you can read.
 *
 * The trace is the system's whole claim to being interrogable: "how did
 * you get 87?" should be answerable from this panel. It used to be a
 * stack of `JSON.stringify(params)` blocks, which is technically the
 * same information and practically unreadable. Each step now renders
 * what it actually recorded — the score table as bars, agreement as a
 * meter, the confidence split as a stack — with the raw params still one
 * click away, because a judge who wants the JSON should get the JSON.
 */

import { useState } from "react";

import {
  BarChart,
  DurationChart,
  Figure,
  Meter,
  StatRow,
  StatTile,
} from "../viz/charts";
import {
  STEP_GLYPHS,
  formatDuration,
  formatBbox,
} from "../services/jobModel";
import { PRECEDENCE, TASK_CATALOG } from "../services/taskRouter";
import { ConfidenceSplit } from "./TraceView";

function timeOf(timestamp) {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return "—";

  return new Date(parsed).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Params rendered as a table; objects and arrays fall back to JSON. */
function ParamTable({ params }) {
  const entries = Object.entries(params ?? {});

  if (entries.length === 0) {
    return <p className="audit-summary">No parameters recorded.</p>;
  }

  return (
    <table className="viz-table">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <td>{key}</td>
            <td style={{ overflowWrap: "anywhere" }}>
              {value === null || value === undefined
                ? "—"
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The step-specific picture, or null where the step recorded nothing
 * worth drawing.
 *
 * A plain function rather than a component on purpose: `<EventVisual/>`
 * is a truthy element even when it renders nothing, which would leave
 * the "Chart" toggle offering an empty view.
 */
function eventVisual(event, trace) {
  const params = event.params ?? {};

  if (event.step === "route" && params.scores) {
    const items = PRECEDENCE.map((task) => ({
      key: task,
      name: TASK_CATALOG[task]?.label ?? task,
      value: params.scores[task] ?? 0,
    }));

    return (
      <BarChart
        items={items}
        winnerKey={params.task}
        max={Math.max(3, ...items.map((item) => item.value))}
        unit=" pts"
      />
    );
  }

  if (event.step === "ingest") {
    return (
      <dl className="kv">
        <dt>Source</dt>
        <dd>{params.source === "upload" ? "Uploaded raster" : "Drawn AOI"}</dd>

        <dt>Bounds</dt>
        <dd>{params.bbox ? formatBbox(params.bbox) : "—"}</dd>

        <dt>Dates</dt>
        <dd>{params.dates?.join(" → ") ?? "—"}</dd>

        <dt>Scenes</dt>
        <dd>{params.scenes ? Object.keys(params.scenes).length : 0}</dd>
      </dl>
    );
  }

  if (event.step === "tool_call") {
    const certainty =
      typeof params.certainty === "number" ? params.certainty : null;

    return (
      <>
        <dl className="kv">
          <dt>Tool</dt>
          <dd>{params.tool ?? "—"}</dd>

          <dt>Role</dt>
          <dd>
            {params.role === "independent_check"
              ? "Independent check"
              : "Primary"}
          </dd>

          <dt>Backend</dt>
          <dd>{params.backend ?? "not recorded"}</dd>

          {params.model && (
            <>
              <dt>Model</dt>
              <dd>{params.model}</dd>
            </>
          )}

          {params.method && (
            <>
              <dt>Method</dt>
              <dd>{params.method}</dd>
            </>
          )}
        </dl>

        {certainty !== null && (
          <div style={{ marginTop: 10 }}>
            <Meter
              name="Reported certainty"
              value={certainty}
              max={1}
              readout={certainty.toFixed(2)}
              color={
                params.role === "independent_check"
                  ? "var(--series-2)"
                  : "var(--series-1)"
              }
              scale={["0", "0.5", "1"]}
            />
          </div>
        )}
      </>
    );
  }

  if (event.step === "verify") {
    if (typeof params.agreement_score !== "number") return null;

    return (
      <Meter
        name={params.metric ?? "Agreement"}
        value={params.agreement_score}
        max={1}
        readout={params.agreement_score.toFixed(3)}
        color="var(--seq-450)"
        scale={["0", "0.5", "1"]}
      />
    );
  }

  if (event.step === "confidence") {
    return <ConfidenceSplit trace={trace} />;
  }

  if (event.step === "evidence" && params.type && params.type !== "none") {
    return (
      <dl className="kv">
        <dt>Type</dt>
        <dd>{params.type}</dd>
        <dt>Artifact</dt>
        <dd>{params.url ?? "—"}</dd>
      </dl>
    );
  }

  return null;
}

function AuditCard({ event, trace, duration }) {
  const visual = eventVisual(event, trace);

  // A step with nothing to draw opens on its parameters rather than on
  // an empty panel.
  const [mode, setMode] = useState(visual ? "visual" : "params");

  return (
    <article className="audit-card">
      <header className="audit-card-head">
        <span className="audit-step-glyph" aria-hidden="true">
          {STEP_GLYPHS[event.step] ?? "•"}
        </span>

        <span className="audit-step-name">
          {event.step.replace(/_/g, " ")}
        </span>

        <span className="audit-step-time">
          {timeOf(event.timestamp)}
          {duration !== null && duration !== undefined
            ? ` · ${formatDuration(duration)}`
            : ""}
        </span>
      </header>

      <div className="audit-card-body">
        {event.output_summary && (
          <p className="audit-summary">{event.output_summary}</p>
        )}

        {mode === "visual" && visual}

        {mode === "params" && <ParamTable params={event.params} />}

        {mode === "raw" && (
          <pre className="raw-json">
            {JSON.stringify(event, null, 2)}
          </pre>
        )}

        <div className="chip-row">
          {visual && (
            <button
              type="button"
              className={`chip${mode === "visual" ? " is-active" : ""}`}
              onClick={() => setMode("visual")}
              style={
                mode === "visual"
                  ? { borderColor: "var(--accent)", color: "var(--ink-1)" }
                  : undefined
              }
            >
              Chart
            </button>
          )}

          <button
            type="button"
            className="chip"
            onClick={() => setMode("params")}
            style={
              mode === "params"
                ? { borderColor: "var(--accent)", color: "var(--ink-1)" }
                : undefined
            }
          >
            Parameters
          </button>

          <button
            type="button"
            className="chip"
            onClick={() => setMode("raw")}
            style={
              mode === "raw"
                ? { borderColor: "var(--accent)", color: "var(--ink-1)" }
                : undefined
            }
          >
            Raw JSON
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AuditView({ trace }) {
  if (!trace?.hasTrace) {
    return (
      <div className="empty">
        <span className="empty-glyph" aria-hidden="true">
          ◌
        </span>
        <strong>No audit trail yet</strong>
        <p>
          Once a job finishes, every step it took — with the parameters it
          took them under — is recorded here.
        </p>
      </div>
    );
  }

  const durations = trace.durations.filter((row) => row.ms !== null);

  const stepCounts = trace.events.reduce((counts, event) => {
    counts[event.step] = (counts[event.step] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <>
      <StatRow>
        <StatTile label="Events" value={trace.events.length} note="recorded" />
        <StatTile
          label="Tool calls"
          value={stepCounts.tool_call ?? 0}
          note={trace.check ? "primary + check" : "primary only"}
        />
        <StatTile
          label="Total time"
          value={formatDuration(trace.totalMs)}
          note="first to last event"
        />
      </StatRow>

      {durations.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3>Step durations</h3>
            <span className="card-sub">measured from the timestamps</span>
          </div>

          <Figure
            columns={["Step", "Duration"]}
            rows={durations.map((row) => [
              `${row.index + 1}. ${row.step}`,
              formatDuration(row.ms),
            ])}
          >
            <DurationChart rows={durations} format={formatDuration} />
          </Figure>
        </div>
      )}

      <div className="audit-list">
        {trace.events.map((event, index) => (
          <AuditCard
            key={`${event.step}-${event.timestamp}-${index}`}
            event={event}
            trace={trace}
            duration={trace.durations[index]?.ms}
          />
        ))}
      </div>
    </>
  );
}
