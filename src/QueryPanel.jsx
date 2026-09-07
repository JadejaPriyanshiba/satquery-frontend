import { useState } from "react";
import {
    createJob,
    getJob,
    getJobAudit,
} from "./services/api";

import ResultPanel from "./ResultPanel";
import AuditTimeline from "./AuditTimeline";
import GeoTIFFUploader from "./GeoTIFFUploader";

function QueryPanel({ aoi }) {
    const [question, setQuestion] = useState("");
    const [date1, setDate1] = useState("");
    const [date2, setDate2] = useState("");

    const [loading, setLoading] = useState(false);
    const [jobStatus, setJobStatus] = useState("");
    const [jobResult, setJobResult] = useState(null);

    const [audit, setAudit] = useState([]);
    const [imageRef, setImageRef] = useState(null);

    const handleGeoTIFFUpload = (uploadResult) => {
        console.log("UPLOAD RESULT:", uploadResult);

        setImageRef(uploadResult.image_ref);

        alert("GeoTIFF uploaded successfully!");
    };

    const handleAnalyze = async () => {
        if (!aoi) {
            alert("Please select an area on the map first.");
            return;
        }

        if (!question.trim()) {
            alert("Please enter a question.");
            return;
        }

        if (!date1) {
            alert("Please select at least one date.");
            return;
        }

        const dates = [date1, date2].filter(Boolean);

        try {
            setLoading(true);
            setJobStatus("Creating job...");
            setJobResult(null);
            setAudit([]);

            const job = await createJob({
                question,
                aoi,
                dates,
                imageRef,
            });

            console.log("JOB CREATED:", job);

            const jobId = job.job_id;

            setJobStatus("Queued");

            let finished = false;

            while (!finished) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 2000)
                );

                const result = await getJob(jobId);

                console.log("JOB STATUS:", result);

                if (result.status === "queued") {
                    setJobStatus("Queued");
                }

                if (result.status === "running") {
                    setJobStatus("Running");
                }

                if (result.status === "done") {
                    console.log("FINAL RESULT:", result);

                    setJobStatus("Done");
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

            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="query-panel">

            <div className="analysis-heading">
                <div>
                    <h2>Analysis</h2>
                    <p>
                        Configure your satellite analysis
                    </p>
                </div>

                <span className="analysis-badge">
                    AI
                </span>
            </div>

            {/* GeoTIFF Upload */}

            <div className="upload-section">

                <GeoTIFFUploader
                    onUpload={handleGeoTIFFUpload}
                />

                {imageRef && (
                    <div className="uploaded-file">
                        <span className="uploaded-check">
                            ✓
                        </span>

                        <div>
                            <strong>
                                Image ready
                            </strong>

                            <p>
                                {imageRef}
                            </p>
                        </div>
                    </div>
                )}

            </div>

            {/* Question */}

            <div className="form-group">

                <label>
                    <span className="label-icon">✦</span>
                    Question
                </label>

                <input
                    type="text"
                    placeholder="Ask a question about the selected area..."
                    value={question}
                    onChange={(e) =>
                        setQuestion(e.target.value)
                    }
                />

            </div>

            {/* Dates */}

            <div className="date-section">

                <div className="date-section-header">

                    <div>
                        <label>
                            {/* <span className="label-icon">◷</span> */}
                            Analysis Dates
                        </label>

                        <p>
                            Select one or two dates
                        </p>
                    </div>

                    <span className="optional-badge">
                        Optional 2nd date
                    </span>

                </div>

                <div className="date-grid">

                    <div className="form-group">

                        <label>
                            Date 1
                        </label>

                        <input
                            type="date"
                            value={date1}
                            onChange={(e) =>
                                setDate1(e.target.value)
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Date 2
                        </label>

                        <input
                            type="date"
                            value={date2}
                            onChange={(e) =>
                                setDate2(e.target.value)
                            }
                        />

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
                    {loading ? "Analyzing..." : "Analyze Area"}
                </span>

                {!loading && (
                    <span className="analyze-arrow">
                        →
                    </span>
                )}

            </button>

            {/* Job Status */}

            {jobStatus && (
                <div className={`job-status ${
                    jobStatus === "Done"
                        ? "status-done"
                        : jobStatus === "Failed"
                        ? "status-failed"
                        : "status-processing"
                }`}>

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
                                : "..."
                            }
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
                <AuditTimeline audit={audit} />
            )}

        </div>
    );
}

export default QueryPanel;