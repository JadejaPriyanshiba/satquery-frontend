function DataSourceSelector({ dataSource, onChange }) {
  return (
    <section className="data-source-section">
      <div className="data-source-header">
        <div>
          <span className="section-eyebrow">DATA SOURCE</span>
          <h2>Choose your data</h2>
          <p>Select satellite data from the map or use your own GeoTIFF.</p>
        </div>
        <span className="selection-hint">Select one</span>
      </div>

      <div className="data-source-grid">
        <button
          type="button"
          className={`data-source-card ${dataSource === "satellite" ? "data-source-selected" : ""}`}
          onClick={() => onChange("satellite")}
        >
          <div className="data-source-icon">⌖</div>
          <div>
            <h3>Satellite / Map</h3>
            <p>Select an Area of Interest and use satellite imagery.</p>
          </div>
          <span className="data-source-tag">AOI + SATELLITE</span>
        </button>

        <button
          type="button"
          className={`data-source-card ${dataSource === "geotiff" ? "data-source-selected" : ""}`}
          onClick={() => onChange("geotiff")}
        >
          <div className="data-source-icon">↑</div>
          <div>
            <h3>Own GeoTIFF</h3>
            <p>Upload your own GeoTIFF for single-image analysis.</p>
          </div>
          <span className="data-source-tag">UPLOAD + IMAGE</span>
        </button>
      </div>
    </section>
  );
}

export default DataSourceSelector;
