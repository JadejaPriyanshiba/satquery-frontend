/**
 * Chart primitives.
 *
 * Every mark in the app comes from this file so the whole UI reads as
 * one system: bars are thin with a 4px rounded data-end squared at the
 * baseline, stacked segments are separated by a 2px gap in the surface
 * colour rather than a stroke, gridlines are recessive hairlines, and
 * text always wears an ink token — identity comes from a coloured key
 * *beside* the label, never from colouring the label itself.
 *
 * Colours arrive as CSS custom properties (`--series-1`, `--seq-450`,
 * status slots) defined in `styles/tokens.css`; both light and dark sets
 * were validated with the palette checker against the panel surfaces.
 *
 * Every chart ships a table view. Three light-mode slots sit under 3:1
 * against the panel surface, so the relief rule applies: values are
 * directly labelled and the table is one click away.
 */

import { useId, useState } from "react";

/* ------------------------------------------------------------------ *
 * Shared chrome
 * ------------------------------------------------------------------ */

/**
 * Title + subtitle + an always-available table fallback.
 *
 * `rows` is `[[label, value], ...]`; pass it and the toggle appears.
 */
export function Figure({ title, subtitle, children, columns, rows }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  const hasTable = Array.isArray(rows) && rows.length > 0;

  return (
    <figure className="viz">
      {title && <p className="viz-title">{title}</p>}
      {subtitle && <p className="viz-sub">{subtitle}</p>}

      {children}

      {hasTable && (
        <>
          <button
            type="button"
            className="table-toggle"
            aria-expanded={showTable}
            aria-controls={tableId}
            onClick={() => setShowTable((open) => !open)}
          >
            {showTable ? "Hide values" : "Show values as a table"}
          </button>

          <table className="viz-table" id={tableId} hidden={!showTable}>
            <thead>
              <tr>
                {(columns ?? ["Item", "Value"]).map((heading, index) => (
                  <th key={heading} className={index > 0 ? "num" : undefined}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row[0])}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={index > 0 ? "num" : undefined}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 * Figures — when the form is a number, not a chart
 * ------------------------------------------------------------------ */

export function StatTile({ label, value, unit, note, tone, glyph }) {
  return (
    <div className={`stat-tile${tone ? " is-status" : ""}`}>
      <div className="stat-label">{label}</div>

      <div className="stat-value">
        {tone && (
          <span className={`status-mark tone-${tone}`} aria-hidden="true">
            {glyph ?? "•"}
          </span>
        )}
        <span>{value}</span>
        {unit && <span className="stat-unit">{unit}</span>}
      </div>

      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function StatRow({ children }) {
  return <div className="stat-row">{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Meter — one ratio against a limit
 * ------------------------------------------------------------------ */

/**
 * `value` and `max` are in the caller's own units; `readout` is what
 * gets printed, so a 0–1 score can show as a percentage without the
 * geometry having to care.
 *
 * The track is a lighter step of the fill's own ramp, so the state reads
 * across the whole bar rather than only where it is filled. It is mixed
 * from the fill rather than hard-coded, which keeps that true for every
 * fill colour and in both themes — mixing toward the surface lightens on
 * light and darkens on dark.
 */
export function Meter({
  name,
  value,
  max = 1,
  readout,
  color = "var(--seq-450)",
  scale,
}) {
  const pct =
    max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  const track = `color-mix(in oklab, ${color} 22%, var(--surface-2))`;

  return (
    <div className="meter">
      <div className="meter-head">
        <span className="meter-name">{name}</span>
        <span className="meter-readout">{readout}</span>
      </div>

      <div
        className="meter-track"
        style={{ background: track }}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={name}
      >
        <div
          className="meter-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {scale && (
        <div className="meter-scale">
          {scale.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Radial gauge — the one headline number
 * ------------------------------------------------------------------ */

export function Gauge({ value, max = 100, color, label, caption, size = 108 }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const centre = size / 2;

  // A 270° sweep starting bottom-left, so the gap reads as the scale
  // ending rather than as a missing segment.
  const sweep = 270;
  const circumference = 2 * Math.PI * radius;
  const arc = (sweep / 360) * circumference;

  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  const track = `color-mix(in oklab, ${color} 22%, var(--surface-2))`;

  return (
    <div className="gauge">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${value} of ${max}`}
      >
        <g transform={`rotate(135 ${centre} ${centre})`}>
          <circle
            className="gauge-track"
            style={{ stroke: track }}
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc * ratio} ${circumference}`}
            style={{ transition: "stroke-dasharray 420ms cubic-bezier(.2,.8,.2,1)" }}
          />
        </g>

        <text
          className="gauge-center"
          x={centre}
          y={centre + 2}
          textAnchor="middle"
          fontSize="26"
        >
          {value}
        </text>

        <text
          className="gauge-center-sub"
          x={centre}
          y={centre + 18}
          textAnchor="middle"
        >
          / {max}
        </text>
      </svg>

      <div className="gauge-copy">
        <strong>{label}</strong>
        <p>{caption}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Horizontal bars — compare magnitude, with emphasis on one row
 * ------------------------------------------------------------------ */

/**
 * `items` is `[{ key, name, value, note }]`. When `winnerKey` is given
 * the chart switches to the emphasis form: the winner takes the accent
 * hue and every other row goes to the de-emphasis gray, because the
 * story is "this one was picked", not "here are four categories".
 *
 * Every bar is directly labelled with its value, which is also what
 * satisfies the relief rule for the lighter palette slots.
 */
export function BarChart({
  items,
  winnerKey,
  max,
  color = "var(--seq-450)",
  gridAt,
  unit = "",
}) {
  const ceiling = max ?? Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="bars">
      {items.map((item) => {
        const isWinner = winnerKey !== undefined && item.key === winnerKey;
        const fill = winnerKey === undefined
          ? color
          : isWinner
            ? "var(--accent)"
            : "var(--deemph)";

        const pct = ceiling > 0 ? (item.value / ceiling) * 100 : 0;

        return (
          <div
            className={`bar-row${isWinner ? " is-winner" : ""}`}
            key={item.key}
          >
            <div className="bar-caption">
              <span className="bar-name">
                <span
                  className="bar-key"
                  style={{ background: fill }}
                  aria-hidden="true"
                />
                {item.name}
              </span>

              <span className="bar-value">
                {item.value}
                {unit}
                {item.note ? ` · ${item.note}` : ""}
              </span>
            </div>

            <div className="bar-track">
              {gridAt?.map((tick) => (
                <span
                  key={tick}
                  className="bar-gridline"
                  style={{ left: `${(tick / ceiling) * 100}%` }}
                  aria-hidden="true"
                />
              ))}

              <div
                className={`bar-fill${item.value === 0 ? " is-zero" : ""}`}
                style={{ width: `${pct}%`, background: fill }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stacked bar — part-to-whole
 * ------------------------------------------------------------------ */

/**
 * `segments` is `[{ key, name, value, color }]` against `total`.
 *
 * Segments are separated by a 2px gap in the surface colour (see
 * `viz.css`), never by a stroke. A segment is only labelled in place
 * when its own width can hold the text; the legend below carries every
 * value regardless, so nothing is gated on a label fitting.
 */
export function StackedBar({ segments, total, remainderLabel }) {
  const used = segments.reduce((sum, segment) => sum + segment.value, 0);
  const remainder = Math.max(0, total - used);

  return (
    <div>
      <div className="stack">
        {segments.map((segment) => {
          const pct = total > 0 ? (segment.value / total) * 100 : 0;

          return (
            <div
              key={segment.key}
              className="stack-seg"
              style={{ width: `${pct}%`, background: segment.color }}
              title={`${segment.name}: ${segment.value.toFixed(1)}`}
            >
              {pct >= 18 && (
                <span
                  className="stack-seg-label"
                  style={{ color: "#fff" }}
                >
                  {segment.value.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}

        {remainder > 0 && (
          <div
            className="stack-seg"
            style={{
              width: `${(remainder / total) * 100}%`,
              background: "transparent",
            }}
            title={`${remainderLabel ?? "Unaccounted"}: ${remainder.toFixed(1)}`}
          />
        )}
      </div>

      <div className="stack-legend">
        {segments.map((segment) => (
          <span className="legend-item" key={segment.key}>
            <span
              className="legend-key"
              style={{ background: segment.color }}
              aria-hidden="true"
            />
            {segment.name}
            <span className="legend-value">{segment.value.toFixed(1)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Duration bars — how long each recorded step took
 * ------------------------------------------------------------------ */

export function DurationChart({ rows, format }) {
  const ceiling = Math.max(1, ...rows.map((row) => row.ms ?? 0));

  return (
    <div className="duration-chart">
      {rows.map((row) => {
        const measured = row.ms !== null && row.ms !== undefined;
        const pct = measured ? (row.ms / ceiling) * 100 : 0;

        // A darker ramp step for the slowest step: one hue, more-is-darker,
        // so the eye lands on the stage that actually cost time.
        const shade =
          !measured
            ? "var(--deemph)"
            : pct > 66
              ? "var(--seq-550)"
              : pct > 33
                ? "var(--seq-450)"
                : "var(--seq-350)";

        return (
          <div className="duration-row" key={`${row.step}-${row.index}`}>
            <span className="duration-name">{row.step}</span>

            <span className="duration-track">
              <span
                className="duration-fill"
                style={{ width: `${pct}%`, background: shade }}
              />
            </span>

            <span className="duration-value">
              {measured ? format(row.ms) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
