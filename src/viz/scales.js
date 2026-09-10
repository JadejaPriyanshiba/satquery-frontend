/**
 * Value -> colour mappings shared by the charts.
 *
 * Kept out of `charts.jsx` so that file exports components only.
 */

/**
 * Confidence severity, as a reserved status colour plus a written name.
 *
 * Status colours never stand in for a categorical series slot, and they
 * never travel alone: every caller pairs this with the printed number
 * and the label, so the meaning survives for a reader who cannot
 * separate the hues.
 */
export function confidenceTone(score) {
  if (score === null || score === undefined) {
    return { tone: "neutral", color: "var(--ink-3)", label: "Not scored" };
  }

  if (score >= 75) {
    return { tone: "good", color: "var(--status-good)", label: "Strong" };
  }

  if (score >= 50) {
    return {
      tone: "warning",
      color: "var(--status-warning)",
      label: "Moderate",
    };
  }

  if (score > 0) {
    return {
      tone: "serious",
      color: "var(--status-serious)",
      label: "Weak",
    };
  }

  return {
    tone: "critical",
    color: "var(--status-critical)",
    label: "Unscored",
  };
}
