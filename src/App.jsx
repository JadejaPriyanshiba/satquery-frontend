import { useEffect, useState } from "react";
import "./App.css";

import MapView from "./MapView";
import QueryPanel from "./QueryPanel";

function App() {
  const [aoi, setAoi] = useState(null);

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

  return (
    <div className={`app ${darkMode ? "dark-mode" : "light-mode"}`}>

      <header className="navbar">

        <div className="brand">
          <div className="brand-icon">
            🛰️
          </div>

          <div className="brand-text">
            <h1>SatQuery AI</h1>
            <span>Satellite Intelligence</span>
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

        <section className="map-section">

          <MapView
            onAOIChange={setAoi}
          />

          {aoi && (
            <div className="aoi-info">
              <strong>Selected AOI</strong>

              <p>
                {JSON.stringify(aoi)}
              </p>
            </div>
          )}

        </section>

        <section className="analysis-section">
          <QueryPanel aoi={aoi} />
        </section>

      </main>

    </div>
  );
}

export default App;