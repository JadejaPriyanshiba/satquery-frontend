/**
 * The live trace — what the backend is doing, while it does it.
 *
 * Every stage here is one of `run_job()`'s own recorded steps, and a
 * stage only turns green because the audit trace says that step ran.
 * When a step carries numbers worth seeing (the routing score table,
 * the agreement metric, the confidence split) the stage shows them
 * inline rather than deferring everything to a JSON dump.
 */

import {
  BarChart,
  DurationChart,
  Figure,
  Meter,
  StackedBar,
  StatRow,
  StatTile,
} from "../viz/charts";
import { confidenceTone } from "../viz/scales";
import {
  PIPELINE,
  formatDuration,
  pipelineStates,
} from "../services/jobModel";
import { PRECEDENCE, TASK_CATALOG } from "../services/taskRouter";

const STATE_WORD = {
  done: "Done",
  active: "Running",
  failed: "Failed",
  pending: "Pending",
};

/** Router score table as an emphasis bar chart: one row is the winner. */
export function RouteChart({ scores, task, matchedTerms }) {
  const items = PRECEDENCE.map((key) => ({
    key,
    name: TASK_CATALOG[key].label,
    value: scores?.[key] ?? 0,
  }));

  const max = Math.max(3, ...items.map((item) => item.value));

  return (
    <Figure
      columns={["Specialist", "Score"]}
      rows={items.map((item) => [
        item.key === task ? `${item.name} (chosen)` : item.name,
        item.value,
      ])}
    >
      <BarChart items={items} winnerKey={task} max={max} unit=" pts" />

      {matchedTerms?.length > 0 && (
        <div className="chip-row" style={{ marginTop: 10 }}>
          {matchedTerms.map((term) => (
            <span className="chip is-static" key={term}>
              {term}
            </span>
          ))}
        </div>
      )}
    </Figure>
  );
}

/**
 * The scenes the routed task pulled in.
 *
 * The trace scrubs server paths before serving them (BE-A10), so the
 * recorded value is usually the literal `<path>`. The useful information
 * is therefore the *role* each scene plays — earlier, later, radar — and
 * that is what this shows; the scrubbed value is kept alongside only
 * when it says something.
 */
