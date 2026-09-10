/**
 * The left dock — everything that goes *into* an analysis.
 *
 * Three things drive the form, in this order: the data source (AOI or an
 * uploaded raster), the question, and the dates. The question is what
 * actually decides the task, so the panel shows the predicted route
 * live and lets the date fields follow from it, rather than asking the
 * user to pick a mode the backend will then ignore.
 */

import { bboxExtent, formatBbox } from "../services/jobModel";
import { DEMO_AOIS } from "../map/basemaps";
import { PRECEDENCE, TASK_CATALOG } from "../services/taskRouter";
import GeoTIFFUploader from "./GeoTIFFUploader";

/** Matches EARLIEST_IMAGERY / FUTURE_SLACK in `app/core/errors.py`. */
const EARLIEST_DATE = "2014-01-01";

function latestDate() {
  const limit = new Date();
  limit.setDate(limit.getDate() + 7);
  return limit.toISOString().slice(0, 10);
}

function Section({ label, hint, children }) {
  return (
    <section className="field-group">
      <div className="field-label">
        <span>{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export default function ControlDock({
  dataSource,
  onDataSourceChange,
  aoi,
  onZoomToAOI,
  onDemoAOI,
  onClearAOI,
  upload,
  onUploaded,
  onUploadCleared,
  question,
  onQuestionChange,
  prediction,
  dates,
  onDatesChange,
  wantsSecondDate,
  onWantsSecondDateChange,
  onRun,
  onCancel,
  running,
  blockers,
}) {
  const predicted = TASK_CATALOG[prediction.task];
  const needsTwoDates = predicted.scenes >= 2;
  const showSecondDate = needsTwoDates || wantsSecondDate;

  const extent = bboxExtent(aoi);

  return (
    <>
      <div className="dock-body">
        {/* -------------------------------------------------- source */}
        <Section label="Data source" hint="Pick one">
          <div className="option-grid cols-2">
            <button
              type="button"
              className={`option-card${
                dataSource === "satellite" ? " is-selected" : ""
              }`}
              onClick={() => onDataSourceChange("satellite")}
            >
              <span className="option-icon" aria-hidden="true">
                ⌖
              </span>
              <strong>Draw an AOI</strong>
              <span className="option-note">
                Imagery is fetched for the rectangle you draw.
              </span>
            </button>

            <button
              type="button"
              className={`option-card${
                dataSource === "geotiff" ? " is-selected" : ""
              }`}
              onClick={() => onDataSourceChange("geotiff")}
            >
              <span className="option-icon" aria-hidden="true">
                ↑
              </span>
              <strong>Own GeoTIFF</strong>
              <span className="option-note">
                Upload one raster and ask about it.
              </span>
            </button>
          </div>
        </Section>

        {/* ---------------------------------------------------- input */}
        {dataSource === "geotiff" ? (
          <Section
            label="Raster"
            hint={upload ? "Uploaded" : "Required"}
          >
            <GeoTIFFUploader
              upload={upload}
              onUploaded={onUploaded}
              onCleared={onUploadCleared}
            />
          </Section>
        ) : (
          <Section label="Area of interest" hint={aoi ? "Set" : "Required"}>
            {aoi ? (
              <>
                <dl className="kv">
                  <dt>Bounds</dt>
                  <dd>{formatBbox(aoi)}</dd>

                  <dt>Extent</dt>
                  <dd>
                    {extent
                      ? `${extent.widthKm.toFixed(1)} × ` +
                        `${extent.heightKm.toFixed(1)} km`
                      : "—"}
                  </dd>

                  <dt>Area</dt>
                  <dd>{extent ? `${extent.areaKm2.toFixed(1)} km²` : "—"}</dd>
                </dl>

                <div className="chip-row">
                  <button type="button" className="chip" onClick={onZoomToAOI}>
                    Zoom to AOI
                  </button>
                  <button type="button" className="chip" onClick={onClearAOI}>
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <p className="field-hint">
                Use the rectangle tool at the top-left of the map, or start
                from a demo area below.
              </p>
            )}

            <div className="chip-row">
              {DEMO_AOIS.map((demo) => (
                <button
                  key={demo.name}
                  type="button"
                  className="chip"
                  onClick={() => onDemoAOI(demo.bbox)}
                >
                  <span
                    className="chip-dot"
                    style={{ background: "var(--series-1)" }}
                    aria-hidden="true"
                  />
                  {demo.name}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* -------------------------------------------------- question */}
        <Section label="Question" hint={`${question.length}/2000`}>
          <textarea
            className="text-input"
            value={question}
            maxLength={2000}
            placeholder="Ask what you want to know about this ground…"
            onChange={(event) => onQuestionChange(event.target.value)}
          />

          <div className="chip-row">
            {predicted.examples.map((example) => (
              <button
                key={example}
                type="button"
                className="chip"
                onClick={() => onQuestionChange(example)}
                title="Use this wording"
              >
                {example}
              </button>
            ))}
          </div>
        </Section>

        {/* --------------------------------------------- routing hint */}
        <div className="card">
          <div className="card-head">
            <h3>Predicted route</h3>
            <span className="card-sub">
              {prediction.confident ? "Clear match" : "Weak match"}
            </span>
          </div>

          <div className="chip-row" style={{ marginBottom: 8 }}>
            {PRECEDENCE.map((task) => {
              const meta = TASK_CATALOG[task];
              const isWinner = task === prediction.task;

              return (
                <span
                  key={task}
                  className="chip is-static"
                  style={
                    isWinner
                      ? {
                          borderColor: "var(--accent)",
                          background: "var(--accent-wash)",
                          color: "var(--ink-1)",
                          fontWeight: 650,
                        }
                      : undefined
                  }
                >
                  <span aria-hidden="true">{meta.glyph}</span>
                  {meta.label}
                  <span style={{ opacity: 0.7 }}>
                    {prediction.scores[task]}
                  </span>
                </span>
              );
            })}
          </div>

          <p className="field-hint" style={{ lineHeight: 1.5 }}>
            {predicted.blurb} <strong>{predicted.needs}</strong>
          </p>

          <p
            className="field-hint"
            style={{ marginTop: 6, lineHeight: 1.5, opacity: 0.8 }}
          >
            The backend routes on wording alone, so this is what your
            question scores against each specialist right now. The real
            decision appears in the trace once the job runs.
          </p>
        </div>

        {/* ------------------------------------------------------ dates */}
        {dataSource === "satellite" && (
          <Section
            label="Dates"
            hint={needsTwoDates ? "Two required" : "One required"}
          >
            <div className={`date-row${showSecondDate ? "" : " is-single"}`}>
              <input
                type="date"
                className="date-input"
                value={dates[0] ?? ""}
                min={EARLIEST_DATE}
                max={latestDate()}
                onChange={(event) =>
                  onDatesChange([event.target.value, dates[1] ?? ""])
                }
                aria-label={showSecondDate ? "Earlier date" : "Date"}
              />

              {showSecondDate && (
                <input
                  type="date"
                  className="date-input"
                  value={dates[1] ?? ""}
                  min={dates[0] || EARLIEST_DATE}
                  max={latestDate()}
                  onChange={(event) =>
                    onDatesChange([dates[0] ?? "", event.target.value])
                  }
                  aria-label="Later date"
                />
              )}
            </div>

            {!needsTwoDates && (
              <label className="overlay-toggle" style={{ padding: 0 }}>
                <input
                  type="checkbox"
                  checked={wantsSecondDate}
                  onChange={(event) =>
                    onWantsSecondDateChange(event.target.checked)
                  }
                />
                Add a second date
              </label>
            )}

            <p className="field-hint">
              Imagery starts in 2014; a date in the future cannot be
              fetched.
            </p>
          </Section>
        )}

        {dataSource === "geotiff" && (
          <p className="field-hint">
            An uploaded raster is analysed as-is, so no dates are needed.
            Change detection and SAR fusion cannot run on an upload — they
            need two or four co-registered scenes over the same ground.
          </p>
        )}

        {blockers.length > 0 && (
          <ul
            className="inline-error"
            style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}
          >
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="dock-foot">
        {running ? (
          <button type="button" className="run-btn is-cancel" onClick={onCancel}>
            Stop watching this job
          </button>
        ) : (
          <button
            type="button"
            className="run-btn"
            onClick={onRun}
            disabled={blockers.length > 0}
          >
            Run analysis
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </>
  );
}
