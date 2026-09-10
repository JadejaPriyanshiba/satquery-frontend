/**
 * Client-side mirror of the backend task router.
 *
 * SOURCE OF TRUTH: `satquery-backend/app/core/router.py`. The keyword
 * tables, weights, precedence order and default below are a direct port
 * of that module — if it changes there, change it here. Nothing in the
 * app *depends* on this being right: it only powers the "predicted
 * route" hint shown while the user is still typing, and the moment a job
 * finishes the real decision from the audit trace replaces it.
 *
 * Why mirror it at all: which of the four specialists answers a question
 * is decided entirely by its wording, and until now that was invisible.
 * Showing the prediction (and the runners-up) turns an opaque keyword
 * match into something a user can steer.
 */

export const TASK = {
  VQA: "vqa",
  GROUNDING: "grounding",
  CHANGE_DETECTION: "change_detection",
  SAR_FUSION: "sar_fusion",
};

const KEYWORDS = {
  [TASK.CHANGE_DETECTION]: {
    "change detection": 3,
    "bi-temporal": 3,
    bitemporal: 3,
    "before and after": 3,
    "multi-temporal": 3,
    changed: 2,
    change: 2,
    changes: 2,
    difference: 2,
    differences: 2,
    deforestation: 2,
    encroachment: 2,
    "new construction": 2,
    "urban growth": 2,
    "urban expansion": 2,
    compare: 1,
    comparison: 1,
    "over time": 1,
    since: 1,
    expanded: 1,
    shrunk: 1,
    grown: 1,
    appeared: 1,
    disappeared: 1,
    "used to be": 1,
    previously: 1,
  },
  [TASK.SAR_FUSION]: {
    "sar fusion": 3,
    "optical and sar": 3,
    "sar and optical": 3,
    "optical-sar": 3,
    "sar agreement": 3,
    "radar agreement": 3,
    sar: 2,
    radar: 2,
    backscatter: 2,
    "sentinel-1": 2,
    microwave: 2,
    "all-weather": 1,
    "through cloud": 1,
    polarisation: 1,
    polarization: 1,
  },
  [TASK.GROUNDING]: {
    "show me where": 3,
    "point out": 3,
    "bounding box": 3,
    "bounding boxes": 3,
    "draw a box": 3,
    "segment the": 3,
    "outline the": 3,
    highlight: 2,
    segment: 2,
    outline: 2,
    delineate: 2,
    pinpoint: 2,
    locate: 2,
    mark: 2,
    where: 1,
    find: 1,
    show: 1,
    detect: 1,
    detection: 1,
    "which ones": 1,
  },
  [TASK.VQA]: {
    "how many": 2,
    "how much": 2,
    "what percentage": 2,
    "what type": 2,
    "what kind": 2,
    "is there": 2,
    "are there": 2,
    describe: 2,
    caption: 2,
    what: 1,
    how: 1,
    why: 1,
    count: 1,
    explain: 1,
    summarise: 1,
    summarize: 1,
  },
};

/** Tie-break order: specific tasks outrank VQA, which is the catch-all. */
export const PRECEDENCE = [
  TASK.CHANGE_DETECTION,
  TASK.SAR_FUSION,
  TASK.GROUNDING,
  TASK.VQA,
];

export const DEFAULT_TASK = TASK.VQA;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary matcher that treats spaces and hyphens alike. */
function compile(keyword) {
  const tokens = keyword
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(escapeRegExp);

  return new RegExp(`\\b${tokens.join("[\\s-]+")}\\b`);
}

const PATTERNS = Object.fromEntries(
  PRECEDENCE.map((task) => [
    task,
    Object.entries(KEYWORDS[task]).map(([keyword, weight]) => ({
      keyword,
      weight,
      pattern: compile(keyword),
    })),
  ])
);

/**
 * Route a query to exactly one task type.
 *
 * Total and deterministic, like the backend: an unrecognised query takes
 * `DEFAULT_TASK` rather than guessing at a specialist.
 */
