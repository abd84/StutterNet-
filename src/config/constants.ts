import { buildDemoAnalysisResult } from "@/lib/demoAnalysis";
import type { AudioAnalysisResult } from "@/lib/gemini";
import { severityBandFromScore } from "@/lib/severity";

export const APP_CONFIG = {
  AUDIO: {
    MAX_RECORDING_DURATION: 20, // seconds
    /** Hard cap for Gemini / analysis requests (decode + API limits). */
    MAX_ANALYSIS_DURATION_SEC: 20,
    /** Inline audio payload safety limit (~20 MB raw bytes before base64). */
    MAX_UPLOAD_BYTES: 20 * 1024 * 1024,
    FFT_SIZE: 512,
    ANALYZER_SMOOTHING: 0.8,
  },
  ANALYSIS: {
    PROCESSING_STEP_INTERVAL: 1200,
    POST_PROCESSING_DELAY: 800,
  }
};

export const DEMO_DATASET = [
  {
    id: "HARF_I017",
    filename: "HARF_I017.wav",
    label: "Syllable Repetition",
    labelUrdu: "حرف کی تکرار",
    description: "Pure syllable-based stuttering — involuntary phoneme-level repetition",
    duration: 7,
    stutterType: "Syllable (Sy)",
    severity: "Very Mild",
    speaker: "Male Speaker A",
    stutterCount: 1,
    annotatedTranscript: "بھائی یہ بس کہاں جاتی ہے کیا یہ صدر تک [حرف]ج-جاتی[/حرف] ہے یا مجھے دوسری بس لینی ہوگی",
    plainTranscript: "بھائی یہ بس کہاں جاتی ہے کیا یہ صدر تک جاتی ہے یا مجھے دوسری بس لینی ہوگی",
    stutterMarkers: [
      { start: 10, end: 11, type: "syllable", label: "ج-جاتی" }
    ],
    totalWords: 18,
    disfluencyCount: 1,
    annotationStyle: "ASHA Standard"
  },
  {
    id: "LAFZ_009",
    filename: "LAFZ_009.wav",
    label: "Word-level Stuttering",
    labelUrdu: "لفظ کی تکرار",
    description: "Whole-word repetition — same word repeated involuntarily multiple times",
    duration: 6,
    stutterType: "Word (Lafz)",
    severity: "Very Mild",
    speaker: "Male Speaker B",
    stutterCount: 1,
    annotatedTranscript: "یہ قمیض بہت اچھی ہے لیکن کیا اس میں [لفظ]سائز سائز[/لفظ] بڑا بھی ملتا ہے ایکسٹرا لارج میں",
    plainTranscript: "یہ قمیض بہت اچھی ہے لیکن کیا اس میں سائز بڑا بھی ملتا ہے ایکسٹرا لارج میں",
    stutterMarkers: [
      { start: 8, end: 9, type: "word_repetition", label: "سائز سائز" }
    ],
    totalWords: 17,
    disfluencyCount: 1,
    annotationStyle: "ASHA Standard"
  },
  {
    id: "T20-p",
    filename: "T20-p.mp3",
    label: "Pause & Block",
    labelUrdu: "وقفہ اور رکاوٹ",
    description: "Block stuttering — complete articulatory arrest mid-sentence",
    duration: 8,
    stutterType: "Pause (-p)",
    severity: "Very Mild",
    speaker: "Male Speaker C",
    stutterCount: 1,
    annotatedTranscript: "ہمیں اس پروجیکٹ کو [بلاک]—[/بلاک] اگلے مہینے تک ہر حال میں مکمل کرنا ہے، ورنہ بہت مسئلہ ہو گا",
    plainTranscript: "ہمیں اس پروجیکٹ کو اگلے مہینے تک ہر حال میں مکمل کرنا ہے، ورنہ بہت مسئلہ ہو گا",
    stutterMarkers: [
      { start: 4, end: 5, type: "block", label: "—" }
    ],
    totalWords: 19,
    disfluencyCount: 1,
    annotationStyle: "ASHA Standard"
  },
  {
    id: "ORIG_SEVERE",
    filename: "",
    label: "Syllable + Block",
    labelUrdu: "حرف و رکاوٹ",
    description:
      "Syllable-level struggle and articulatory blocks spread through a short Urdu utterance",
    duration: 4,
    stutterType: "Syllable + Block (Sy+p)",
    severity: "Severe",
    speaker: "Male Speaker D",
    stutterCount: 5,
    annotatedTranscript:
      "ہاں [حرف]م-میں[/حرف] نے وہ [حرف]ک-کام[/حرف] [بلاک]—[/بلاک] ابھی [بلاک]—[/بلاک] [حرف]ت-تک[/حرف] نہیں کیا",
    plainTranscript:
      "ہاں میں نے وہ کام ابھی تک نہیں کیا",
    stutterMarkers: [
      { start: 1, end: 2, type: "syllable", label: "م-میں" },
      { start: 4, end: 5, type: "syllable", label: "ک-کام" },
      { start: 5, end: 6, type: "block", label: "—" },
      { start: 7, end: 8, type: "block", label: "—" },
      { start: 8, end: 9, type: "syllable", label: "ت-تک" },
    ],
    totalWords: 10,
    disfluencyCount: 5,
    annotationStyle: "ASHA Standard",
    skipAudio: true,
  },
];

const _harf = buildDemoAnalysisResult({
  syllable: 1,
  word: 0,
  pause: 0,
  totalWords: 18,
  transcript: "بھائی یہ بس کہاں جاتی ہے کیا یہ صدر تک *ج-جاتی* ہے یا مجھے دوسری بس لینی ہوگی",
  highlightedWords: [10],
  confidence: 98,
  avgDuration: 0.4,
});

const _lafz = buildDemoAnalysisResult({
  syllable: 0,
  word: 1,
  pause: 0,
  totalWords: 17,
  transcript: "یہ قمیض بہت اچھی ہے لیکن کیا اس میں *سائز سائز* بڑا بھی ملتا ہے ایکسٹرا لارج میں",
  highlightedWords: [9],
  confidence: 98,
  avgDuration: 0.5,
});

const _t20 = buildDemoAnalysisResult({
  syllable: 0,
  word: 0,
  pause: 1,
  totalWords: 19,
  transcript: "ہمیں اس پروجیکٹ کو *—* اگلے مہینے تک ہر حال میں مکمل کرنا ہے ورنہ بہت مسئلہ ہو گا",
  highlightedWords: [4],
  confidence: 95,
  avgDuration: 1.2,
});

/** 3 syllable + 2 block in 10-word sentence → severity 70 (Severe band) */
const _origSevere = buildDemoAnalysisResult({
  syllable: 3,
  word: 0,
  pause: 2,
  totalWords: 10,
  transcript:
    "ہاں *م-میں* نے وہ *ک-کام* *—* ابھی *—* *ت-تک* نہیں کیا",
  highlightedWords: [1, 4, 5, 7, 8],
  confidence: 91,
  avgDuration: 1.8,
});

export const DEMO_ANALYSIS_RESULTS: Record<string, AudioAnalysisResult> = {
  HARF_I017: _harf,
  LAFZ_009: _lafz,
  "T20-p": _t20,
  ORIG_SEVERE: _origSevere,
};

/** Sync display severity labels on dataset cards from formula scores */
for (const sample of DEMO_DATASET) {
  const result = DEMO_ANALYSIS_RESULTS[sample.id];
  if (result) {
    (sample as { severity: string }).severity = severityBandFromScore(result.severityScore);
  }
}