function SceneStrip({ scenes }) {
  const entries = Object.entries(scenes ?? {});

  if (entries.length === 0) return null;

  const kindOf = (key) => {
    if (key.startsWith("sar_")) {
      return { label: "SAR", color: "var(--series-2)" };
    }
    if (key.includes("_pre")) {
      return { label: "Earlier", color: "var(--series-1)" };
    }
    if (key.includes("_post")) {
      return { label: "Later", color: "var(--series-3)" };
    }
    return { label: "Scene", color: "var(--series-1)" };
  };

  const scrubbed = (value) => String(value) === "<path>";

  return (
    <div className="scene-strip">
      {entries.map(([key, path]) => {
        const kind = kindOf(key);

        return (
          <div className="scene-item" key={key}>
            <span
              className="scene-kind"
              style={{ background: kind.color }}
            >
              {kind.label}
            </span>
            <span className="scene-name">
              {key}
              {scrubbed(path) ? "" : ` — ${path}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StageDetail({ id, trace }) {
  if (id === "route" && trace.routeScores) {
    return (
      <div className="stage-detail">
        <RouteChart
          scores={trace.routeScores}
          task={trace.task}
          matchedTerms={trace.matchedTerms}
        />
      </div>
    );
  }

  if (id === "ingest" && trace.scenes) {
    return (
      <div className="stage-detail">
        <SceneStrip scenes={trace.scenes} />
      </div>
    );
  }

  if (id === "tool_call" && trace.primary) {
    return (
      <div className="stage-detail">
        <div className="compare">
          <div className="compare-col">
            <div className="compare-role">Primary</div>
            <div className="compare-tool">{trace.primary.tool}</div>
            <div className="compare-meta">
              {trace.primary.backend ?? "backend not recorded"}
              {trace.primary.model ? ` · ${trace.primary.model}` : ""}
            </div>

            {trace.primary.certainty !== null && (
              <div className="compare-meter">
                <Meter
                  name="Certainty"
                  value={trace.primary.certainty}
                  max={1}
                  readout={trace.primary.certainty.toFixed(2)}
                  color="var(--series-1)"
                />
              </div>
            )}
          </div>

          <div className="compare-col">
            <div className="compare-role">Independent check</div>
            <div className="compare-tool">
              {trace.check?.tool ?? "Not run"}
            </div>
            <div className="compare-meta">
              {trace.check
                ? trace.check.method ?? "method not recorded"
                : trace.verifySkipReason ?? "no legitimate cross-check"}
            </div>

            {trace.check?.certainty !== null &&
              trace.check?.certainty !== undefined && (
                <div className="compare-meter">
                  <Meter
                    name="Certainty"
                    value={trace.check.certainty}
                    max={1}
                    readout={trace.check.certainty.toFixed(2)}
                    color="var(--series-2)"
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  if (id === "verify") {
    if (trace.agreement === null) {
      return (
        <div className="stage-detail">
          <p className="audit-summary">
            {trace.verifySummary ??
              "Skipped — the answer is reported unverified rather than " +
                "given a fabricated score."}
          </p>
        </div>
      );
    }

    return (
      <div className="stage-detail">
        <Meter
          name={trace.agreementMetric ?? "Agreement"}
          value={trace.agreement}
          max={1}
          readout={trace.agreement.toFixed(3)}
          color="var(--seq-450)"
          scale={["0", "0.5", "1"]}
        />
      </div>
    );
  }

  if (id === "confidence" && trace.confidenceValue !== null) {
    return (
      <div className="stage-detail">
        <ConfidenceSplit trace={trace} />
      </div>
    );
  }

  return null;
}

/**
 * Where the confidence number came from.
 *
 * ADR-000 blends 70% agreement with 30% tool certainty. Splitting the
 * bar into those two contributions is the whole point: a reader can see
 * at a glance whether a score is carried by the cross-check or by the
 * tool talking about itself.
 */
export function ConfidenceSplit({ trace }) {
  const agreement = trace.confidenceAgreement;
  const certainty = trace.toolCertainty;

  if (agreement === null && certainty === null) return null;

  const segments = [
    {
      key: "agreement",
      name: "Agreement × 0.7",
      value: (agreement ?? 0) * 70,
      color: "var(--series-1)",
    },
    {
      key: "certainty",
      name: "Tool certainty × 0.3",
      value: (certainty ?? 0) * 30,
      color: "var(--series-2)",
    },
  ];

  return (
    <>
      <StackedBar
        segments={segments}
        total={100}
        remainderLabel="Not earned"
      />

      <p className="audit-summary" style={{ marginTop: 9 }}>
        {trace.confidenceFormula ??
          "round(0.7 × agreement×100 + 0.3 × certainty×100)"}
      </p>
    </>
  );
}

export default function TraceView({ trace, jobStatus, elapsedMs }) {
  const stages = pipelineStates(trace, jobStatus);
  const hasTrace = Boolean(trace?.hasTrace);

  const durations = (trace?.durations ?? []).filter(
    (row) => row.ms !== null
  );

  const tone = confidenceTone(
    trace?.verified ? trace.confidenceValue : null
  );

  return (
    <>
      {hasTrace && (
        <StatRow>
          <StatTile
            label="Routed to"
            value={
              trace.task ? TASK_CATALOG[trace.task]?.short ?? trace.task : "—"
            }
            note={trace.task ? TASK_CATALOG[trace.task]?.label : undefined}
          />

          <StatTile
            label="Scenes"
            value={trace.sceneCount ?? "—"}
            note={trace.source === "upload" ? "from upload" : "from AOI"}
          />

          <StatTile
            label="Steps"
            value={trace.events.length}
            note="recorded"
          />

          <StatTile
            label="Elapsed"
            value={formatDuration(trace.totalMs ?? elapsedMs)}
            note={jobStatus === "running" ? "still running" : "wall clock"}
          />
        </StatRow>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Pipeline</h3>
          <span className="card-sub">
            {hasTrace ? "from the audit trace" : "not started"}
          </span>
        </div>

        <div className="pipeline">
          {stages.map((stage, index) => (
            <div className={`stage is-${stage.state}`} key={stage.id}>
              <div className="stage-rail">
                <span className="stage-node">
                  {stage.state === "done"
                    ? "✓"
                    : stage.state === "failed"
                      ? "!"
                      : index + 1}
                </span>
                {index < PIPELINE.length - 1 && (
                  <span className="stage-line" aria-hidden="true" />
                )}
              </div>

              <div className="stage-body">
                <div className="stage-title">
                  <strong>{stage.title}</strong>
                  <span className="stage-state">
                    {STATE_WORD[stage.state]}
                  </span>
                </div>

                <p className="stage-desc">{stage.desc}</p>

                {hasTrace && stage.state === "done" && (
                  <StageDetail id={stage.id} trace={trace} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {trace?.confidenceValue !== null &&
        trace?.confidenceValue !== undefined && (
          <div className="card">
            <div className="card-head">
              <h3>Confidence, decomposed</h3>
              <span className="card-sub">
                {trace.confidenceValue} / 100 · {tone.label}
              </span>
            </div>
            <ConfidenceSplit trace={trace} />
          </div>
        )}

      {durations.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3>Where the time went</h3>
            <span className="card-sub">
              gap to the next recorded step
            </span>
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

          <p className="field-hint" style={{ marginTop: 9, lineHeight: 1.5 }}>
            Each step is timestamped when it starts, so the last one has
            nothing after it to measure against and is left out.
          </p>
        </div>
      )}

      {!hasTrace && (
        <div className="empty">
          <span className="empty-glyph" aria-hidden="true">
            ◌
          </span>
          <strong>Nothing recorded yet</strong>
          <p>
            Every step the backend takes is timestamped and appears here
            as it happens.
          </p>
        </div>
      )}
    </>
  );
}
