export const APP_CONFIG = {
  AUDIO: {
    MAX_RECORDING_DURATION: 20, // seconds
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
    severity: "Mild",
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
    severity: "Mild",
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
    severity: "Moderate",
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
    id: "T61-w",
    filename: "T61-w.mp3",
    label: "Mixed Stuttering",
    labelUrdu: "مخلوط لکنت",
    description: "Advanced mixed stutter analysis — multiple disfluency types",
    duration: 8,
    stutterType: "Mixed (Sy+p+w)",
    severity: "Severe",
    speaker: "Male Speaker D",
    stutterCount: 0,
    annotatedTranscript: "",
    plainTranscript: "",
    stutterMarkers: [],
    totalWords: 0,
    disfluencyCount: 0,
    annotationStyle: "ASHA Standard",
    isComingSoon: true
  }
];

export const DEMO_ANALYSIS_RESULTS: Record<string, any | unknown> = {
  "HARF_I017": {
    severityScore: 6,
    totalWords: 18,
    disfluencyCount: 1,
    avgDuration: 0.4,
    confidence: 98,
    stutterTypes: [
      { type: "Takrar (Repetitions)", urdu: "تکرار", count: 1, color: "bg-primary", percent: 100 },
      { type: "Tawalat (Prolongations)", urdu: "طوالت", count: 0, color: "bg-accent", percent: 0 },
      { type: "Rukawat (Blocks)", urdu: "رکاوٹ", count: 0, color: "bg-secondary", percent: 0 }
    ],
    transcript: "بھائی یہ بس کہاں جاتی ہے کیا یہ صدر تک *ج-جاتی* ہے یا مجھے دوسری بس لینی ہوگی",
    highlightedWords: [10]
  },
  "LAFZ_009": {
    severityScore: 6,
    totalWords: 17,
    disfluencyCount: 1,
    avgDuration: 0.5,
    confidence: 98,
    stutterTypes: [
      { type: "Takrar (Repetitions)", urdu: "تکرار", count: 1, color: "bg-primary", percent: 100 },
      { type: "Tawalat (Prolongations)", urdu: "طوالت", count: 0, color: "bg-accent", percent: 0 },
      { type: "Rukawat (Blocks)", urdu: "رکاوٹ", count: 0, color: "bg-secondary", percent: 0 }
    ],
    transcript: "یہ قمیض بہت اچھی ہے لیکن کیا اس میں *سائز سائز* بڑا بھی ملتا ہے ایکسٹرا لارج میں",
    highlightedWords: [8, 9]
  },
  "T20-p": {
    severityScore: 22,
    totalWords: 19,
    disfluencyCount: 1,
    avgDuration: 1.2,
    confidence: 95,
    stutterTypes: [
      { type: "Takrar (Repetitions)", urdu: "تکرار", count: 0, color: "bg-primary", percent: 0 },
      { type: "Tawalat (Prolongations)", urdu: "طوالت", count: 0, color: "bg-accent", percent: 0 },
      { type: "Rukawat (Blocks)", urdu: "رکاوٹ", count: 1, color: "bg-secondary", percent: 100 }
    ],
    transcript: "ہمیں اس پروجیکٹ کو *—* اگلے مہینے تک ہر حال میں مکمل کرنا ہے ورنہ بہت مسئلہ ہو گا",
    highlightedWords: [4]
  }
};