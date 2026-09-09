import { downloadReport } from "./services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = "http://127.0.0.1:8000";

function ResultPanel({ result, audit = [] }) {
    if (!result) {
        return null;
    }

    const evidenceUrl = result.evidence?.url
        ? result.evidence.url.startsWith("http")
            ? result.evidence.url
            : `${API_URL}${result.evidence.url}`
        : null;

    const handleDownloadReport = () => {
        downloadReport(result, audit);
    };

    return (
        <div className="result-panel">

            {/* Header */}

            <div className="result-header">

                <div>
                    <div className="result-title-row">
                        <span className="result-main-icon">
                            ✦
                        </span>

                        <div>
                            <h2>Analysis Result</h2>

                            <p>
                                AI-generated satellite analysis
                            </p>
                        </div>
                    </div>
                </div>

                <span
                    className={`result-status ${result.status === "done"
                            ? "result-status-done"
                            : "result-status-failed"
                        }`}
                >
                    {result.status}
                </span>

            </div>


            {/* Answer */}

            <div className="answer-card">

                <div className="result-card-title">

                    <span className="result-icon">
                        ✦
                    </span>

                    <div>
                        <h3>Answer</h3>
                        <span className="card-subtitle">
                            AI interpretation
                        </span>
                    </div>

                </div>

                <div className="answer-text">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.answer}
                    </ReactMarkdown>
                </div>

            </div>


            {/* Metrics */}

            <div className="result-metrics">

                <div className="metric-card">

                    <div className="metric-top">
                        <span className="metric-label">
                            Confidence Score
                        </span>

                        <span className="metric-icon">
                            ◉
                        </span>
                    </div>

                    <strong className="metric-value">
                        {result.confidence ?? 0}
                        <span>/100</span>
                    </strong>

                    <div className="confidence-bar">
                        <div
                            className="confidence-fill"
                            style={{
                                width: `${Math.min(
                                    result.confidence ?? 0,
                                    100
                                )}%`,
                            }}
                        ></div>
                    </div>

                </div>


                <div className="metric-card">

                    <div className="metric-top">
                        <span className="metric-label">
                            Verification
                        </span>

                        <span className="metric-icon">
                            ✓
                        </span>
                    </div>

                    <strong className="metric-value verification-value">
                        {result.verified
                            ? "Verified"
                            : "Not Verified"}
                    </strong>

                    <p className="metric-description">
                        {result.verified
                            ? "Result has been verified."
                            : "Verification is currently inconclusive."}
                    </p>

                </div>

            </div>


            {/* Evidence */}

            <div className="evidence-card">

                <div className="result-card-title">

                    <span className="result-icon">
                        ◈
                    </span>

                    <div>
                        <h3>Evidence</h3>

                        <span className="card-subtitle">
                            Supporting satellite data
                        </span>
                    </div>

                </div>


                <div className="evidence-type">

                    <span>
                        Evidence Type
                    </span>

                    <strong>
                        {result.evidence?.type || "None"}
                    </strong>

                </div>


                {evidenceUrl ? (
                    <div className="evidence-image-container">

                        <img
                            src={evidenceUrl}
                            alt="Analysis evidence"
                            className="evidence-image"
                        />

                    </div>
                ) : (
                    <div className="no-evidence">

                        <span className="no-evidence-icon">
                            ◌
                        </span>

                        <strong>
                            No evidence available
                        </strong>

                        <p>
                            Supporting imagery was not returned
                            for this analysis.
                        </p>

                    </div>
                )}

            </div>


            {/* Error */}

            {result.error && (
                <div className="result-error">

                    <div className="error-title">
                        <span>!</span>

                        <strong>
                            Analysis Error
                        </strong>
                    </div>

                    <p>
                        {result.error}
                    </p>

                </div>
            )}


            {/* Export */}

            <button
                className="export-btn"
                onClick={handleDownloadReport}
            >
                <span>↓</span>

                Export Analysis Report

                <span className="export-arrow">
                    →
                </span>
            </button>

        </div>
    );
}

export default ResultPanel;