// Format registry — single source of truth for the wizard, board labels,
// and pairing. Two axes: scoring (how holes become points) × format (who's
// on a side). Adding a method/format is a row here, not a screen rewrite.

export const SCORING = {
  match:  { key: "match",  label: "Match play",  blurb: "Win holes head-to-head — most holes won takes the points.", opts: ["pph", "playAll"] },
  stroke: { key: "stroke", label: "Stroke play", blurb: "Lowest combined strokes wins the difference as points.",     opts: [] },
};

export const FORMATS = {
  singles:  { key: "singles",  label: "Singles",  side: 1, blurb: "One player per side." },
  scramble: { key: "scramble", label: "Scramble", side: 2, blurb: "Two-player team, play the best shot." },
};

export const SCORING_ORDER = ["match", "stroke"];
export const FORMAT_ORDER = ["singles", "scramble"];

// Disallowed (scoring:format) pairings — greyed in the UI with a reason.
// Empty today; add an entry when an incompatible format arrives.
const INVALID = {};

export function comboInfo(scoring, format) {
  const key = `${scoring}:${format}`;
  if (INVALID[key]) return { ok: false, reason: INVALID[key] };
  return { ok: !!(SCORING[scoring] && FORMATS[format]), reason: "" };
}

export function summarize(d) {
  const s = SCORING[d.scoring]?.label || "Match play";
  const f = FORMATS[d.format]?.label || "Singles";
  const extra = d.scoring === "match" && Number(d.pph) > 1 ? ` · ${d.pph}/hole` : "";
  return `${s} · ${f}${extra}`;
}

export function countLabel(d) {
  return d.scoring === "stroke" ? "Pairs / team" : "Matches";
}

export function countWord(d) {
  return d.scoring === "stroke" ? "pairs" : "matches";
}

// Default points-per-hole when a format is chosen under match scoring.
export function defaultPph(format) {
  return FORMATS[format]?.side > 1 ? 2 : 1;
}
