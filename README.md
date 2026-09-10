# SatQuery AI — frontend

Map-first React client for the SatQuery backend. The map owns the
viewport; every control floats above it.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

The backend must be running for anything to work:

```bash
cd ../satquery-backend
uvicorn app.main:app --reload    # http://127.0.0.1:8000
```

The API base URL defaults to `http://127.0.0.1:8000` and can be
overridden with `VITE_API_URL`. Ports 5173 and 3000 are already in the
backend's CORS allow-list.

## Layout

```
src/
  App.jsx              shell — shared state, and the submit/poll flow
  map/
    MapCanvas.jsx      the full-viewport map and everything drawn on it
    basemaps.js        basemap catalogue (XYZ tile services)
    bounds.js          bbox <-> Leaflet bounds
  panels/
    TopBar.jsx         identity, backend health, basemap picker, theme
    ControlDock.jsx    left dock — inputs
    ResultsDock.jsx    right dock — the four output tabs
    StatusRail.jsx     bottom readouts
    GeoTIFFUploader.jsx
  views/
    ResultView.jsx     answer, confidence, evidence
    TraceView.jsx      live pipeline with per-stage charts
    AuditView.jsx      the audit trail, charted, with raw JSON behind it
    ReportView.jsx     the backend's report, plus JSON/PDF download
  viz/
    charts.jsx         chart primitives (bars, meters, gauge, stacks)
    scales.js          value -> colour mappings
  services/
    api.js             one function per backend endpoint
    jobModel.js        reads the audit trace as structured facts
    taskRouter.js      client-side mirror of the backend's task router
  styles/              tokens, shell, panels, viz, map
```

## Two things worth knowing before editing

**`services/taskRouter.js` is a port.** Its keyword tables, weights and
precedence come from `satquery-backend/app/core/router.py`. It powers
only the "predicted route" hint shown while typing — the real decision
always comes from the audit trace — but a drift between the two makes
the UI misleading, so change them together. There is a check for this:
run the same queries through both and compare `task` and `scores`.

**`services/jobModel.js` reads; it never invents.** The audit trace is
the system's claim to being interrogable, so a number the backend did
not record comes back `null` and the view says so, rather than showing a
plausible figure nothing measured. Keep that property.

## Charts

Chart colours live as CSS custom properties in `styles/tokens.css`
(`--series-*`, `--seq-*`, `--status-*`). Both the light and dark sets
were validated as a group against the panel surfaces; re-stepping one
colour on its own breaks that. Status colours are reserved for state and
never stand in for a series slot.
