const SATELLITE_STEPS = [
  {
    id: "aoi",
    title: "Define Area of Interest",
    description: "Select the geographic area to analyze.",
  },
  {
    id: "query",
    title: "Configure Analysis",
    description: "Set the question and analysis dates.",
  },
  {
    id: "imagery",
    title: "Fetch Satellite Imagery",
    description: "Prepare the required satellite data.",
  },
  {
    id: "analysis",
    title: "Run AI Analysis",
    description: "Process the imagery and answer the query.",
  },
  {
    id: "verify",
    title: "Verify Result",
    description: "Check the generated result and evidence.",
  },
];

const GEOTIFF_STEPS = [
  {
    id: "upload",
    title: "Load GeoTIFF",
    description: "Use the uploaded GeoTIFF as the analysis image.",
  },
  {
    id: "query",
    title: "Configure Analysis",
    description: "Set the question and analysis date.",
  },
  {
    id: "analysis",
    title: "Run AI Analysis",
    description: "Process the uploaded image and answer the query.",
  },
  {
    id: "verify",
    title: "Verify Result",
    description: "Check the generated result and evidence.",
  },
];

function getStepState(stepId, jobStatus, aoi, dataSource, geoTiffReady) {
  if (dataSource === "geotiff") {
    if (jobStatus === "Failed") {
      if (stepId === "upload" && !geoTiffReady) return "pending";
      return stepId === "analysis" ? "failed" : "completed";
    }

    if (jobStatus === "Done") return "completed";

    if (jobStatus === "Running") {
      if (stepId === "upload" || stepId === "query") return "completed";
      if (stepId === "analysis") return "active";
      return "pending";
    }

    if (jobStatus === "Queued" || jobStatus === "Creating job...") {
      if (stepId === "upload" && geoTiffReady) return "completed";
      if (stepId === "query") return "active";
      return "pending";
    }

    if (stepId === "upload" && geoTiffReady) return "completed";
    return "pending";
  }

  if (jobStatus === "Failed") {
    if (stepId === "aoi" && !aoi) return "pending";
    return stepId === "query" ? "completed" : "failed";
  }

  if (jobStatus === "Done") return "completed";

  if (jobStatus === "Running") {
    if (stepId === "aoi" || stepId === "query") return "completed";
    if (stepId === "imagery" || stepId === "analysis") return "active";
    return "pending";
  }

  if (jobStatus === "Queued" || jobStatus === "Creating job...") {
    if (stepId === "aoi" && aoi) return "completed";
    if (stepId === "query") return "active";
    return "pending";
  }

  if (stepId === "aoi" && aoi) return "completed";
  return "pending";
}

function ExecutionTrace({
  analysisMode,
  jobStatus,
  aoi,
  dataSource = "satellite",
  geoTiffReady = false,
}) {
  const hasStarted = Boolean(jobStatus);
  const steps = dataSource === "geotiff" ? GEOTIFF_STEPS : SATELLITE_STEPS;

  return (
    <aside className="execution-trace">
      <div className="execution-trace-header">
        <div>
          <span className="section-eyebrow">PROCESS</span>
          <h2>Execution Trace</h2>
          <p>
            {hasStarted
              ? "Live progress of the current analysis"
              : "Analysis workflow and processing stages"}
          </p>
        </div>

        <span className="trace-mode-badge">
          {dataSource === "geotiff"
            ? "GEOTIFF"
            : analysisMode === "single"
              ? "IMAGE"
              : "CHANGE"}
        </span>
      </div>

      <div className="trace-status">
        <span
          className={`trace-status-dot ${
            jobStatus === "Failed"
              ? "trace-status-failed"
              : jobStatus === "Done"
                ? "trace-status-done"
                : hasStarted
                  ? "trace-status-running"
                  : ""
          }`}
        ></span>

        <div>
          <strong>
            {jobStatus ||
              (dataSource === "geotiff"
                ? geoTiffReady
                  ? "Ready to analyze"
                  : "Waiting for GeoTIFF"
                : aoi
                  ? "Ready to analyze"
                  : "Waiting for AOI")}
          </strong>
          <span>
            {jobStatus === "Failed"
              ? "Analysis stopped"
              : jobStatus === "Done"
                ? "Analysis completed"
                : hasStarted
                  ? "Processing request..."
                  : dataSource === "geotiff"
                    ? "Upload your GeoTIFF and configure the analysis"
                    : "Select an area and configure your analysis"}
          </span>
        </div>
      </div>

      <div className="execution-steps">
        {steps.map((step, index) => {
          const state = getStepState(
            step.id,
            jobStatus,
            aoi,
            dataSource,
            geoTiffReady
          );

          return (
            <div
              className={`execution-step execution-step-${state}`}
              key={step.id}
            >
              <div className="execution-step-marker">
                {state === "completed"
                  ? "✓"
                  : state === "failed"
                    ? "!"
                    : index + 1}
              </div>

              {index < steps.length - 1 && (
                <div className="execution-step-line"></div>
              )}

              <div className="execution-step-content">
                <div className="execution-step-title">
                  <strong>{step.title}</strong>
                  <span>
                    {state === "completed"
                      ? "Done"
                      : state === "active"
                        ? "Running"
                        : state === "failed"
                          ? "Failed"
                          : "Pending"}
                  </span>
                </div>

                <p>{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default ExecutionTrace;
