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
    id: "T10-Sy",
    filename: "T10-Sy.mp3",
    label: "Syllable Repetition",
    labelUrdu: "حرف کی تکرار",
    description: "Pure syllable-based stuttering — involuntary phoneme-level repetition",
    duration: 4,
    stutterType: "Syllable (Sy)",
    severity: "Moderate",
    speaker: "Male Speaker A",
    stutterCount: 2,
    annotatedTranscript: "اچھا [حرف]م... م...[/حرف] مجھے اتنا مزہ نہیں آ رہا",
    plainTranscript: "اچھا مجھے اتنا مزہ نہیں آ رہا",
    stutterMarkers: [
      { start: 1, end: 2, type: "syllable", label: "م... م..." }
    ],
    totalWords: 10,
    disfluencyCount: 2,
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
    speaker: "Male Speaker B",
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
    id: "T30-w",
    filename: "T30-w.mp3",
    label: "Word-level Stuttering",
    labelUrdu: "لفظ کی تکرار",
    description: "Whole-word repetition — same word repeated involuntarily multiple times",
    duration: 7,
    stutterType: "Word (-w)",
    severity: "Severe",
    speaker: "Male Speaker A",
    stutterCount: 3,
    annotatedTranscript: "ہمیں [لفظ]وہاں وہاں وہاں[/لفظ] جانا ہوگا، اس سے پہلے کہ بہت دیر ہو جائے",
    plainTranscript: "ہمیں وہاں جانا ہوگا، اس سے پہلے کہ بہت دیر ہو جائے",
    stutterMarkers: [
      { start: 1, end: 3, type: "word_repetition", label: "وہاں وہاں وہاں" }
    ],
    totalWords: 16,
    disfluencyCount: 3,
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
    speaker: "Male Speaker C",
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
  "T10-Sy": {
    severityScore: 52,
    totalWords: 10,
    disfluencyCount: 2,
    avgDuration: 1.8,
    confidence: 94,
    stutterTypes: [
      { type: "Takrar (Repetitions)", urdu: "تکرار", count: 2, color: "bg-primary", percent: 100 },
      { type: "Tawalat (Prolongations)", urdu: "طوالت", count: 0, color: "bg-accent", percent: 0 },
      { type: "Rukawat (Blocks)", urdu: "رکاوٹ", count: 0, color: "bg-secondary", percent: 0 }
    ],
    transcript: "اچھا [حرف] م... م... [/حرف] مجھے اتنا مزہ نہیں آ رہا.",
    highlightedWords: [1, 2]
  },
  "T20-p": {
    severityScore: 45,
    totalWords: 15,
    disfluencyCount: 1,
    avgDuration: 2.1,
    confidence: 88,
    stutterTypes: [
      { type: "Takrar (Repetitions)", urdu: "تکرار", count: 0, color: "bg-primary", percent: 0 },
      { type: "Tawalat (Prolongations)", urdu: "طوالت", count: 0, color: "bg-accent", percent: 0 },
      { type: "Rukawat (Blocks)", urdu: "رکاوٹ", count: 1, color: "bg-secondary", percent: 100 }
    ],
    transcript: "میں نے اس کا [حرف] ..... [/حرف] انتظار کیا.",
    highlightedWords: [4]
  },
  "T30-w": {
    severityScore: 78,
    totalWords: 12,
    disfluencyCount: 3,
    avgDuration: 1.2,
    confidence: 91,
    stutterTypes: [
      { type: "Takrar (Repetitions)", urdu: "تکرار", count: 3, color: "bg-primary", percent: 100 },
      { type: "Tawalat (Prolongations)", urdu: "طوالت", count: 0, color: "bg-accent", percent: 0 },
      { type: "Rukawat (Blocks)", urdu: "رکاوٹ", count: 0, color: "bg-secondary", percent: 0 }
    ],
    transcript: "وہ [لفظ] کل کل کل [/لفظ] آئے گا.",
    highlightedWords: [1, 2, 3]
  }
};