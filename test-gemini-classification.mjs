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

const SYSTEM_INSTRUCTION = `You are an expert clinical speech-language pathologist specialising in Urdu fluency disorders and stuttering analysis. You analyse audio recordings of Urdu speech and identify stuttering events with precision. You always respond in valid JSON only — never in prose or markdown.`;

const ANALYSIS_PROMPT = `STEP 1 — LISTEN FIRST
Before doing anything else, listen to the entire audio clip. Note:
- Is there any speech at all?
- Is the speech in Urdu?
- Are there any disfluencies (repetitions, prolongations, blocks)?
- How clear is the audio quality?

Only after fully listening, proceed with the analysis below.

═══════════════════════════════════════════
STEP 2 — STUTTER TAXONOMY (ASHA standard, Urdu adapted)
═══════════════════════════════════════════

1. Takrar – تکرار (Repetitions)
   What it sounds like: a sound, syllable, or whole word repeated involuntarily
   Examples: ک-ک-کام (syllable), مجھے مجھے جانا (word), میں چاہتا میں چاہتا ہوں (phrase)
   Key marker: speaker does NOT intend the repetition — there is effort or struggle

2. Tawalat – طوالت (Prolongations)
   What it sounds like: a vowel or consonant held longer than natural (>0.5 seconds)
   Examples: سسسسنو، آآآج، ممممما
   Key marker: unnatural lengthening, often with rising pitch or audible tension on release

3. Rukawat – رکاوٹ (Blocks)
   What it sounds like: a complete stop or silent hold before/during a word, then sudden release
   Examples: [silent hold of 0.5s+]…کام، [tense silence]…بات
   Key marker: audible tension before or after the silence, not just a natural pause between sentences

DO NOT count these as stutters:
• Filler sounds: اممم، آہ، ہاں، ٹھیک ہے — these are natural speech
• Normal sentence restarts with no struggle: speaker casually restarts a thought
• Deliberate emphatic repetition for effect (speaker sounds relaxed, no effort)
• Silence between sentences or natural pauses at punctuation
• Background noise, music, or non-speech sounds

IMPORTANT — SYNTHETIC/TTS AUDIO:
This audio may be computer-generated (ElevenLabs TTS). TTS-synthesised stutters sound different from real speech:
• TTS Takrar (repetition): the syllable or word is clearly repeated — e.g. "ک ک کام", "مجھے مجھے". It does NOT sound like a prolongation even if the transition is smooth.
• TTS Rukawat (block): appears as a silent gap (≥0.3s) immediately before a word starts, followed by an abrupt word onset. There is NO audible tension in TTS — detect by the silence alone. Do not classify as Tawalat unless a vowel/consonant is audibly stretched.
• TTS Tawalat (prolongation): the vowel or consonant is audibly stretched/held — e.g. "سسسنو". This is distinct from a repetition.
• Do NOT confuse smooth TTS transitions between repeated syllables with prolongations — if the same sound occurs twice in a row, it is a repetition (Takrar), not a prolongation (Tawalat).
• Do not penalise confidence for clean audio — clean TTS should score 85–100 confidence.

═══════════════════════════════════════════
STEP 3 — SEVERITY FORMULA
═══════════════════════════════════════════

Step 3a — Weighted event score:
  weighted = (takrar_count × 1.0) + (tawalat_count × 1.5) + (rukawat_count × 2.0)

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
  • Any rukawat (block) with struggle in a clip under 10 words  →  severityScore ≥ 35
  • disfluencyCount ≥ 3  →  severityScore ≥ 25

═══════════════════════════════════════════
STEP 4 — TRANSCRIPT, highlightedWords, PERCENT, avgDuration, confidence
═══════════════════════════════════════════
• Transcript: write every word spoken; wrap stuttered tokens in *asterisks*
• totalWords: count of intended lexical words (not stutter tokens)
• highlightedWords: 0-indexed positions of *asterisk-wrapped* tokens after splitting on whitespace
• percent: round(count / max(disfluencyCount,1) × 100), must sum to 100
• avgDuration: estimated seconds per event (0.3 easy rep → 2.0 block)
• confidence: 85-100 clear unambiguous, 65-84 mild ambiguity, 40-64 hard to tell, <40 inaudible
  NOTE: Clean TTS audio = high confidence (85+), not low.

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
    {"type": "Takrar (Repetitions)",    "urdu": "تکرار", "count": <int>, "percent": <int>},
    {"type": "Tawalat (Prolongations)", "urdu": "طوالت", "count": <int>, "percent": <int>},
    {"type": "Rukawat (Blocks)",        "urdu": "رکاوٹ", "count": <int>, "percent": <int>}
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
  const takrar  = stutterTypes.find(t => t.type.includes('Takrar'))?.count  ?? 0;
  const tawalat = stutterTypes.find(t => t.type.includes('Tawalat'))?.count ?? 0;
  const rukawat = stutterTypes.find(t => t.type.includes('Rukawat'))?.count ?? 0;
  const dominant = Math.max(takrar, tawalat, rukawat);
  if (dominant === rukawat && rukawat > 0) return 'rukawat_block';
  if (dominant === tawalat && tawalat > 0) return 'tawalat_prolongation';
  return 'takrar';   // covers both syllable and word repetition
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

      const takrar  = analysis.stutterTypes?.find(t => t.type.includes('Takrar'))?.count  ?? '?';
      const rukawat = analysis.stutterTypes?.find(t => t.type.includes('Rukawat'))?.count ?? '?';
      const tawalat = analysis.stutterTypes?.find(t => t.type.includes('Tawalat'))?.count ?? '?';

      console.log(
        `${ok ? '✅' : '❌'} ${pred.padEnd(22)} ` +
        `sev:${String(analysis.severityScore).padStart(3)}  ` +
        `conf:${String(analysis.confidence).padStart(3)}  ` +
        `T:${takrar} P:${tawalat} B:${rukawat}`
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
