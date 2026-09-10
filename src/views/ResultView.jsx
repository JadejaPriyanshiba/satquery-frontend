/**
 * The answer, and the two numbers that qualify it.
 *
 * `confidence` is meaningless without `verified` beside it: an
 * unverified job reports 0 by design (ADR-000), because without an
 * agreement term the formula has no defined value. So the two are shown
 * together, never as one score on its own.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Gauge, StatRow, StatTile } from "../viz/charts";
import { confidenceTone } from "../viz/scales";
import { artifactUrl } from "../services/api";

function EvidenceBlock({
  result,
  trace,
  canOverlay,
  overlayOn,
  onOverlayChange,
  overlayOpacity,
  onOpacityChange,
}) {
  const url = artifactUrl(result.evidence?.url);
  const type = result.evidence?.type ?? "none";

  if (!url) {
    return (
      <div className="card">
        <div className="card-head">
          <h3>Evidence</h3>
          <span className="card-sub">{type}</span>
        </div>
        <p className="field-hint" style={{ lineHeight: 1.5 }}>
          {trace?.evidenceSummary ??
            "This task answers in prose, so there is no overlay to draw. " +
              "An invented one would be worse than none."}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Evidence</h3>
        <span className="card-sub">{type} overlay</span>
      </div>

      <figure className="evidence-figure">
        <img src={url} alt={`${type} overlay produced by the analysis`} />
        <figcaption>
          White marks the region the tool selected; black is unselected.
        </figcaption>
      </figure>

      {canOverlay ? (
        <div style={{ marginTop: 11 }}>
          <label className="overlay-toggle" style={{ padding: 0 }}>
            <input
              type="checkbox"
              checked={overlayOn}
              onChange={(event) => onOverlayChange(event.target.checked)}
            />
            Drape it on the map
          </label>

          {overlayOn && (
            <>
              <div className="meter-head" style={{ marginTop: 8 }}>
                <span className="meter-name">Overlay opacity</span>
                <span className="meter-readout">
                  {Math.round(overlayOpacity * 100)}%
                </span>
              </div>
              <input
                className="slider"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(event) =>
                  onOpacityChange(Number(event.target.value))
                }
                aria-label="Overlay opacity"
              />
            </>
          )}
        </div>
      ) : (
        <p className="field-hint" style={{ marginTop: 9 }}>
          The overlay cannot be placed on the map: this job has no
          georeferenced footprint to pin it to.
        </p>
      )}

      <a
        className="ghost-btn"
        style={{ marginTop: 10, width: "100%" }}
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        Open the full-size artifact ↗
      </a>
    </div>
  );
}

export default function ResultView({
  result,
  trace,
  canOverlay,
  overlayOn,
  onOverlayChange,
  overlayOpacity,
  onOpacityChange,
}) {
  if (!result) {
    return (
      <div className="empty">
        <span className="empty-glyph" aria-hidden="true">
          ◌
        </span>
        <strong>No analysis yet</strong>
        <p>
          Set an area or upload a raster, ask a question, and the answer
          will appear here with the evidence behind it.
        </p>
      </div>
    );
  }

  const failed = result.status === "failed";
  const tone = confidenceTone(result.verified ? result.confidence : null);

  if (failed) {
    const failure = trace?.failure;

    return (
      <>
        <div className="status-banner tone-critical">
          <span className="status-glyph" aria-hidden="true">
            !
          </span>
          <div>
            <strong>{failure?.title ?? "Analysis failed"}</strong>
            <p>{result.error || failure?.message || "No detail recorded."}</p>
          </div>
        </div>

        {failure?.hint && (
          <div className="card">
            <div className="card-head">
              <h3>What to try</h3>
              <span className="card-sub">{failure.reason}</span>
            </div>
            <p className="field-hint" style={{ lineHeight: 1.55 }}>
              {failure.hint}
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="card">
        <Gauge
          value={result.confidence ?? 0}
          max={100}
          color={tone.color}
          label={
            result.verified
              ? `${tone.label} confidence`
              : "Unverified — reported as 0"
          }
          caption={
            result.verified
              ? "Agreement between two independent looks, blended with the " +
                "tool's own certainty. A heuristic, not a probability."
              : "Nothing independent checked this answer, so no agreement " +
                "term exists and the score stays 0 rather than borrowing " +
                "the tool's own certainty."
          }
        />
      </div>

      <StatRow>
        <StatTile
          label="Verification"
          value={result.verified ? "Verified" : "Unverified"}
          tone={result.verified ? "good" : "warning"}
          glyph={result.verified ? "✓" : "!"}
          note={
            trace?.agreementMetric
              ? `by ${trace.agreementMetric}`
              : trace?.verifySkipReason ?? undefined
          }
        />

        <StatTile
          label="Evidence"
          value={result.evidence?.type ?? "none"}
          note={result.evidence?.url ? "Overlay available" : "Prose answer"}
        />

        <StatTile
          label="Job"
          value={result.job_id.slice(0, 8)}
          note={result.status}
        />
      </StatRow>

      <div className="card">
        <div className="card-head">
          <h3>Answer</h3>
          <span className="card-sub">
            {trace?.primary?.tool ?? "analysis"}
          </span>
        </div>

        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {result.answer || "_No answer text was returned._"}
          </ReactMarkdown>
        </div>
      </div>

      <EvidenceBlock
        result={result}
        trace={trace}
        canOverlay={canOverlay}
        overlayOn={overlayOn}
        onOverlayChange={onOverlayChange}
        overlayOpacity={overlayOpacity}
        onOpacityChange={onOpacityChange}
      />
    </>
  );
}