export function classify(query) {
  const normalised = (query || "").toLowerCase().trim();

  const scores = {};
  const matches = {};

  for (const task of PRECEDENCE) {
    const hits = PATTERNS[task].filter((entry) =>
      entry.pattern.test(normalised)
    );

    scores[task] = hits.reduce((total, entry) => total + entry.weight, 0);
    matches[task] = hits.map((entry) => entry.keyword).sort();
  }

  const best = Math.max(...Object.values(scores));

  if (best === 0) {
    return {
      task: DEFAULT_TASK,
      reason:
        "no task-specific terms matched; defaulting to general image " +
        "question answering",
      matchedTerms: [],
      scores,
      confident: false,
    };
  }

  const winners = PRECEDENCE.filter((task) => scores[task] === best);
  const task = winners[0];

  const runnerUp = Math.max(
    ...PRECEDENCE.filter((other) => other !== task).map(
      (other) => scores[other]
    )
  );

  const terms = matches[task].map((term) => `"${term}"`).join(", ");

  const reason =
    winners.length > 1
      ? `matched ${terms} (score ${best}); tied with ` +
        `${winners.slice(1).map(labelFor).join(", ")}, resolved by precedence`
      : `matched ${terms} (score ${best}); next best scored ${runnerUp}`;

  return {
    task,
    reason,
    matchedTerms: matches[task],
    scores,
    confident: best > runnerUp,
  };
}

/**
 * What each specialist does, what it needs, and what it gives back.
 *
 * `needs` mirrors `_build_tool_inputs()` in `app/api/jobs.py`; `evidence`
 * mirrors `_EVIDENCE_SOURCES` there. The examples are wordings that route
 * to that task under the table above.
 */
export const TASK_CATALOG = {
  [TASK.VQA]: {
    label: "Visual Q&A",
    short: "VQA",
    glyph: "❓",
    blurb: "Answers a question about one scene, in prose.",
    needs: "One scene — an AOI with a single date, or an uploaded GeoTIFF.",
    evidence: "None — this task answers in prose, not pixels.",
    scenes: 1,
    acceptsUpload: true,
    examples: [
      "Describe the land cover in this area.",
      "What percentage of this scene is water?",
      "Is there visible flooding here?",
    ],
  },
  [TASK.GROUNDING]: {
    label: "Grounding",
    short: "GROUND",
    glyph: "◎",
    blurb: "Localises what you name and returns a mask over the scene.",
    needs: "One scene — an AOI with a single date, or an uploaded GeoTIFF.",
    evidence: "A mask overlay you can drape on the map.",
    scenes: 1,
    acceptsUpload: true,
    examples: [
      "Show me where the water bodies are.",
      "Outline the built-up area.",
      "Highlight vegetation in this scene.",
    ],
  },
  [TASK.CHANGE_DETECTION]: {
    label: "Change detection",
    short: "CHANGE",
    glyph: "⇄",
    blurb: "Compares two dates over the same ground and maps what moved.",
    needs: "An AOI and two dates. An uploaded image cannot be used.",
    evidence: "A change mask overlay.",
    scenes: 2,
    acceptsUpload: false,
    examples: [
      "What changed between these two dates?",
      "Show new construction since the earlier scene.",
      "Has the water body shrunk over time?",
    ],
  },
  [TASK.SAR_FUSION]: {
    label: "Optical + SAR fusion",
    short: "SAR",
    glyph: "◈",
    blurb:
      "Cross-checks an optical change signal against radar, which sees " +
      "through cloud.",
    needs: "An AOI and two dates — four scenes are fetched (SAR + optical).",
    evidence: "A disagreement overlay where the two sensors differ.",
    scenes: 4,
    acceptsUpload: false,
    examples: [
      "Confirm this change with radar.",
      "Do optical and SAR agree on what changed here?",
      "Check the backscatter difference between these dates.",
    ],
  },
};

export function labelFor(task) {
  return TASK_CATALOG[task]?.label ?? task;
}
