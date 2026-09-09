import { useEffect, useState } from "react";
import {
    createJob,
    getJob,
    getJobAudit,
} from "./services/api";

import ResultPanel from "./ResultPanel";
import AuditTimeline from "./AuditTimeline";
import GeoTIFFUploader from "./GeoTIFFUploader";

function QueryPanel({ aoi, analysisMode, dataSource = "satellite", onJobStatusChange, onGeoTIFFReady }) {
    const [question, setQuestion] = useState("");
    const [date1, setDate1] = useState("");
    const [date2, setDate2] = useState("");

    const [loading, setLoading] = useState(false);
    const [jobStatus, setJobStatus] = useState("");
    const [jobResult, setJobResult] = useState(null);

    const [audit, setAudit] = useState([]);
    const [imageRef, setImageRef] = useState(null);
    const [uploadedAOI, setUploadedAOI] = useState(null);

    useEffect(() => {
        // Reset analysis-specific state whenever the selected mode changes.
        if (analysisMode === "single") {
            setDate2("");
        }

        setJobResult(null);
        setJobStatus("");
        setAudit([]);
        onJobStatusChange?.("");
    }, [analysisMode, onJobStatusChange]);

    useEffect(() => {
        if (dataSource === "satellite") {
            setImageRef(null);
            setUploadedAOI(null);
            onGeoTIFFReady?.(false);
        }
    }, [dataSource, onGeoTIFFReady]);

    const handleGeoTIFFUpload = (uploadResult) => {
        console.log("UPLOAD RESULT:", uploadResult);

        setImageRef(uploadResult.image_ref);

        // Newer backends may return the GeoTIFF bounding box.
        const bbox =
            uploadResult.bbox ||
            uploadResult.aoi?.bbox ||
            uploadResult.bounds ||
            null;

        if (Array.isArray(bbox) && bbox.length === 4) {
            setUploadedAOI(bbox);
        }

        onGeoTIFFReady?.(true);
        alert("GeoTIFF uploaded successfully!");
    };

    const handleAnalyze = async () => {
        const requestAOI = dataSource === "geotiff" ? uploadedAOI : aoi;

        if (!requestAOI) {
            if (dataSource === "geotiff") {
                alert("The uploaded GeoTIFF did not return geographic bounds. Please update the backend upload response to include its bbox.");
            } else {
                alert("Please select an area on the map first.");
            }
            return;
        }

        if (dataSource === "geotiff" && !imageRef) {
            alert("Please upload a GeoTIFF file first.");
            return;
        }

        if (!question.trim()) {
            alert("Please enter a question.");
            return;
        }

        if (!date1) {
            alert("Please select a date.");
            return;
        }

        if (analysisMode === "change" && !date2) {
            alert("Please select the second date for Change Analysis.");
            return;
        }

        const dates =
            analysisMode === "single"
                ? [date1]
                : [date1, date2];

        try {
            setLoading(true);
            setJobStatus("Creating job...");
            onJobStatusChange?.("Creating job...");
            setJobResult(null);
            setAudit([]);

            const job = await createJob({
                question,
                aoi: requestAOI,
                dates,
                imageRef,
            });

            console.log("JOB CREATED:", job);

            const jobId = job.job_id;

            setJobStatus("Queued");
            onJobStatusChange?.("Queued");

            let finished = false;

            while (!finished) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 2000)
                );

                const result = await getJob(jobId);

                console.log("JOB STATUS:", result);

                if (result.status === "queued") {
                    setJobStatus("Queued");
            onJobStatusChange?.("Queued");
                }

                if (result.status === "running") {
                    setJobStatus("Running");
                    onJobStatusChange?.("Running");
                }

                if (result.status === "done") {
                    console.log("FINAL RESULT:", result);

                    setJobStatus("Done");
                    onJobStatusChange?.("Done");
                    setJobResult(result);
                    finished = true;

                    try {
                        const auditData =
                            await getJobAudit(jobId);

                        console.log(
                            "AUDIT TRAIL:",
                            auditData
                        );

                        setAudit(auditData);
                    } catch (auditError) {
                        console.error(
                            "AUDIT ERROR:",
                            auditError
                        );

                        setAudit([]);
                    }
                }

                if (result.status === "failed") {
                    console.error(
                        "ANALYSIS FAILED:",
                        result
                    );

                    setJobStatus("Failed");
                    onJobStatusChange?.("Failed");
                    setJobResult(result);
                    finished = true;

                    try {
                        const auditData =
                            await getJobAudit(jobId);

                        console.log(
                            "AUDIT TRAIL:",
                            auditData
                        );

                        setAudit(auditData);
                    } catch (auditError) {
                        console.error(
                            "AUDIT ERROR:",
                            auditError
                        );

                        setAudit([]);
                    }
                }
            }
        } catch (error) {
            console.error("JOB ERROR:", error);

            setJobStatus("Failed");
                    onJobStatusChange?.("Failed");

            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="query-panel">

            {/* Analysis Panel */}
            <div className="analysis-heading">
                <div>
                    <h2>Analysis</h2>

                    <p>
                        {analysisMode === "single"
                            ? "Analyze a single satellite image"
                            : "Compare satellite imagery between two dates"}
                    </p>
                </div>

                <span className="analysis-badge">
                    {analysisMode === "single"
                        ? "IMAGE"
                        : "CHANGE"}
                </span>
            </div>

            {/* Analysis Form */}
            <div className="analysis-form-grid">
                <div className="analysis-form-main">
                    {/* GeoTIFF Upload - only shown for Own GeoTIFF mode */}
                    {dataSource === "geotiff" && (
                        <div className="upload-section">
                            <GeoTIFFUploader
                                onUpload={handleGeoTIFFUpload}
                            />

                            {imageRef && (
                                <div className="uploaded-file">
                                    <span className="uploaded-check">✓</span>
                                    <div>
                                        <strong>Image ready</strong>
                                        <p>{imageRef}</p>
                                        {uploadedAOI && (
                                            <small>Geographic bounds detected</small>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Question */}
                    <div className="form-group analysis-question-group">
                        <label>
                            <span className="label-icon">
                                ✦
                            </span>

                            Question
                        </label>

                        <input
                            type="text"
                            placeholder={
                                analysisMode === "single"
                                    ? "Ask a question about the selected image..."
                                    : "Ask what changed between the selected dates..."
                            }
                            value={question}
                            onChange={(e) =>
                                setQuestion(e.target.value)
                            }
                        />
                    </div>
                </div>

                {/* Dates */}
                <div className="date-section analysis-dates-card">
                    <div className="date-section-header">
                        <div>
                            <label>
                                Analysis Dates
                            </label>

                            <p>
                                {analysisMode === "single"
                                    ? "Select one date for the satellite image"
                                    : "Select two dates to compare satellite imagery"}
                            </p>
                        </div>

                        {analysisMode === "change" && (
                            <span className="optional-badge">
                                2 dates required
                            </span>
                        )}
                    </div>

                    <div className="date-grid analysis-date-grid">
                        {/* Date 1 */}
                        <div className="form-group">
                            <label>
                                {analysisMode === "single"
                                    ? "Analysis Date"
                                    : "Date 1"}
                            </label>

                            <input
                                type="date"
                                min="2014-01-01"
                                value={date1}
                                onChange={(e) =>
                                    setDate1(e.target.value)
                                }
                            />
                        </div>

                        {/* Date 2 - Only for Change Analysis */}
                        {analysisMode === "change" && (
                            <div className="form-group">
                                <label>
                                    Date 2
                                </label>

                                <input
                                    type="date"
                                    min={date1 || "2014-01-01"}
                                    value={date2}
                                    onChange={(e) =>
                                        setDate2(e.target.value)
                                    }
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analyze Button */}
            <button
                className="analyze-btn"
                onClick={handleAnalyze}
                disabled={loading}
            >
                <span>
                    {loading
                        ? "Analyzing..."
                        : analysisMode === "single"
                            ? "Analyze Image"
                            : "Analyze Changes"}
                </span>

                {!loading && (
                    <span className="analyze-arrow">
                        →
                    </span>
                )}
            </button>

            {/* Job Status */}
            {jobStatus && (
                <div
                    className={`job-status ${jobStatus === "Done"
                        ? "status-done"
                        : jobStatus === "Failed"
                            ? "status-failed"
                            : "status-processing"
                        }`}
                >
                    <div className="status-header">
                        <div>
                            <span className="status-label">
                                Analysis Status
                            </span>

                            <h3>
                                {jobStatus}
                            </h3>
                        </div>

                        <span className="status-indicator">
                            {jobStatus === "Done"
                                ? "✓"
                                : jobStatus === "Failed"
                                    ? "!"
                                    : "..."}
                        </span>
                    </div>

                    <p>
                        {jobStatus === "Queued" &&
                            "Your analysis is waiting to be processed."}

                        {jobStatus === "Running" &&
                            "Satellite data is currently being analyzed."}

                        {jobStatus === "Done" &&
                            "Analysis completed successfully."}

                        {jobStatus === "Failed" &&
                            "Something went wrong while processing the analysis."}

                        {jobStatus === "Creating job..." &&
                            "Preparing your analysis request."}
                    </p>
                </div>
            )}

            {/* Result */}
            <ResultPanel
                result={jobResult}
                audit={audit}
            />

            {/* Audit */}
            {jobResult && (
                <AuditTimeline
                    audit={audit}
                />
            )}

        </div>
    );
}

export default QueryPanel;