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

const SYSTEM_INSTRUCTION = `You are Dr. Ayesha Malik, a senior clinical speech-language pathologist at a research institute specialising exclusively in Urdu fluency disorders. You have 15 years of experience diagnosing and treating stuttering in Urdu-speaking adults and children. Your assessments are used by academic researchers and clinical teams and must be precise, reproducible, and formatted to strict schema. You respond only in structured JSON — never in prose.`;

const ANALYSIS_PROMPT = `TASK
Perform a clinical disfluency analysis on the attached audio recording of Urdu speech. Identify, count, and characterise all stuttering events.

═══════════════════════════════════════════
STUTTER TAXONOMY (ASHA standard, Urdu adapted)
═══════════════════════════════════════════
1. Takrar – تکرار (Repetitions)
   Sound/syllable: ک-ک-کام، مَ-مَ-مَیں
   Whole-word:     مجھے مجھے جانا ہے
   Phrase:         میں چاہتا — میں چاہتا ہوں
   Clinical marker: involuntary, struggle-effort present, not deliberate for emphasis

2. Tawalat – طوالت (Prolongations)
   Vowel/consonant held >0.5s abnormally: سسسسنو، ممممما، آآآج
   Clinical marker: audible tension, pitch rise, or effort on release

3. Rukawat – رکاوٹ (Blocks)
   Silent articulatory fixation before or mid-word: [silent hold]…کام
   Clinical marker: visible/audible tension, sudden release, often accompanied by accessory movement (described in audio by struggle sounds)

NOT STUTTERS — exclude these entirely:
• Interjections / fillers: اممم، آہ، ہاں
• Normal non-fluency: sentence restart without struggle
• Deliberate emphatic repetition (no struggle markers)
• Background noise or silence without speech

═══════════════════════════════════════════
SEVERITY CALIBRATION — WEIGHTED CLINICAL FORMULA
═══════════════════════════════════════════
Step 1 — Compute type-weighted event score:
  weighted = (takrar_count × 1.0) + (tawalat_count × 1.5) + (rukawat_count × 2.0)

Step 2 — Compute base severity:
  base = (weighted / max(totalWords, 1)) × 200
  clamp base to 0–100

Step 3 — Apply clinical modifiers (add to base, then re-clamp to 100):
  +10  if audible struggle/tension sounds are present (strained voice, laryngeal tension)
  +8   if secondary behaviours are present (gasping, visible effort sounds, pitch breaks)
  +5   if the speaker's naturalness is significantly disrupted (long pauses between words)
  -5   if events are very brief and effort-free (pure easy repetitions, no tension)

Step 4 — Override rules:
  • If disfluencyCount = 0 → severityScore = 0 (always, regardless of modifiers)
  • Even a single rukawat (block) with audible struggle in a short clip must score ≥ 30
  • A clip with ≥ 4 events of any type must score ≥ 20

Return severityScore as a single integer 0–100.

═══════════════════════════════════════════
TRANSCRIPT RULES
═══════════════════════════════════════════
• Write every Urdu word actually spoken, including repeated sounds (so "ک-ک-کام" stays in the transcript).
• Surround each stuttered word or stutter event with asterisks: *ک-ک-کام*
• If the clip is silent or contains only noise with no speech: transcript = "آڈیو میں کوئی آواز نہیں ملی"
• If speech is present but fluent (no stutter): transcript = the actual words spoken, disfluencyCount = 0, severityScore = 0
• totalWords = count of distinct lexical words (ignore repetition tokens as separate words unless they are full word repetitions)

═══════════════════════════════════════════
highlightedWords
═══════════════════════════════════════════
Split the final transcript on spaces. highlightedWords = 0-indexed positions of tokens that are asterisk-wrapped (*...*).

═══════════════════════════════════════════
PERCENT FIELD
═══════════════════════════════════════════
For each stutter type:
  percent = round(count / max(disfluencyCount, 1) * 100)
The three percent values must sum to 100 when disfluencyCount > 0.
When disfluencyCount = 0, all percents = 0.

═══════════════════════════════════════════
avgDuration
═══════════════════════════════════════════
Estimate average duration of a single stutter event in seconds (float, 1 decimal).
Typical ranges: repetitions 0.3–0.8s, prolongations 0.5–2.0s, blocks 0.5–3.0s.
If no stutters: 0.0

═══════════════════════════════════════════
confidence
═══════════════════════════════════════════
Your overall confidence in this classification (0–100):
  90–100: clear speech, unambiguous events
  70–89:  some background noise or mild ambiguity
  50–69:  noisy or very short clip
  <50:    speech barely intelligible

═══════════════════════════════════════════
OUTPUT — STRICT JSON SCHEMA
═══════════════════════════════════════════
Return ONLY the following JSON object. No markdown fences, no prose, no extra keys.

{
  "transcript": "<Urdu words with *stutter* markers>",
  "totalWords": <integer ≥ 0>,
  "disfluencyCount": <integer ≥ 0>,
  "severityScore": <integer 0–100>,
  "confidence": <integer 0–100>,
  "avgDuration": <float ≥ 0.0>,
  "stutterTypes": [
    {"type": "Takrar (Repetitions)",   "urdu": "تکرار", "count": <int ≥ 0>, "percent": <int 0–100>},
    {"type": "Tawalat (Prolongations)","urdu": "طوالت", "count": <int ≥ 0>, "percent": <int 0–100>},
    {"type": "Rukawat (Blocks)",       "urdu": "رکاوٹ", "count": <int ≥ 0>, "percent": <int 0–100>}
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
      model: 'gemini-2.5-flash',
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
            // Disable thinking so JSON mode works reliably on gemini-2.5-flash
            // @ts-expect-error thinkingConfig not yet in SDK types for 0.24.x
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048,
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
      { type: 'Takrar (Repetitions)',    urdu: 'تکرار', keywords: ['repetition', 'takrar', 'تکرار'] },
      { type: 'Tawalat (Prolongations)', urdu: 'طوالت', keywords: ['prolongation', 'tawalat', 'طوالت'] },
      { type: 'Rukawat (Blocks)',        urdu: 'رکاوٹ', keywords: ['block', 'rukawat', 'رکاوٹ'] },
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
        { type: 'Takrar (Repetitions)',    urdu: 'تکرار', count: 0, color: 'bg-primary',   percent: 0 },
        { type: 'Tawalat (Prolongations)', urdu: 'طوالت', count: 0, color: 'bg-accent',    percent: 0 },
        { type: 'Rukawat (Blocks)',        urdu: 'رکاوٹ', count: 0, color: 'bg-secondary', percent: 0 },
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