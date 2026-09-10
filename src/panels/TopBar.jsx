/**
 * The floating top bar: identity on the left, map and system controls
 * on the right. It never blocks the map — only the pills themselves
 * take pointer events.
 */

import { useEffect, useRef, useState } from "react";

import { BASEMAPS, BASEMAPS_BY_ID } from "../map/basemaps";
import teamLogo from "../assets/team-logo.png";

function BasemapPicker({ basemapId, onChange, showLabels, onLabelsChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const close = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };

    const escape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const active = BASEMAPS_BY_ID[basemapId];
  const supportsLabels = Boolean(active?.reference);

  return (
    <div className="basemap-wrap" ref={wrapRef}>
      <button
        type="button"
        className="pill"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <span aria-hidden="true">▦</span>
        {active?.name ?? "Basemap"}
        <span aria-hidden="true" style={{ opacity: 0.6 }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="basemap-menu" role="menu">
          <div className="menu-label">Basemap</div>

          {BASEMAPS.map((basemap) => (
            <button
              key={basemap.id}
              type="button"
              role="menuitemradio"
              aria-checked={basemap.id === basemapId}
              className={`basemap-item${
                basemap.id === basemapId ? " is-active" : ""
              }`}
              onClick={() => {
                onChange(basemap.id);
                setOpen(false);
              }}
            >
              <img
                className="basemap-swatch"
                src={BASEMAPS_BY_ID[basemap.id].preview}
                alt=""
                loading="lazy"
              />
              <span>
                {basemap.name}
                <small>{basemap.note}</small>
              </span>
            </button>
          ))}

          {supportsLabels && (
            <>
              <div className="basemap-divider" />
              <label className="overlay-toggle">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(event) => onLabelsChange(event.target.checked)}
                />
                Place names and boundaries
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TopBar({
  theme,
  onThemeToggle,
  basemapId,
  onBasemapChange,
  showLabels,
  onLabelsChange,
  health,
}) {
  const healthCopy = {
    up: "Backend online",
    down: "Backend unreachable",
    checking: "Checking backend",
  }[health];

  return (
    <div className="topbar">
      <div className="brand">
        <img src={teamLogo} alt="" />
        <div className="brand-text">
          <strong>SatQuery AI</strong>
          <span>Interactive remote sensing assistant</span>
        </div>
      </div>

      <div className="topbar-actions">
        <span className="pill is-static" title={healthCopy}>
          <span className={`health-dot is-${health}`} aria-hidden="true" />
          {healthCopy}
        </span>

        <BasemapPicker
          basemapId={basemapId}
          onChange={onBasemapChange}
          showLabels={showLabels}
          onLabelsChange={onLabelsChange}
        />

        <button
          type="button"
          className="pill"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </div>
  );
}
