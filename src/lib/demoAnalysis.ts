import type { AudioAnalysisResult } from "@/lib/gemini";
import { deriveSeverityFromCounts } from "@/lib/severity";

const COLOURS = ["bg-primary", "bg-accent", "bg-secondary"] as const;
const DEFAULTS = [
  { type: "Syllable Level", urdu: "حرف سطح" },
  { type: "Word Level", urdu: "لفظ سطح" },
  { type: "Pause / Block Level", urdu: "وقفہ / رکاوٹ" },
] as const;

export function buildDemoAnalysisResult(opts: {
  syllable: number;
  word: number;
  pause: number;
  totalWords: number;
  transcript: string;
  highlightedWords: number[];
  confidence: number;
  avgDuration: number;
  severityScore?: number;
}): AudioAnalysisResult {
  const counts = [opts.syllable, opts.word, opts.pause];
  const disfluencyCount = counts.reduce((a, b) => a + b, 0);
  const severityScore =
    opts.severityScore ??
    deriveSeverityFromCounts(opts.syllable, opts.word, opts.pause, opts.totalWords);
  const stutterTypes = DEFAULTS.map((def, i) => ({
    type: def.type,
    urdu: def.urdu,
    count: counts[i],
    color: COLOURS[i],
    percent: disfluencyCount > 0 ? Math.round((counts[i] / disfluencyCount) * 100) : 0,
  }));
  return {
    transcript: opts.transcript,
    totalWords: opts.totalWords,
    disfluencyCount,
    severityScore,
    confidence: opts.confidence,
    avgDuration: opts.avgDuration,
    highlightedWords: opts.highlightedWords,
    stutterTypes,
    isGeminiAnalysis: true,
  };
}
