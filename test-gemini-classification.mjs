/**
 * Live Gemini classification test using real labelled dataset samples.
 * Ground truth from filename suffix: -Sy = syllable repetition, -p = block/pause, -w = word repetition
 * Files with no suffix = assumed fluent/clean.
 *
 * Usage: node test-gemini-classification.mjs
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.VITE_GEMINI_API_KEY;
const DATASET_DIR = './Dataset/Audios';

// ─── Same prompt as src/lib/gemini.ts ──────────────────────────────────────

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
Examples: "ج ج جاتی", "ک-ک-کام", "بب بات"
Decision rule: If the repeated unit is a FRAGMENT of a word → Syllable Level.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 2 — Word Level  (لفظ سطح)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What it is: Involuntary repetition of a COMPLETE word.
Examples: "سائز سائز بڑا", "میں میں جانا", "یہ یہ کتاب"
Decision rule: If the repeated unit is a FULL word → Word Level.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPE 3 — Pause / Block Level  (وقفہ / رکاوٹ)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What it is: A stoppage, stretch, or stuck onset — NO repetition. Covers:
  A) Hard Block: silent hold (≥0.3s) before a word onset with abrupt/tense release
  B) Prolongation: a single vowel or consonant held abnormally long (>0.5s), e.g. "سسسسنو"
  C) Tense Pause: abnormal within-phrase hesitation with audible effort or pitch rise
Decision rule: No repetition of any unit, but a stoppage, stretch, or stuck start → Pause/Block Level.

DISAMBIGUATION:
• Sound fragment 2+ times → Syllable Level
• Full word 2+ times → Word Level
• Sound once but stretched → Pause/Block Level
• Silent gap before word → Pause/Block Level

DO NOT count: fillers (اممم، آہ، ہاں)، natural pauses at sentence boundaries, deliberate emphatic repetition, background noise.

SYNTHETIC/TTS AUDIO: TTS stutters are clean but still classifiable:
• TTS Syllable Level: phoneme/syllable fragment repeated 2+ times before full word — "ج ج جاتی"
• TTS Word Level: complete word repeated twice in a row — "سائز سائز"
• TTS Pause/Block: silent gap (≥0.3s) before word onset, or audibly stretched vowel/consonant
• Clean TTS = high confidence (85–100), not low.

═══════════════════════════════════════════
STEP 3 — SEVERITY FORMULA
═══════════════════════════════════════════

Step 3a — Weighted event score:
  weighted = (syllable_level_count × 1.0) + (word_level_count × 1.5) + (pause_block_level_count × 2.0)

Step 3b — Base severity:
  base = (weighted / max(totalWords, 1)) × 100
  Clamp base to 0–100.

Step 3c — Clinical modifiers:
  +15  audible struggle, strained voice, laryngeal tension heard
  +10  secondary behaviours: gasping, pitch breaks, audible effort on release
  +5   speech naturalness severely disrupted (long unexpected pauses mid-word)
  -10  events are entirely effort-free and very brief (easy relaxed repetitions only)

Step 3d — Override rules:
  • disfluencyCount = 0  →  severityScore = 0
  • Any Pause/Block Level with struggle in a clip under 10 words  →  severityScore ≥ 35
  • disfluencyCount ≥ 3  →  severityScore ≥ 25

═══════════════════════════════════════════
STEP 4 — TRANSCRIPT, highlightedWords, PERCENT, avgDuration, confidence
═══════════════════════════════════════════
• Transcript: write every word spoken; wrap stuttered tokens in *asterisks*
• totalWords: count of intended lexical words (not stutter tokens)
• highlightedWords: 0-indexed positions of *asterisk-wrapped* tokens after splitting on whitespace
• percent: round(count / max(disfluencyCount,1) × 100), must sum to 100
• avgDuration: estimated seconds per event (0.3 syllable rep → 0.5–0.8 word rep → 0.8–2.0 pause/block)
• confidence: 85-100 clear unambiguous, 65-84 mild ambiguity, 40-64 hard to tell, <40 inaudible

═══════════════════════════════════════════
OUTPUT — STRICT JSON SCHEMA
═══════════════════════════════════════════
Return ONLY this JSON. No markdown, no prose, no extra keys.

{
  "transcript": "<Urdu with *stutter* markers>",
  "totalWords": <int ≥ 0>,
  "disfluencyCount": <int ≥ 0>,
  "severityScore": <int 0-100>,
  "confidence": <int 0-100>,
  "avgDuration": <float ≥ 0.0>,
  "stutterTypes": [
    {"type": "Syllable Level",     "urdu": "حرف سطح",      "count": <int>, "percent": <int>},
    {"type": "Word Level",         "urdu": "لفظ سطح",      "count": <int>, "percent": <int>},
    {"type": "Pause / Block Level","urdu": "وقفہ / رکاوٹ", "count": <int>, "percent": <int>}
  ],
  "highlightedWords": [<0-indexed ints>]
}`;

// ─── Ground truth from transcription filenames ────────────────────────────
// Audio files like T1.mp3 may have no suffix, but T1-Sy.rtf tells us the label.

function buildGroundTruthMap(transcriptionDir) {
  const map = {};
  const files = readdirSync(transcriptionDir);
  for (const f of files) {
    // e.g. "T41-Sy.rtf" → base "T41", label "Sy"
    const m = f.match(/^(T\d+)[- ](Sy|p|w)\.rtf$/i);
    if (!m) continue;
    const base  = m[1];          // "T41"
    const label = m[2].toLowerCase(); // "sy", "p", "w"
    map[base] = label;
  }
  return map;
}

function getGroundTruth(filename, gtMap) {
  // Strip extension and optional suffix to get base key e.g. "T10-Sy.mp3" → "T10"
  const base = filename.replace('.mp3', '').replace(/[-_ ](Sy|p|w)$/i, '');
  const label = gtMap[base];
  if (!label) return 'unknown';
  if (label === 'sy') return 'takrar_syllable';
  if (label === 'w')  return 'takrar_word';
  if (label === 'p')  return 'rukawat_block';
  return 'unknown';
}

function getPredicted(result) {
  const { stutterTypes, disfluencyCount } = result;
  if (disfluencyCount === 0) return 'clean';
  const syllable  = stutterTypes.find(t => t.type.toLowerCase().includes('syllable'))?.count ?? 0;
  const word      = stutterTypes.find(t => t.type.toLowerCase().includes('word'))?.count     ?? 0;
  const pauseBlock= stutterTypes.find(t => t.type.toLowerCase().includes('pause') || t.type.toLowerCase().includes('block'))?.count ?? 0;
  const dominant  = Math.max(syllable, word, pauseBlock);
  if (dominant === pauseBlock && pauseBlock > 0) return 'rukawat_block';
  if (dominant === word && word > 0) return 'takrar_word';
  return 'takrar_syllable';
}

function isCorrect(gt, pred) {
  if (gt === 'clean')           return pred === 'clean';
  if (gt === 'takrar_syllable') return pred === 'takrar' || pred === 'takrar_syllable';
  if (gt === 'takrar_word')     return pred === 'takrar' || pred === 'takrar_word';
  if (gt === 'rukawat_block')   return pred === 'rukawat_block';
  return false;
}

async function analyseFile(model, filePath, mimeType = 'audio/mpeg') {
  const audioBuffer = readFileSync(filePath);
  const audioBase64 = audioBuffer.toString('base64');

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: ANALYSIS_PROMPT },
      ],
    }],
    generationConfig: {
      thinkingConfig: { thinkingBudget: 8000 },
      responseMimeType: 'application/json',
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 8192,
    },
  });

  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Non-JSON response: ' + text.slice(0, 200));
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) { console.error('❌ VITE_GEMINI_API_KEY not set in .env.local'); process.exit(1); }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const gtMap = buildGroundTruthMap('./Dataset/Transcriptions');

  // Pick 3 samples per class using correct ground truth from transcriptions
  const all = readdirSync(DATASET_DIR).filter(f => f.endsWith('.mp3'));
  const bySy    = all.filter(f => getGroundTruth(f, gtMap) === 'takrar_syllable').slice(0, 3);
  const byBlock = all.filter(f => getGroundTruth(f, gtMap) === 'rukawat_block').slice(0, 3);
  const byWord  = all.filter(f => getGroundTruth(f, gtMap) === 'takrar_word').slice(0, 3);
  const samples = [...bySy, ...byBlock, ...byWord];

  console.log(`\n🎙  StutterNet+ — Gemini Classification Test`);
  console.log(`   Model : gemini-2.5-pro  |  thinkingBudget: 8000`);
  console.log(`   Samples: ${samples.length} (3×Sy + 3×Block + 3×Word) — GT from transcription labels\n`);
  console.log('─'.repeat(80));

  let correct = 0;
  const results = [];

  for (const filename of samples) {
    const gt = getGroundTruth(filename, gtMap);
    process.stdout.write(`  ${filename.padEnd(20)} GT: ${gt.padEnd(20)} → `);

    try {
      const analysis = await analyseFile(model, join(DATASET_DIR, filename));
      const pred     = getPredicted(analysis);
      const ok       = isCorrect(gt, pred);
      if (ok) correct++;

      const syllable  = analysis.stutterTypes?.find(t => t.type.toLowerCase().includes('syllable'))?.count   ?? '?';
      const wordLvl   = analysis.stutterTypes?.find(t => t.type.toLowerCase().includes('word'))?.count      ?? '?';
      const pauseBlk  = analysis.stutterTypes?.find(t => t.type.toLowerCase().includes('pause') || t.type.toLowerCase().includes('block'))?.count ?? '?';

      console.log(
        `${ok ? '✅' : '❌'} ${pred.padEnd(22)} ` +
        `sev:${String(analysis.severityScore).padStart(3)}  ` +
        `conf:${String(analysis.confidence).padStart(3)}  ` +
        `Sy:${syllable} W:${wordLvl} Pb:${pauseBlk}`
      );

      results.push({ filename, gt, pred, ok, ...analysis });

      // Polite rate-limiting: 1.5s between calls
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.log(`💥 ERROR — ${err.message}`);
      results.push({ filename, gt, pred: 'error', ok: false, error: err.message });
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('─'.repeat(80));
  const accuracy = ((correct / samples.length) * 100).toFixed(1);
  console.log(`\n📊  Results: ${correct}/${samples.length} correct  →  Accuracy: ${accuracy}%\n`);

  // Per-class breakdown
  const classes = ['takrar_syllable', 'takrar_word', 'rukawat_block', 'clean'];
  for (const cls of classes) {
    const group = results.filter(r => r.gt === cls);
    if (!group.length) continue;
    const hits = group.filter(r => r.ok).length;
    console.log(`   ${cls.padEnd(22)}: ${hits}/${group.length}`);
  }

  // Severity & confidence averages
  const valid = results.filter(r => r.severityScore !== undefined);
  const avgSev  = (valid.reduce((s, r) => s + r.severityScore,  0) / valid.length).toFixed(1);
  const avgConf = (valid.reduce((s, r) => s + r.confidence, 0) / valid.length).toFixed(1);
  console.log(`\n   Avg severity : ${avgSev}  |  Avg confidence : ${avgConf}`);
  console.log(`\n   (confidence >70 on TTS audio = prompt fix working ✅)\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
