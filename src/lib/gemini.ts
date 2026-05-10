import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'your-api-key-here');

export interface AudioAnalysisResult {
  transcript: string;
  stutterTypes: Array<{
    type: string;
    urdu: string;
    count: number;
    color: string;
    percent: number;
  }>;
  totalWords: number;
  disfluencyCount: number;
  severityScore: number;
  confidence: number;
  avgDuration: number;
  highlightedWords: number[];
  isGeminiAnalysis?: boolean;
  error?: string;
}

// ─── Prompt ────────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are an expert clinical speech-language pathologist specialising in Urdu fluency disorders and stuttering analysis. You analyse audio recordings of Urdu speech and identify stuttering events with precision. You classify every stutter event into exactly one of three levels: Syllable Level, Word Level, or Pause/Block Level. You always respond in valid JSON only — never in prose or markdown.`;

const ANALYSIS_PROMPT = `STEP 1 — LISTEN FIRST
Before doing anything else, listen to the entire audio clip. Note:
- Is there any speech at all?
- Is the speech in Urdu?
- Are there any disfluencies (partial-word repetitions, whole-word repetitions, prolongations, blocks, or tense pauses)?
- How clear is the audio quality?

Only after fully listening, proceed with the analysis below.

═══════════════════════════════════════════
STEP 2 — STUTTER TAXONOMY (3-Level Clinical Classification)
═══════════════════════════════════════════

Use EXACTLY these three types. Every stutter event must be classified into one and only one type.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 1 — Syllable Level  (حرف سطح)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What it is: Involuntary repetition of a PARTIAL word — a phoneme, onset, or syllable fragment is repeated before the full word completes.
Acoustic cues:
  • A sound or syllable occurs 2+ times before the complete word is produced
  • The repeated unit is LESS THAN a full word (ج-ج-جاتی, ک-ک-کام, م-م-ماما)
  • May sound like stuttered onset even in TTS audio
Examples:
  • "ج ج جاتی" — /j/ onset repeated twice before "جاتی"
  • "ک-ک-کام" — /k/ repeated before "کام"
  • "بب بات" — /b/ repeated before "بات"
Decision rule: If the repeated unit is a fragment of a word (not the whole word) → Syllable Level.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 2 — Word Level  (لفظ سطح)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What it is: Involuntary repetition of a COMPLETE word or short phrase.
Acoustic cues:
  • An entire lexical word appears 2+ times in immediate succession
  • The repeated unit IS a complete, recognisable Urdu word
  • May also include part-phrase repetitions where a grammatical unit repeats
Examples:
  • "سائز سائز بڑا" — whole word "سائز" repeated
  • "میں میں جانا" — pronoun "میں" repeated
  • "یہ یہ کتاب" — demonstrative "یہ" repeated
Decision rule: If the repeated unit is a FULL word → Word Level.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 3 — Pause / Block Level  (وقفہ / رکاوٹ)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What it is: A complete stoppage of airflow/voice, or an abnormally stretched sound — the speaker cannot start or sustain phonation fluently.
This type covers THREE related phenomena:
  A) Hard Block: silent articulatory hold (≥0.3s) before a word, followed by abrupt or tense release
     Example: [silent hold]…کام, [tense silence]…بات
  B) Prolongation / Sound Stretch: a single vowel or consonant held far beyond its natural length (>0.5s)
     Example: سسسسنو، آآآج، ممممما — ONE occurrence stretched, not repeated
  C) Tense Pause: abnormal hesitation WITHIN a phrase (not at a natural sentence boundary) accompanied by visible/audible effort, pitch rise, or laryngeal tension
Decision rule: If there is NO repetition of a unit, but instead a stoppage, stretch, or stuck onset → Pause/Block Level.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISAMBIGUATION GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Sound occurs 2+ times as a FRAGMENT → Syllable Level (NOT Pause/Block)
• Complete word occurs 2+ times → Word Level (NOT Syllable Level)
• Sound occurs exactly ONCE but is stretched unnaturally → Pause/Block Level (prolongation)
• Silent gap before word onset (≥0.3s) → Pause/Block Level (block)
• "ج ج جاتی" — 2 fragments + full word → Syllable Level (count = 1 event)
• "سائز سائز" — full word twice → Word Level (count = 1 event)

DO NOT count these as stutters:
• Filler sounds: اممم، آہ، ہاں، ٹھیک ہے — these are natural speech
• Normal sentence restarts with no struggle
• Deliberate emphatic repetition (speaker sounds relaxed, no effort)
• Silence between sentences or natural pauses at punctuation
• Background noise, music, or non-speech sounds

IMPORTANT — SYNTHETIC/TTS AUDIO:
This audio may be computer-generated (ElevenLabs TTS). TTS-synthesised stutters sound clean but are still classifiable:
• TTS Syllable Level: partial phoneme/syllable fragment appears 2+ times before the full word — e.g. "ج ج جاتی". Classify as Syllable Level even if the transitions sound smooth.
• TTS Word Level: a complete word appears twice in a row — e.g. "سائز سائز". Classify as Word Level.
• TTS Pause/Block: detect a silent gap (≥0.3s) before a word onset, or an unnaturally stretched vowel/consonant. No audible tension needed in TTS — detect by timing alone.
• Do not penalise confidence for clean audio — clean TTS should score 85–100 confidence.

═══════════════════════════════════════════
STEP 3 — SEVERITY FORMULA
═══════════════════════════════════════════

Step 3a — Weighted event score:
  weighted = (syllable_level_count × 1.0) + (word_level_count × 1.5) + (pause_block_level_count × 2.0)

Step 3b — Base severity (use totalWords of the FULL sentence, not counting stutter tokens):
  base = (weighted / max(totalWords, 1)) × 100
  Clamp base to 0–100.

  Quick reference:
  • 1 syllable-level event in 10 words  → base ≈ 10  (Very Mild)
  • 1 word-level event in 10 words      → base ≈ 15  (Very Mild)
  • 1 pause/block event in 6 words      → base ≈ 33  (Mild)
  • 3 mixed events in 8 words           → base ≈ 44  (Moderate)

Step 3c — Clinical modifiers (add/subtract, then re-clamp 0–100):
  +15  audible struggle, strained voice, laryngeal tension heard
  +10  secondary behaviours: gasping, pitch breaks, audible effort on release
  +5   speech naturalness severely disrupted (long unexpected pauses mid-word)
  -10  events are entirely effort-free and very brief (easy relaxed repetitions only)

Step 3d — Override rules:
  • disfluencyCount = 0  →  severityScore = 0  (hard rule, no exceptions)
  • Any Pause/Block Level event with struggle present in a clip under 10 words  →  severityScore ≥ 35
  • disfluencyCount ≥ 3 in any clip  →  severityScore ≥ 25

Severity bands for reference:
  0       = Fluent
  1–20    = Very Mild
  21–40   = Mild
  41–60   = Moderate
  61–80   = Severe
  81–100  = Very Severe

═══════════════════════════════════════════
STEP 4 — TRANSCRIPT
═══════════════════════════════════════════
• Write every word actually spoken in the audio, in the order spoken.
• Include stutter tokens (e.g. write "ک-ک-کام" not just "کام") so the listener can verify.
• Wrap ONLY stuttered tokens in asterisks: *ک-ک-کام*
• Do NOT wrap clean words in asterisks.
• No speech detected → transcript = "آڈیو میں کوئی آواز نہیں ملی"
• Speech present but fully fluent → transcript = actual words, no asterisks
• totalWords = count of meaningful lexical words in the intended sentence (do NOT count repeated stutter tokens as extra words — count the word once)

═══════════════════════════════════════════
STEP 5 — highlightedWords
═══════════════════════════════════════════
Split the transcript string on whitespace. highlightedWords = array of 0-based integer positions of all tokens that are wrapped in asterisks (*token*).
Example: transcript "میں *ک-ک-کام* کرتا ہوں" → split → ["میں","*ک-ک-کام*","کرتا","ہوں"] → highlightedWords = [1]

═══════════════════════════════════════════
STEP 6 — PERCENT
═══════════════════════════════════════════
For each type: percent = round(count / max(disfluencyCount, 1) × 100)
All three percents must sum exactly to 100 when disfluencyCount > 0.
Adjust the largest value if rounding causes drift.
When disfluencyCount = 0: all percents = 0.

═══════════════════════════════════════════
STEP 7 — avgDuration
═══════════════════════════════════════════
Estimate the average duration in seconds of a single stutter event based on what you heard.
Use these anchors:
  Syllable-level repetition (1–2 extra iterations): 0.3s
  Word-level repetition: 0.5–0.8s
  Pause/Block (prolongation or block with tension): 0.8–2.0s
  No stutters: 0.0

═══════════════════════════════════════════
STEP 8 — confidence
═══════════════════════════════════════════
Your confidence in the CLASSIFICATION (not audio quality):
  85–100: speech is clear, you can hear each word distinctly, stutter events (if any) are unambiguous
  65–84:  some mild ambiguity — one event could belong to a different level
  40–64:  significant ambiguity — multiple events hard to classify, or very short clip
  <40:    speech barely intelligible or too noisy to classify reliably

NOTE: Clean TTS/synthetic audio should score 85–100 confidence if the speech is clear.
Do NOT give low confidence just because a clip is short — base it on clarity and ambiguity only.

═══════════════════════════════════════════
OUTPUT — STRICT JSON SCHEMA
═══════════════════════════════════════════
Return ONLY this JSON object. No markdown fences, no explanation, no extra keys.

{
  "transcript": "<Urdu words, stuttered tokens wrapped in *asterisks*>",
  "totalWords": <integer ≥ 0>,
  "disfluencyCount": <integer ≥ 0>,
  "severityScore": <integer 0–100>,
  "confidence": <integer 0–100>,
  "avgDuration": <float ≥ 0.0>,
  "stutterTypes": [
    {"type": "Syllable Level",     "urdu": "حرف سطح",      "count": <int ≥ 0>, "percent": <int 0–100>},
    {"type": "Word Level",         "urdu": "لفظ سطح",      "count": <int ≥ 0>, "percent": <int 0–100>},
    {"type": "Pause / Block Level","urdu": "وقفہ / رکاوٹ", "count": <int ≥ 0>, "percent": <int 0–100>}
  ],
  "highlightedWords": [<0-indexed integers>]
}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Clamp + normalise percents so the three values always sum to 100. */
function normalisePercents(types: Array<{ count: number; percent: number }>, total: number): number[] {
  if (total === 0) return [0, 0, 0];
  const raw = types.map(t => (t.count / total) * 100);
  const sum = raw.reduce((a, b) => a + b, 0);
  const normed = sum > 0 ? raw.map(v => Math.round((v / sum) * 100)) : [0, 0, 0];
  // Fix rounding drift on the largest value
  const drift = 100 - normed.reduce((a, b) => a + b, 0);
  const maxIdx = normed.indexOf(Math.max(...normed));
  normed[maxIdx] += drift;
  return normed;
}

// ─── Main export ────────────────────────────────────────────────────────────

export const analyzeAudioWithGemini = async (audioBlob: Blob): Promise<AudioAnalysisResult> => {
  console.log('[Gemini] Starting analysis — blob:', audioBlob.size, 'bytes,', audioBlob.type);

  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.local');
    }

    // Convert blob → base64 (chunked to avoid stack overflow)
    const audioBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
    }
    const audioBase64 = btoa(binary);

    const safeMimeType = audioBlob.type?.startsWith('audio/') ? audioBlob.type : 'audio/webm;codecs=opus';

    console.log('[Gemini] Audio encoded, length:', audioBase64.length);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    let result;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: safeMimeType, data: audioBase64 } },
              { text: ANALYSIS_PROMPT },
            ],
          }],
          generationConfig: {
            // Allow the model to think — critical for accurate audio classification
            // @ts-expect-error thinkingConfig not yet in SDK types for 0.24.x
            thinkingConfig: { thinkingBudget: 8000 },
            responseMimeType: 'application/json',
            temperature: 0.1,
            topP: 0.9,
            maxOutputTokens: 8192,
          },
        });
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[Gemini] Attempt ${attempt}/3 failed:`, lastError.message);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
    if (!result) throw lastError ?? new Error('Gemini API failed after 3 attempts');

    const analysisText = result.response.text();
    console.log('[Gemini] Raw response:', analysisText);

    // Parse JSON — tolerate accidental markdown fences
    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Gemini returned non-JSON response');
      analysis = JSON.parse(jsonMatch[0]);
    }

    // ── Normalise numeric fields ─────────────────────────────────────────────
    const totalDisfluency = Math.round(Number(analysis.disfluencyCount ?? 0));

    // severityScore: model may return 0-1 float or 0-100 int
    let severityScore = Number(analysis.severityScore ?? 0);
    if (severityScore <= 1 && severityScore > 0) severityScore = Math.round(severityScore * 100);
    else severityScore = Math.round(severityScore);

    // confidence: same ambiguity
    let confidence = Number(analysis.confidence ?? 0);
    if (confidence <= 1 && confidence > 0) confidence = Math.round(confidence * 100);
    else confidence = Math.round(confidence);

    // ── Normalise highlightedWords ───────────────────────────────────────────
    // Model may return: [0,1] integers OR [{word,disfluent}] objects
    let highlightedWords: number[] = [];
    if (Array.isArray(analysis.highlightedWords)) {
      const raw = analysis.highlightedWords as unknown[];
      if (raw.length > 0 && typeof raw[0] === 'number') {
        highlightedWords = raw as number[];
      } else if (raw.length > 0 && typeof raw[0] === 'object') {
        // Build index from transcript words
        const words = String(analysis.transcript ?? '').split(/\s+/);
        highlightedWords = (raw as Array<{ word?: string; disfluent?: boolean }>)
          .map((item, i) => item.disfluent ? i : -1)
          .filter(i => i >= 0)
          .filter(i => i < words.length);
      }
    }

    // ── Normalise stutterTypes ───────────────────────────────────────────────
    // Model may use different type names — match by keyword
    const COLOURS = ['bg-primary', 'bg-accent', 'bg-secondary'];
    const DEFAULTS = [
      { type: 'Syllable Level',      urdu: 'حرف سطح',      keywords: ['syllable', 'حرف سطح', 'حرف'] },
      { type: 'Word Level',          urdu: 'لفظ سطح',      keywords: ['word level', 'word', 'لفظ سطح', 'لفظ'] },
      { type: 'Pause / Block Level', urdu: 'وقفہ / رکاوٹ', keywords: ['pause', 'block', 'وقفہ', 'رکاوٹ'] },
    ];
    const rawTypes = Array.isArray(analysis.stutterTypes)
      ? (analysis.stutterTypes as Array<Record<string, unknown>>)
      : [];

    const matchedCounts = DEFAULTS.map(def => {
      const match = rawTypes.find(t =>
        def.keywords.some(kw =>
          String(t.type ?? '').toLowerCase().includes(kw) ||
          String(t.urdu ?? '').includes(kw)
        )
      );
      return match ? Math.round(Number(match.count ?? 0)) : 0;
    });

    // Re-derive totalDisfluency from matched counts if model's sum differs
    const countSum = matchedCounts.reduce((a, b) => a + b, 0);
    const effectiveTotal = countSum > 0 ? countSum : totalDisfluency;
    const normPercents = normalisePercents(
      matchedCounts.map(count => ({ count, percent: 0 })),
      effectiveTotal,
    );

    const stutterTypes = DEFAULTS.map((def, i) => ({
      type: def.type, urdu: def.urdu,
      count: matchedCounts[i], percent: normPercents[i], color: COLOURS[i],
    }));

    const finalResult: AudioAnalysisResult = {
      transcript:      String(analysis.transcript ?? ''),
      totalWords:      Math.round(Number(analysis.totalWords ?? 0)),
      disfluencyCount: effectiveTotal,
      severityScore,
      confidence,
      avgDuration:     Number(analysis.avgDuration ?? 0),
      highlightedWords,
      stutterTypes,
      isGeminiAnalysis: true,
    };

    console.log('[Gemini] Analysis complete:', finalResult);
    return finalResult;

  } catch (error) {
    console.error('[Gemini] Error:', error);
    return {
      transcript: 'خرابی: آڈیو تجزیہ ممکن نہیں — برائے کرم دوبارہ کوشش کریں',
      totalWords: 0, disfluencyCount: 0, severityScore: 0,
      confidence: 0, avgDuration: 0, highlightedWords: [],
      stutterTypes: [
        { type: 'Syllable Level',      urdu: 'حرف سطح',      count: 0, color: 'bg-primary',   percent: 0 },
        { type: 'Word Level',          urdu: 'لفظ سطح',      count: 0, color: 'bg-accent',    percent: 0 },
        { type: 'Pause / Block Level', urdu: 'وقفہ / رکاوٹ', count: 0, color: 'bg-secondary', percent: 0 },
      ],
      error: error instanceof Error ? error.message : 'Unknown error',
      isGeminiAnalysis: false,
    };
  }
};

export const validateAudioDuration = (audioBlob: Blob): Promise<boolean> => {
  // Simple validation - just check if audio exists
  console.log('📏 Validating audio:', audioBlob.size, 'bytes');
  return Promise.resolve(true);
};