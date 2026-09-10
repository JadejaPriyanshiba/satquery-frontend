/**
 * SatQuery AI — application shell.
 *
 * Map-first: the map owns the viewport and every control floats above
 * it. This component holds the state the map and the two docks share,
 * and owns the one asynchronous flow in the app — submit a job, poll it,
 * poll its trace alongside so the pipeline fills in live, and stop on a
 * terminal status.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import MapCanvas from "./map/MapCanvas";
import { bboxToBounds } from "./map/bounds";
import { DEFAULT_BASEMAP } from "./map/basemaps";
import TopBar from "./panels/TopBar";
import ControlDock from "./panels/ControlDock";
import ResultsDock from "./panels/ResultsDock";
import StatusRail from "./panels/StatusRail";

import {
  artifactUrl,
  createJob,
  getHealth,
  getJob,
  getJobAudit,
} from "./services/api";
import { readTrace } from "./services/jobModel";
import { TASK_CATALOG, classify } from "./services/taskRouter";

const POLL_MS = 1500;
const HEALTH_MS = 30000;

const readStored = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const store = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private windows and blocked site data are not errors here. */
  }
};

export default function App() {
  /* ---------------------------------------------------------- chrome */

  const [theme, setTheme] = useState(() =>
    readStored("satquery-theme", "dark")
  );
  const [basemapId, setBasemapId] = useState(() =>
    readStored("satquery-basemap", DEFAULT_BASEMAP)
  );
  const [showLabels, setShowLabels] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [health, setHealth] = useState("checking");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    store("satquery-theme", theme);
  }, [theme]);

  useEffect(() => {
    store("satquery-basemap", basemapId);
  }, [basemapId]);

  useEffect(() => {
    let cancelled = false;

    const ping = () => {
      getHealth()
        .then(() => !cancelled && setHealth("up"))
        .catch(() => !cancelled && setHealth("down"));
    };

    ping();
    const timer = setInterval(ping, HEALTH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  /* ------------------------------------------------------------ input */

  const [dataSource, setDataSource] = useState("satellite");
  const [aoi, setAoi] = useState(null);
  const [upload, setUpload] = useState(null);
  const [question, setQuestion] = useState("");
  const [dates, setDates] = useState(["", ""]);
  const [wantsSecondDate, setWantsSecondDate] = useState(false);
  const [pointer, setPointer] = useState({ lat: null, lng: null });

  const mapRef = useRef(null);

  const prediction = useMemo(() => classify(question), [question]);
  const predictedTask = TASK_CATALOG[prediction.task];

  /* ------------------------------------------------------------- job */

  const [jobStatus, setJobStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [auditTrace, setAuditTrace] = useState(null);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tab, setTab] = useState("result");

  const pollRef = useRef({ cancelled: false });

  const trace = useMemo(
    () => (auditTrace ? readTrace(auditTrace) : null),
    [auditTrace]
  );

  const running =
    jobStatus === "submitting" ||
    jobStatus === "queued" ||
    jobStatus === "running";

  useEffect(() => {
    if (!running || startedAt === null) return undefined;

    const timer = setInterval(
      () => setElapsedMs(Date.now() - startedAt),
      250
    );

    return () => clearInterval(timer);
  }, [running, startedAt]);

  /* --------------------------------------------------------- evidence */

  const [overlayOn, setOverlayOn] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);

  // The ground the finished job actually ran over, as the trace recorded
  // it — not whatever is drawn on the map right now.
  const evidenceBounds = trace?.bbox ?? upload?.bounds ?? null;
  const evidenceUrl = artifactUrl(result?.evidence?.url);

  /* ------------------------------------------------------ validation */

  const blockers = useMemo(() => {
    const problems = [];

    if (!question.trim()) {
      problems.push("Ask a question.");
    }

    if (dataSource === "geotiff") {
      if (!upload) {
        problems.push("Upload a GeoTIFF.");
      }

      if (!predictedTask.acceptsUpload) {
        problems.push(
          `This wording routes to ${predictedTask.label}, which needs an ` +
            "AOI and multiple dates — it cannot run on an upload."
        );
      }
    } else {
      if (!aoi) {
        problems.push("Draw an area of interest, or pick a demo area.");
      }

      if (!dates[0]) {
        problems.push("Choose a date.");
      }

      if (predictedTask.scenes >= 2 && !dates[1]) {
        problems.push(
          `${predictedTask.label} compares two dates — set the second one.`
        );
      }

      if (dates[0] && dates[1] && dates[0] === dates[1]) {
        problems.push("The two dates must differ.");
      }
    }

    if (health === "down") {
      problems.push("The backend is unreachable.");
    }

    return problems;
  }, [
    question,
    dataSource,
    upload,
    aoi,
    dates,
    predictedTask,
    health,
  ]);

  /* -------------------------------------------------------- map moves */

  const flyTo = useCallback((bbox) => {
    const bounds = bboxToBounds(bbox);
    if (bounds && mapRef.current) {
      mapRef.current.flyToBounds(bounds, { padding: [80, 80], duration: 0.6 });
    }
  }, []);

  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handlePointer = useCallback(
    (lat, lng) => setPointer({ lat, lng }),
    []
  );

  const handleDemoAOI = useCallback(
    (bbox) => {
      setAoi(bbox);
      flyTo(bbox);
    },
    [flyTo]
  );

  const handleUploaded = useCallback(
    (uploaded) => {
      setUpload(uploaded);
      if (uploaded.bounds) flyTo(uploaded.bounds);
    },
    [flyTo]
  );

  /* ------------------------------------------------------------- run */

  const stopPolling = useCallback(() => {
    pollRef.current.cancelled = true;
  }, []);

  const cancel = useCallback(() => {
    stopPolling();
    setJobStatus(null);
  }, [stopPolling]);

  const run = useCallback(async () => {
    stopPolling();

    const token = { cancelled: false };
    pollRef.current = token;

    setError("");
    setResult(null);
    setAuditTrace(null);
    setJobStatus("submitting");
    setStartedAt(Date.now());
    setElapsedMs(0);
    setTab("trace");

    const payload = {
      query: question.trim(),
      aoi: dataSource === "geotiff" ? upload?.bounds ?? null : aoi,
      dates:
        dataSource === "geotiff"
          ? null
          : dates.filter(Boolean),
      imageRef: dataSource === "geotiff" ? upload?.imageRef : null,
    };

    let jobId;

    try {
      const created = await createJob(payload);
      jobId = created.job_id;
      if (token.cancelled) return;
      setJobStatus(created.status);
    } catch (createError) {
      if (token.cancelled) return;
      setError(createError.message);
      setJobStatus(null);
      return;
    }

    // Poll the result and the trace together: the trace is what fills in
    // the pipeline while the job is still running, and it is cheap.
    while (!token.cancelled) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      if (token.cancelled) return;

      let current;

      try {
        current = await getJob(jobId);
      } catch (pollError) {
        if (token.cancelled) return;
        setError(pollError.message);
        setJobStatus("failed");
        return;
      }

      if (token.cancelled) return;

      setJobStatus(current.status);

      try {
        const audit = await getJobAudit(jobId);
        if (!token.cancelled) setAuditTrace(audit);
      } catch {
        // A trace that is briefly unavailable must not fail the job the
        // user is watching; the next tick picks it up.
      }

      if (current.status === "done" || current.status === "failed") {
        if (token.cancelled) return;

        setResult(current);
        setOverlayOn(Boolean(current.evidence?.url));
        setTab(current.status === "done" ? "result" : "trace");
        return;
      }
    }
  }, [aoi, dataSource, dates, question, stopPolling, upload]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  /* ----------------------------------------------------------- render */

  const layoutSignal = `${leftOpen}-${rightOpen}`;

  return (
    <div
      className={
        `app${leftOpen ? " dock-left-open" : ""}` +
        `${rightOpen ? " dock-right-open" : ""}`
      }
    >
      <MapCanvas
        basemapId={basemapId}
        showLabels={showLabels}
        aoi={aoi}
        footprint={upload?.bounds ?? null}
        evidenceBounds={evidenceBounds}
        evidenceUrl={evidenceUrl}
        evidenceOpacity={overlayOpacity}
        evidenceVisible={overlayOn}
        onAOIChange={setAoi}
        onPointer={handlePointer}
        onMapReady={handleMapReady}
        layoutSignal={layoutSignal}
      />

      <div className="hud">
        <TopBar
          theme={theme}
          onThemeToggle={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
          basemapId={basemapId}
          onBasemapChange={setBasemapId}
          showLabels={showLabels}
          onLabelsChange={setShowLabels}
          health={health}
        />

        {leftOpen ? (
          <aside className="dock dock-left">
            <div className="dock-head">
              <div>
                <h2>Console</h2>
                <p>What to analyse, and what to ask</p>
              </div>
              <span className="dock-head-spacer" />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setLeftOpen(false)}
                aria-label="Collapse the console"
              >
                ‹
              </button>
            </div>

            <ControlDock
              dataSource={dataSource}
              onDataSourceChange={setDataSource}
              aoi={aoi}
              onZoomToAOI={() => flyTo(aoi)}
              onDemoAOI={handleDemoAOI}
              onClearAOI={() => setAoi(null)}
              upload={upload}
              onUploaded={handleUploaded}
              onUploadCleared={() => setUpload(null)}
              question={question}
              onQuestionChange={setQuestion}
              prediction={prediction}
              dates={dates}
              onDatesChange={setDates}
              wantsSecondDate={wantsSecondDate}
              onWantsSecondDateChange={setWantsSecondDate}
              onRun={run}
              onCancel={cancel}
              running={running}
              blockers={blockers}
            />
          </aside>
        ) : (
          <button
            type="button"
            className="dock-tab dock-tab-left"
            onClick={() => setLeftOpen(true)}
          >
            Console
          </button>
        )}

        {rightOpen ? (
          <aside className="dock dock-right">
            <div className="dock-head">
              <div>
                <h2>Analysis</h2>
                <p>Answer, trace, audit and report</p>
              </div>
              <span className="dock-head-spacer" />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setRightOpen(false)}
                aria-label="Collapse the analysis panel"
              >
                ›
              </button>
            </div>

            <ResultsDock
              tab={tab}
              onTabChange={setTab}
              jobStatus={jobStatus}
              elapsedMs={elapsedMs}
              result={result}
              trace={trace}
              error={error}
              canOverlay={Boolean(evidenceBounds)}
              overlayOn={overlayOn}
              onOverlayChange={setOverlayOn}
              overlayOpacity={overlayOpacity}
              onOpacityChange={setOverlayOpacity}
            />
          </aside>
        ) : (
          <button
            type="button"
            className="dock-tab dock-tab-right"
            onClick={() => setRightOpen(true)}
          >
            Analysis
          </button>
        )}

        <StatusRail
          pointer={pointer}
          aoi={aoi}
          footprint={upload?.bounds ?? null}
          overlayOn={Boolean(overlayOn && evidenceUrl && evidenceBounds)}
        />
      </div>
    </div>
  );
}
