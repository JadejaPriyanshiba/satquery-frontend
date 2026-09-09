import { useEffect, useState } from "react";
import "./App.css";

import MapView from "./MapView";
import QueryPanel from "./QueryPanel";
import AnalysisTypeSelector from "./AnalysisTypeSelector";
import DataSourceSelector from "./DataSourceSelector";
import ExecutionTrace from "./ExecutionTrace";

function App() {
  const [aoi, setAoi] = useState(null);
  const [analysisMode, setAnalysisMode] = useState("single");
  const [dataSource, setDataSource] = useState("satellite");
  const [jobStatus, setJobStatus] = useState("");
  const [geoTiffReady, setGeoTiffReady] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("satquery-theme");
    return savedTheme === "dark";
  });

  useEffect(() => {
    localStorage.setItem(
      "satquery-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const handleDataSourceChange = (source) => {
    setDataSource(source);
    setJobStatus("");

    // GeoTIFF mode is always single-image analysis.
    if (source === "geotiff") {
      setAnalysisMode("single");
    } else {
      setGeoTiffReady(false);
    }
  };

  const handleModeChange = (mode) => {
    setAnalysisMode(mode);
    setJobStatus("");
  };

  return (
    <div className={`app ${darkMode ? "dark-mode" : "light-mode"}`}>
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            🛰️
          </div>

          <div className="brand-text">
            <h1>SatQuery AI</h1>
            <span>Interactive Remote Sensing Assistant</span>
          </div>
        </div>

        <div className="navbar-actions">
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
          >
            <span className="theme-icon">
              {darkMode ? "☀️" : "🌙"}
            </span>

            <span className="theme-text">
              {darkMode ? "Light" : "Dark"}
            </span>
          </button>

          <div className="system-status">
            <span className="status-dot"></span>
            <span>System Ready</span>
          </div>
        </div>
      </header>

      <main className="dashboard">
        <DataSourceSelector
          dataSource={dataSource}
          onChange={handleDataSourceChange}
        />

        {dataSource === "satellite" && (
          <>
            <section className="analysis-type-wrapper">
              <AnalysisTypeSelector
                analysisMode={analysisMode}
                onModeChange={handleModeChange}
              />
            </section>

            <section className="map-process-grid">
              <div className="map-section">
                <MapView onAOIChange={setAoi} />

                {aoi && (
                  <div className="aoi-info">
                    <strong>Selected AOI</strong>
                    <p>{JSON.stringify(aoi)}</p>
                  </div>
                )}
              </div>

              <ExecutionTrace
                analysisMode={analysisMode}
                jobStatus={jobStatus}
                aoi={aoi}
              />
            </section>
          </>
        )}

        {dataSource === "geotiff" ? (
          <section className="geotiff-workspace">
            <div className="geotiff-left-column">
              <div className="geotiff-workspace-copy">
                <span className="section-eyebrow">OWN DATA</span>
                <h2>Single Image Analysis</h2>
                <p>Upload one GeoTIFF and ask a question about the image.</p>
              </div>

              <section className="analysis-section geotiff-analysis-section">
                <QueryPanel
                  aoi={aoi}
                  analysisMode="single"
                  dataSource="geotiff"
                  onJobStatusChange={setJobStatus}
                  onGeoTIFFReady={setGeoTiffReady}
                />
              </section>
            </div>

            <ExecutionTrace
              analysisMode="single"
              jobStatus={jobStatus}
              aoi={null}
              dataSource="geotiff"
              geoTiffReady={geoTiffReady}
            />
          </section>
        ) : (
          <section className="analysis-section">
            <QueryPanel
              aoi={aoi}
              analysisMode={analysisMode}
              dataSource="satellite"
              onJobStatusChange={setJobStatus}
              onGeoTIFFReady={setGeoTiffReady}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
