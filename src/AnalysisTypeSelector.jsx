function AnalysisTypeSelector({ analysisMode, onModeChange }) {
  return (
    <div className="analysis-type-section">
      <div className="analysis-type-header">
        <div>
          <span className="section-eyebrow">
            ANALYSIS TYPE
          </span>

          <h2>Select an analysis</h2>

          <p>
            Choose how you want to analyze the satellite imagery
          </p>
        </div>

        <span className="selection-hint">
          Select one
        </span>
      </div>

      <div className="analysis-type-grid">
        <button
          type="button"
          className={`analysis-type-card ${
            analysisMode === "single"
              ? "analysis-type-selected"
              : ""
          }`}
          onClick={() => onModeChange("single")}
        >
          <div className="analysis-type-top">
            <span className="analysis-type-icon">▧</span>
            <span className="analysis-type-number">01</span>
          </div>

          <div className="analysis-type-content">
            <h3>Image Analysis</h3>
            <p>
              Analyze one satellite image from a selected date.
            </p>
          </div>

          <span className="analysis-type-description">
            Single-Date Satellite Analysis
          </span>
        </button>

        <button
          type="button"
          className={`analysis-type-card ${
            analysisMode === "change"
              ? "analysis-type-selected"
              : ""
          }`}
          onClick={() => onModeChange("change")}
        >
          <div className="analysis-type-top">
            <span className="analysis-type-icon">⇄</span>
            <span className="analysis-type-number">02</span>
          </div>

          <div className="analysis-type-content">
            <h3>Change Analysis</h3>
            <p>
              Compare satellite images from two different dates.
            </p>
          </div>

          <span className="analysis-type-description">
            Bi-Temporal Change Analysis
          </span>
        </button>
      </div>
    </div>
  );
}

export default AnalysisTypeSelector;
