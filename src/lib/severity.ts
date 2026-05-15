/** Severity formula and display bands (matches gemini ANALYSIS_PROMPT Step 3). */

export function deriveSeverityFromCounts(
  syllable: number,
  word: number,
  pause: number,
  totalWords: number,
): number {
  const disfluency = syllable + word + pause;
  if (disfluency === 0) return 0;
  const weighted = syllable * 1 + word * 1.5 + pause * 2;
  let score = (weighted / Math.max(totalWords, 1)) * 100;
  score = Math.min(100, Math.max(0, score));
  let out = Math.round(score);
  if (disfluency >= 3) out = Math.max(out, 25);
  if (pause > 0 && totalWords > 0 && totalWords < 10) out = Math.max(out, 35);
  return Math.min(100, out);
}

export type SeverityBand =
  | "None"
  | "Very Mild"
  | "Mild"
  | "Moderate"
  | "Severe"
  | "Very Severe";

export function severityBandFromScore(score: number): SeverityBand {
  if (score === 0) return "None";
  if (score <= 20) return "Very Mild";
  if (score <= 40) return "Mild";
  if (score <= 60) return "Moderate";
  if (score <= 80) return "Severe";
  return "Very Severe";
}

export function getSeverityLevel(score: number): {
  label: string;
  urdu: string;
  color: string;
} {
  const band = severityBandFromScore(score);
  const map: Record<SeverityBand, { label: string; urdu: string; color: string }> = {
    None: { label: "Fluent", urdu: "روانی", color: "text-green-400" },
    "Very Mild": { label: "Very Mild", urdu: "بہت کم", color: "text-green-400" },
    Mild: { label: "Mild", urdu: "کم", color: "text-yellow-400" },
    Moderate: { label: "Moderate", urdu: "درمیانہ", color: "text-orange-400" },
    Severe: { label: "Severe", urdu: "شدید", color: "text-red-400" },
    "Very Severe": { label: "Very Severe", urdu: "انتہائی شدید", color: "text-red-500" },
  };
  return map[band];
}

export function severityDotClass(band: string): string {
  switch (band) {
    case "None":
      return "bg-green-500";
    case "Very Mild":
      return "bg-green-400";
    case "Mild":
      return "bg-lime-500";
    case "Moderate":
      return "bg-yellow-500";
    case "Severe":
      return "bg-orange-500";
    case "Very Severe":
      return "bg-red-500";
    default:
      return "bg-muted-foreground";
  }
}
