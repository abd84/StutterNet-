# StutterNet+ Full Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical bugs, redesign the Dataset showcase page with real annotations and audio, rewrite the About page with accurate architecture stats, harden the Gemini API integration, and make the entire app mobile-friendly.

**Architecture:** React + TypeScript + Vite SPA (Tailwind + ShadcN). Three routes: Index (live Gemini analyzer), Dataset (research showcase), About (project info). All state is local — no server. Gemini API called client-side from `src/lib/gemini.ts`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, ShadcN/UI, React Router, @google/generative-ai SDK, Sonner (toasts)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/gemini.ts` | Modify | Fix base64 overflow, improve prompt, add retry logic |
| `src/pages/Index.tsx` | Modify | Fix broken handleAnalyze/handleAnalysisComplete crash |
| `src/components/AudioRecorder.tsx` | Modify | Fix missing formatTime function, remove dead code |
| `src/components/Navigation.tsx` | Modify | Add mobile hamburger menu |
| `src/pages/About.tsx` | Modify | Rewrite with correct architecture stats, real numbers, bottleneck section |
| `src/pages/Dataset.tsx` | Modify | Redesign as research showcase |
| `src/components/DatasetStats.tsx` | Modify | Update to real sample counts (543 total) |
| `src/components/DatasetTable.tsx` | Modify | Annotation viewer, audio player, mobile card layout |
| `src/config/constants.ts` | Modify | Enrich DEMO_DATASET with full annotation data |
| `src/App.css` | Modify | Remove Vite scaffold dead code |

---

## Task 1: Fix Critical Crash in `Index.tsx`

**Files:**
- Modify: `src/pages/Index.tsx`

The `handleAnalyze` function has duplicate `let step = 0` and `const interval` declarations and references the undefined `handleAnalysisComplete`. This crashes at runtime.

- [ ] **Step 1: Replace the entire block from `const handleAnalyze` through line ~101 in `src/pages/Index.tsx`**

```tsx
const handleAnalysisComplete = (analysis: AudioAnalysisResult | { isProcessing?: boolean } | null) => {
  if (analysis && 'isProcessing' in analysis && analysis.isProcessing) {
    // Gemini API call has started — keep isAnalyzing state, wait for result
    return;
  }

  // Clear any looping processing interval
  if (processingIntervalRef.current) {
    clearInterval(processingIntervalRef.current);
    processingIntervalRef.current = null;
  }

  // Store real Gemini analysis data if provided
  if (analysis && !('isProcessing' in analysis)) {
    setAnalysisResults(analysis as AudioAnalysisResult);
  }

  // Run 4-step visual animation then reveal results
  setIsAnalyzing(true);
  setProcessingStep(0);

  let step = 0;
  const interval = setInterval(() => {
    step++;
    setProcessingStep(step);
    if (step >= processingSteps.length - 1) {
      clearInterval(interval);
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowResults(true);
        toast.success("Analysis Complete", {
          description: "Your speech analysis is ready!"
        });
      }, 800);
    }
  }, 1200);
};

const handleAnalyze = () => {
  if (!audioData && inputMode !== 'demo') return;
  handleAnalysisComplete(null);
};
```

- [ ] **Step 2: Verify no duplicate variable declarations remain**

```bash
grep -n "let step" "/Users/abdullah/Desktop/Stutter /StutterNet-/src/pages/Index.tsx"
```

Expected: exactly one result, inside `handleAnalysisComplete`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
git add src/pages/Index.tsx
git commit -m "fix: rewrite handleAnalyze and handleAnalysisComplete — removes duplicate variable crash and undefined reference"
```

---

## Task 2: Fix Orphaned Code and Missing `formatTime` in `AudioRecorder.tsx`

**Files:**
- Modify: `src/components/AudioRecorder.tsx`

`analyzeAudio()` has dead code after the `finally` block (lines ~322–324 contain a dangling `formatTime` body). The JSX references `formatTime(recordingTime)` on line ~427 but the function is never defined.

- [ ] **Step 1: Add `formatTime` as a function inside the component, above the `return` statement**

In `src/components/AudioRecorder.tsx`, add this before `return (`:

```tsx
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
```

- [ ] **Step 2: Remove orphaned lines at end of `analyzeAudio` (the dead `formatTime` body)**

Inside `analyzeAudio`, delete these three lines that appear after `setIsAnalyzing(false)` in the `finally` block:

```
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
```

- [ ] **Step 3: Verify formatTime appears exactly twice (definition + usage)**

```bash
grep -n "formatTime" "/Users/abdullah/Desktop/Stutter /StutterNet-/src/components/AudioRecorder.tsx"
```

Expected: 2 results — the `const formatTime` definition and the JSX `formatTime(recordingTime)` call.

- [ ] **Step 4: Commit**

```bash
git add src/components/AudioRecorder.tsx
git commit -m "fix: add missing formatTime function, remove orphaned dead code in analyzeAudio"
```

---

## Task 3: Fix Gemini Base64 Overflow + Improve Prompt + Add Retry

**Files:**
- Modify: `src/lib/gemini.ts`

`btoa(String.fromCharCode(...new Uint8Array(buffer)))` crashes with "Maximum call stack size exceeded" for audio > ~1MB because spread blows the stack. The prompt also produces imprecise results — missing Urdu-specific disfluency cues.

- [ ] **Step 1: Replace the base64 conversion in `src/lib/gemini.ts`**

Find and replace:
```ts
const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
```

With:
```ts
const uint8Array = new Uint8Array(audioBuffer);
let binary = '';
const chunkSize = 8192;
for (let i = 0; i < uint8Array.length; i += chunkSize) {
  binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
}
const audioBase64 = btoa(binary);
```

- [ ] **Step 2: Add mimeType safe fallback right after the base64 conversion**

```ts
const safeMimeType = audioBlob.type && audioBlob.type.startsWith('audio/')
  ? audioBlob.type
  : 'audio/webm;codecs=opus';
```

- [ ] **Step 3: Replace the prompt string**

Replace the entire `const prompt = \`...\`` block with:

```ts
const prompt = `You are a clinical speech-language pathologist specializing in Urdu disfluency analysis.

TASK: Analyze this audio clip and identify stuttering patterns in Urdu speech.

STUTTER TYPES TO IDENTIFY:
- Takrar (تکرار): Involuntary syllable or word-level repetition. Examples: "ک-ک-کام", "مجھے مجھے پروموشن"
- Tawalat (طوالت): Abnormal, effortful sound prolongation. Examples: "سسسسنو", "ممممما"
- Rukawat (رکاوٹ): Complete articulatory arrest — a silent block mid-word or before a word, with audible tension/struggle on release

STRICT RULES:
1. No clear Urdu speech present → return all zeros, transcript = "کوئی واضح آواز نہیں ملی"
2. Natural thinking pauses ("اممم", "آہ") are NOT stutters
3. Emphasis repetition is NOT a stutter — only involuntary, struggle-marked repetitions count
4. Background noise alone = zero stutters
5. Be conservative: when uncertain, do NOT count it as a stutter

SEVERITY SCALE (stuttered words / total words):
- 0–5%: Mild — severityScore = 20
- 6–15%: Moderate — severityScore = 50
- 16–30%: Severe — severityScore = 75
- 31%+: Very Severe — severityScore = 90

TRANSCRIPT: Write the actual Urdu words heard. For stutters, write what was actually said (including the repeated sounds).

Return ONLY raw JSON — no markdown, no backticks, no explanations:
{
  "transcript": "the actual Urdu words spoken",
  "totalWords": <integer>,
  "disfluencyCount": <integer — total stutter events>,
  "severityScore": <0–100 integer>,
  "confidence": <0–100 integer — your confidence in this analysis>,
  "avgDuration": <average stutter event duration in seconds, float>,
  "stutterTypes": [
    {"type": "Takrar (Repetitions)", "urdu": "تکرار", "count": <int>, "percent": <0–100 int>},
    {"type": "Tawalat (Prolongations)", "urdu": "طوالت", "count": <int>, "percent": <0–100 int>},
    {"type": "Rukawat (Blocks)", "urdu": "رکاوٹ", "count": <int>, "percent": <0–100 int>}
  ],
  "highlightedWords": [<0-indexed word positions of stuttered words in transcript array>]
}`;
```

- [ ] **Step 4: Wrap the generateContent call with 3-attempt retry**

Replace:
```ts
const result = await model.generateContent({ ... });
```

With:
```ts
let result;
let lastError: Error | null = null;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: safeMimeType, data: audioBase64 } },
          { text: prompt }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
    break;
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    console.warn(`Gemini attempt ${attempt}/3 failed:`, lastError.message);
    if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
  }
}
if (!result) throw lastError ?? new Error('Gemini API failed after 3 attempts');
```

- [ ] **Step 5: Verify no stack-overflow base64 pattern remains**

```bash
grep -n "Uint8Array\)" "/Users/abdullah/Desktop/Stutter /StutterNet-/src/lib/gemini.ts"
```

Expected: 0 results (the old spread pattern is gone).

- [ ] **Step 6: Commit**

```bash
git add src/lib/gemini.ts
git commit -m "fix: chunked base64 encoding to prevent stack overflow on large audio; improve Urdu stutter prompt accuracy; add 3-attempt retry"
```

---

## Task 4: Clean Up `App.css` Dead Code

**Files:**
- Modify: `src/App.css`

The file still contains Vite scaffold CSS (`.logo`, `logo-spin`, `.read-the-docs`) — dead weight.

- [ ] **Step 1: Replace `src/App.css` content entirely**

```css
/* App.css — StutterNet+ global styles */
#root {
  min-height: 100vh;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.css
git commit -m "chore: remove Vite scaffold dead CSS from App.css"
```

---

## Task 5: Mobile Navigation — Hamburger Menu

**Files:**
- Modify: `src/components/Navigation.tsx`

No mobile menu exists. On screens < 640px the labels are hidden but the icon buttons still show. We need a proper toggle menu.

- [ ] **Step 1: Rewrite `src/components/Navigation.tsx` in full**

```tsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Info, Brain, Database, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/dataset", icon: Database, label: "Dataset", urdu: "ڈیٹا سیٹ", activeColor: "bg-secondary text-black shadow-[0_0_20px_rgba(112,0,255,0.4)]" },
  { to: "/about", icon: Info, label: "About", urdu: "بارے میں", activeColor: "bg-primary text-black shadow-[0_0_20px_rgba(0,243,255,0.4)]" },
];

const Navigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/20 shadow-lg">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo */}
          <NavLink to="/" className="flex items-center space-x-2 sm:space-x-3 group" onClick={() => setMobileOpen(false)}>
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all duration-300">
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent group-hover:text-primary transition-colors">
                StutterNet+
              </h1>
              <p className="text-[10px] sm:text-xs text-primary/80 font-urdu tracking-wider">اردو تقریر تجزیہ</p>
            </div>
          </NavLink>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center space-x-2">
            {navLinks.map(({ to, icon: Icon, label, activeColor }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 border border-transparent text-sm font-medium",
                    isActive
                      ? `${activeColor} font-bold`
                      : "text-muted-foreground hover:text-white hover:bg-white/5 hover:border-white/10"
                  )
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-white/5 py-3 space-y-1 animate-fade-in">
            {navLinks.map(({ to, icon: Icon, label, urdu }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-sm font-urdu text-muted-foreground">{urdu}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Navigation.tsx
git commit -m "feat: add mobile hamburger menu to Navigation with animated dropdown"
```

---

## Task 6: Rewrite `About.tsx` with Accurate Architecture and Stats

**Files:**
- Modify: `src/pages/About.tsx`

Current About shows wrong architecture (TDNN → CNN → BiLSTM → Statistical Pooling). Real architecture per CLAUDE.md is **SE-ResNet → BiLSTM → Bahdanau Attention** (722K params). Two models exist:
- **StutterNet+ / FluentNet**: SE-ResNet+BiLSTM+Attention, trained ElevenLabs-only, **61.9% accuracy, Macro F1=0.60**
- **Custom 1D CNN+BiGRU+Attention**: MFCC-based, 5-fold cross-validation on mixed AI+human data, **~50% accuracy**
- **Bottleneck**: Domain mismatch between TTS synthetic speech and real human speech recordings

- [ ] **Step 1: Replace `src/pages/About.tsx` in full**

```tsx
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Database, Zap, Users, AlertTriangle, Layers } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <Navigation />

      <main className="relative container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Hero */}
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-4">StutterNet+</h1>
            <p className="text-xl sm:text-2xl font-urdu text-primary mb-3">اردو تقریر میں لکنت کی خودکار تشخیص</p>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
              A deep learning framework for automatic stutter detection in Urdu — the first of its kind for a language spoken by over 230 million people.
            </p>
          </div>

          {/* Overview */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-fade-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Project Overview</CardTitle>
              <CardDescription className="font-urdu text-base">منصوبے کا جائزہ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                StutterNet+ addresses a critical gap: no automated tools exist for stuttering assessment in Urdu.
                Speech pathologists working with Urdu-speaking populations face a complete absence of language-specific diagnostic software.
              </p>
              <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-r-lg">
                <p className="font-bold text-foreground mb-2">First-Ever Urdu Stuttering Dataset</p>
                <p className="text-sm">
                  We built the first comprehensive Urdu stuttering corpus: <strong className="text-primary">543 annotated samples</strong> (~65 minutes of audio)
                  combining <strong>415 ElevenLabs TTS synthetic samples</strong> across 3 cloned voices and <strong>128 real human speech recordings</strong>
                  from podcast clips and a community corpus. Three stutter classes: syllable repetition (حرف), word repetition (لفظ), and block/pause (بلاک).
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <h4 className="font-bold text-foreground mb-2">Problem Statement</h4>
                  <ul className="text-sm space-y-1 list-disc ml-4">
                    <li>No automated Urdu stutter detection tools existed</li>
                    <li>No annotated Urdu stuttering speech corpus existed</li>
                    <li>Barriers to early diagnosis and therapy tracking</li>
                    <li>230M+ Urdu speakers underserved by current AI tools</li>
                  </ul>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">Our Contributions</h4>
                  <ul className="text-sm space-y-1 list-disc ml-4">
                    <li>First annotated Urdu stuttering speech dataset (543 samples)</li>
                    <li>Two trained deep learning detection models</li>
                    <li>Live AI-powered demo via Gemini 2.5 Flash</li>
                    <li>Open research platform for further study</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dataset Stats */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Database className="w-6 h-6 text-primary" /> Dataset
              </CardTitle>
              <CardDescription className="font-urdu text-base">ڈیٹا سیٹ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Samples", value: "543", color: "text-primary", sub: "annotated clips" },
                  { label: "TTS Synthetic", value: "415", color: "text-accent", sub: "ElevenLabs v3" },
                  { label: "Real Speech", value: "128", color: "text-secondary", sub: "human recordings" },
                  { label: "Total Audio", value: "~65 min", color: "text-green-400", sub: "16kHz mono WAV" },
                ].map((s, i) => (
                  <div key={i} className="p-3 bg-black/20 rounded-xl border border-white/10 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs font-medium text-foreground mt-1">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground text-left">
                      <th className="py-2 pr-4">Voice / Source</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Samples</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { voice: "Abdullah", type: "TTS (ElevenLabs v3)", n: "145", note: "Cloned voice — 45 real-life scenarios × 3 types" },
                      { voice: "Ibrahim", type: "TTS (ElevenLabs v3)", n: "135", note: "Same scenarios, different voice" },
                      { voice: "Mati", type: "TTS (ElevenLabs v3)", n: "135", note: "Same scenarios, different voice" },
                      { voice: "Podcast", type: "Real human speech", n: "48", note: "Urdu podcast recordings (Google Drive)" },
                      { voice: "Zip Dataset", type: "Real human speech", n: "80", note: "Community Urdu speech corpus (multi-speaker)" },
                    ].map((r, i) => (
                      <tr key={i} className="text-muted-foreground">
                        <td className="py-2 pr-4 font-medium text-foreground">{r.voice}</td>
                        <td className="py-2 pr-4">{r.type}</td>
                        <td className="py-2 pr-4 font-mono text-primary">{r.n}</td>
                        <td className="py-2 text-xs">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Class distribution — ElevenLabs training set (415 samples, near-perfect balance):</p>
                {[
                  { label: "Syllable Repetition — حرف", count: 139, pct: 33.5, color: "bg-primary" },
                  { label: "Word Repetition — لفظ", count: 138, pct: 33.3, color: "bg-accent" },
                  { label: "Block / Pause — بلاک", count: 138, pct: 33.3, color: "bg-secondary" },
                ].map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="font-urdu">{c.label}</span>
                      <span>{c.count} ({c.pct}%)</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Model 1: StutterNet+ / FluentNet */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Brain className="w-6 h-6 text-primary" /> Model 1: StutterNet+ (SE-ResNet + BiLSTM + Attention)
              </CardTitle>
              <CardDescription className="font-urdu text-base">ماڈل ۱ — سپیکٹروگرام پر مبنی</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                Trained exclusively on <strong className="text-foreground">ElevenLabs TTS data (415 samples)</strong> with a 90/10 stratified split,
                this model — which we call <strong className="text-primary">FluentNet</strong> internally — achieved
                <strong className="text-primary"> 61.9% accuracy</strong> and <strong className="text-primary">Macro F1 = 0.60</strong>, the best result in the project.
                It operates on 7-second STFT spectrograms and has 722K trainable parameters.
              </p>

              <div className="p-4 bg-black/20 rounded-xl border border-white/10 font-mono text-xs space-y-1 overflow-x-auto">
                <div className="text-muted-foreground mb-1">Architecture (722K parameters):</div>
                <div className="text-primary">Input: (B, 1, 257, 701) — STFT spectrogram of 7s audio at 16kHz</div>
                <div className="text-white pl-4">→ SE-ResNet Encoder (3 SE-ResBlocks: 32 → 64 → 128 channels)</div>
                <div className="text-white pl-4">→ BiLSTM (input=128, hidden=64, bidirectional → 128 out)</div>
                <div className="text-white pl-4">→ Bahdanau Attention Pooling (128 → 64 → 1 context vector)</div>
                <div className="text-white pl-4">→ Classifier: Dropout → Linear(128→64) → ReLU → Dropout → Linear(64→4)</div>
                <div className="text-accent">Output: (B, 4) logits — 4 classes (clean + 3 stutter types)</div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <h5 className="font-bold text-foreground text-sm mb-1">SE-ResNet Encoder</h5>
                  <p className="text-xs">Squeeze-and-Excitation blocks perform channel-wise feature recalibration inside residual blocks — emphasizing frequency bands relevant to stuttering while suppressing noise. 3 blocks: 32 → 64 → 128 channels.</p>
                </div>
                <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/20">
                  <h5 className="font-bold text-foreground text-sm mb-1">Bidirectional LSTM</h5>
                  <p className="text-xs">Processes temporal sequences forward and backward simultaneously. Critical for block stutters which involve anticipatory tension before the blockage — only visible with backward context.</p>
                </div>
                <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
                  <h5 className="font-bold text-foreground text-sm mb-1">Bahdanau Attention</h5>
                  <p className="text-xs">Learns to attend to disfluency-relevant time frames rather than averaging all frames equally. The attention weights are visualizable — they highlight where in the spectrogram the model detected each stutter event.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground text-left text-xs">
                      <th className="py-2 pr-3">Phase</th>
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3">Acc</th>
                      <th className="py-2 pr-3">Syl F1</th>
                      <th className="py-2 pr-3">Word F1</th>
                      <th className="py-2">Block F1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {[
                      { phase: "Phase 2: Abdullah only", data: "145 TTS", acc: "53.8%", syl: "0.67", word: "0.59", block: "0.20" },
                      { phase: "Phase 3: +Ibrahim+Mati", data: "415 TTS", acc: "56.1%", syl: "0.78", word: "0.58", block: "0.06" },
                      { phase: "Phase 4: +Podcast", data: "463 mixed", acc: "52.9%", syl: "0.57", word: "0.64", block: "0.35" },
                      { phase: "Phase 5: +Zip dataset", data: "543 mixed", acc: "49.2%", syl: "0.53", word: "0.57", block: "0.32" },
                    ].map((r, i) => (
                      <tr key={i} className="text-muted-foreground">
                        <td className="py-1.5 pr-3">{r.phase}</td>
                        <td className="py-1.5 pr-3">{r.data}</td>
                        <td className="py-1.5 pr-3">{r.acc}</td>
                        <td className="py-1.5 pr-3">{r.syl}</td>
                        <td className="py-1.5 pr-3">{r.word}</td>
                        <td className="py-1.5">{r.block}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-primary/10 text-primary">
                      <td className="py-2 pr-3">★ Phase 6: ElevenLabs 90/10</td>
                      <td className="py-2 pr-3">415 TTS</td>
                      <td className="py-2 pr-3">61.9%</td>
                      <td className="py-2 pr-3">0.78</td>
                      <td className="py-2 pr-3">0.61</td>
                      <td className="py-2">0.40</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Model 2: Custom 1D CNN+BiGRU */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Layers className="w-6 h-6 text-accent" /> Model 2: Custom 1D CNN + BiGRU + Attention
              </CardTitle>
              <CardDescription className="font-urdu text-base">ماڈل ۲ — MFCC پر مبنی</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                This model uses <strong className="text-foreground">MFCC features</strong> (40 coefficients + delta + delta-delta = 120 features per frame, 220 frames max)
                rather than spectrograms. Evaluated with <strong className="text-accent">5-fold stratified cross-validation</strong> on the full mixed dataset (TTS + real speech),
                it achieved approximately <strong className="text-accent">50% accuracy</strong>.
              </p>

              <div className="p-4 bg-black/20 rounded-xl border border-white/10 font-mono text-xs space-y-1 overflow-x-auto">
                <div className="text-muted-foreground mb-1">Architecture:</div>
                <div className="text-accent">Input: (B, 220, 120) — 220 frames × 120 MFCC+delta features at 16kHz, hop=512</div>
                <div className="text-white pl-4">→ 1D CNN layers (temporal local feature extraction)</div>
                <div className="text-white pl-4">→ BiGRU (Bidirectional Gated Recurrent Unit — sequence modeling)</div>
                <div className="text-white pl-4">→ Attention mechanism (frame-level relevance weighting)</div>
                <div className="text-white pl-4">→ Fully connected classifier</div>
                <div className="text-secondary">Output: 3 classes (syllable_repetition, word_repetition, block)</div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
                  <div className="text-sm font-bold text-foreground mb-1">Evaluation Method</div>
                  <div className="text-xs">5-fold stratified cross-validation on mixed data. Each fold reserves a different 20% as the test set — more rigorous than a fixed split and gives an unbiased generalization estimate.</div>
                </div>
                <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
                  <div className="text-sm font-bold text-foreground mb-1">Result vs FluentNet</div>
                  <div className="text-xs">~50% accuracy (5-fold CV, mixed TTS+real) vs FluentNet's 61.9% (fixed split, TTS-only). The gap reflects both the harder evaluation protocol and the inclusion of real speech — both of which expose the domain mismatch bottleneck.</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottleneck */}
          <Card className="backdrop-blur-xl bg-card/70 border border-red-500/30 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-400" /> Key Bottleneck: Domain Mismatch
              </CardTitle>
              <CardDescription className="font-urdu text-base">بڑی رکاوٹ — مصنوعی اور حقیقی آواز کا فرق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                The single biggest obstacle is the <strong className="text-foreground">acoustic domain gap</strong> between ElevenLabs TTS synthetic speech and real human stuttering recordings.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-black/30 rounded-lg border border-white/10">
                  <h5 className="font-bold text-foreground mb-2">TTS Synthetic Data</h5>
                  <ul className="text-xs space-y-1 list-disc ml-4">
                    <li>Studio-quality audio, 16kHz mono, consistent codec</li>
                    <li>Acoustically uniform across all 415 samples</li>
                    <li>Stutters are scripted — idealized phoneme repeats</li>
                    <li>No background noise, no emotional prosody variance</li>
                  </ul>
                </div>
                <div className="p-4 bg-black/30 rounded-lg border border-white/10">
                  <h5 className="font-bold text-foreground mb-2">Real Human Speech</h5>
                  <ul className="text-xs space-y-1 list-disc ml-4">
                    <li>Variable recording environments and microphones</li>
                    <li>Emotional stress, irregular breathing, filler sounds</li>
                    <li>Stutters are unpredictable in onset, duration, intensity</li>
                    <li>Background noise, room reverb, codec compression artifacts</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm">
                  <strong className="text-foreground">The evidence is stark:</strong> Adding 128 real speech samples (Phase 4 & 5)
                  <em> reduced</em> accuracy from 56.1% to 49.2% despite more total data. The model learned
                  features that generalize within the TTS domain but break immediately on real speech.
                  <strong className="text-red-400"> We cannot bridge synthetic training to real-world deployment without substantially more real annotated Urdu stuttering data.</strong>
                </p>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h5 className="font-bold text-foreground mb-2">Path Forward</h5>
                <ul className="text-xs space-y-1 list-disc ml-4">
                  <li>Collect more real Urdu stuttering recordings with consistent ASHA-standard annotation</li>
                  <li>Domain adaptation: adversarial training, feature normalization across domains</li>
                  <li>Add clean non-stuttered samples as class 0 (currently absent — model has no rejection option)</li>
                  <li>Data augmentation: noise injection + room simulation on TTS data to narrow the gap</li>
                  <li>Integrate remaining ~26 unannotated MP3s from zip dataset</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How Demo Works */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Zap className="w-6 h-6 text-accent" /> How This Demo Works
              </CardTitle>
              <CardDescription className="font-urdu text-base">یہ ڈیمو کیسے کام کرتا ہے</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The live demo uses <strong className="text-foreground">Google Gemini 2.5 Flash</strong> (multimodal) to analyze audio in real-time.
                Gemini acts as an AI speech pathologist — it receives the base64-encoded audio and a clinically-detailed prompt, then returns structured JSON with stutter counts, types, transcript, and severity score.
                The trained StutterNet+ and Custom models run on the local research server.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
                {[
                  { label: "Record Audio", sub: "Up to 20 seconds", color: "border-primary/50 bg-primary/5" },
                  { label: "→", arrow: true },
                  { label: "Chunked Base64", sub: "8KB chunk encoding", color: "border-secondary/50 bg-secondary/5" },
                  { label: "→", arrow: true },
                  { label: "Gemini 2.5 Flash", sub: "Multimodal AI analysis", color: "border-accent/50 bg-accent/5" },
                  { label: "→", arrow: true },
                  { label: "JSON Results", sub: "Transcript + scores", color: "border-green-500/50 bg-green-500/5" },
                ].map((step, i) =>
                  step.arrow ? (
                    <div key={i} className="text-primary text-lg font-bold text-center hidden sm:block">→</div>
                  ) : (
                    <div key={i} className={`flex-1 text-center p-3 rounded-lg border ${step.color}`}>
                      <div className="font-semibold text-foreground">{step.label}</div>
                      <div className="text-muted-foreground mt-0.5">{step.sub}</div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Research Team */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-secondary" /> Research Team
              </CardTitle>
              <CardDescription className="font-urdu text-base">تحقیقی ٹیم</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                <h3 className="font-bold text-foreground mb-1">National University of Computer and Emerging Sciences (FAST-NUCES)</h3>
                <p className="text-sm text-muted-foreground">Final Year Project (FYP) — undergraduate research in speech processing and machine learning for low-resource language AI.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="font-semibold text-lg text-foreground mb-1">Student Researchers</div>
                  <div className="text-sm font-urdu text-primary mb-3">طالب علم محققین</div>
                  <div className="space-y-1 text-muted-foreground text-sm">
                    <div>Abdullah Naeem</div>
                    <div>Ibrahim Zia</div>
                    <div>Matiullah Khan</div>
                  </div>
                </div>
                <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                  <div className="font-semibold text-lg text-foreground mb-1">Project Supervisor</div>
                  <div className="text-sm font-urdu text-accent mb-3">نگران استاد</div>
                  <div className="text-muted-foreground text-sm mb-2">Ms. Umm-e-Ammarah</div>
                  <p className="text-xs text-muted-foreground">Faculty specializing in machine learning and natural language processing, FAST-NUCES</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default About;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/About.tsx
git commit -m "feat: rewrite About page — correct SE-ResNet+BiLSTM+Bahdanau architecture, real training stats table, FluentNet 61.9% vs Custom 50% comparison, domain mismatch bottleneck section"
```

---

## Task 7: Update `constants.ts` with Full Annotation Data

**Files:**
- Modify: `src/config/constants.ts`

DEMO_DATASET needs richer annotation data to power the redesigned Dataset showcase: annotated transcripts with ASHA-standard stutter markers, speaker info, stutter marker positions.

- [ ] **Step 1: Replace the `DEMO_DATASET` export in `src/config/constants.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/config/constants.ts
git commit -m "feat: enrich DEMO_DATASET with full ASHA-standard annotation data, speaker info, stutter markers"
```

---

## Task 8: Redesign Dataset Page and Components

**Files:**
- Modify: `src/pages/Dataset.tsx`
- Modify: `src/components/DatasetStats.tsx`
- Modify: `src/components/DatasetTable.tsx`

Dataset page should be a **research showcase** — not a management console. Show annotation methodology, let visitors listen, display annotated transcripts with highlighted stutter events. Mobile must use cards, not a table.

- [ ] **Step 1: Rewrite `src/pages/Dataset.tsx`**

```tsx
import Navigation from "@/components/Navigation";
import DatasetTable from "@/components/DatasetTable";
import DatasetStats from "@/components/DatasetStats";
import { Badge } from "@/components/ui/badge";
import { Database, BookOpen, Mic2 } from "lucide-react";

const Dataset = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none opacity-40 z-0" />
      <Navigation />

      <main className="relative container mx-auto px-4 sm:px-6 py-8 sm:py-12 z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
            <Database className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-white/80">Research Dataset</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-2">Urdu Stuttering Corpus</h1>
          <p className="text-xl sm:text-2xl font-urdu text-primary mb-3">اردو لکنت کا ڈیٹا سیٹ</p>
          <p className="text-muted-foreground max-w-3xl">
            The first annotated Urdu stuttering speech dataset — 543 samples across 3 stutter categories,
            combining ElevenLabs TTS synthetic speech with real human recordings.
          </p>
        </div>

        {/* Annotation Key */}
        <div className="mb-8 p-4 sm:p-6 rounded-2xl bg-card/40 border border-white/10 backdrop-blur-xl animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold text-foreground">Annotation Key</h2>
            <span className="font-urdu text-sm text-muted-foreground ml-2">تشریح کلید</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/20 text-primary border-primary/50 font-mono text-xs">[حرف]...[/حرف]</Badge>
              </div>
              <div className="text-sm font-bold text-foreground">Syllable Repetition</div>
              <div className="text-xs font-urdu text-muted-foreground">حرف کی تکرار</div>
              <div className="text-xs text-muted-foreground mt-1">Involuntary phoneme/syllable-level repetition. Example: م... م... مجھے</div>
            </div>
            <div className="p-3 bg-secondary/10 rounded-xl border border-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-secondary/20 text-secondary border-secondary/50 font-mono text-xs">[بلاک]—[/بلاک]</Badge>
              </div>
              <div className="text-sm font-bold text-foreground">Block / Pause</div>
              <div className="text-xs font-urdu text-muted-foreground">رکاوٹ / وقفہ</div>
              <div className="text-xs text-muted-foreground mt-1">Complete articulatory arrest — silent block mid-word or mid-sentence with visible struggle</div>
            </div>
            <div className="p-3 bg-accent/10 rounded-xl border border-accent/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-accent/20 text-accent border-accent/50 font-mono text-xs">[لفظ]...[/لفظ]</Badge>
              </div>
              <div className="text-sm font-bold text-foreground">Word Repetition</div>
              <div className="text-xs font-urdu text-muted-foreground">لفظ کی تکرار</div>
              <div className="text-xs text-muted-foreground mt-1">Whole word repeated involuntarily 2+ times. Example: وہاں وہاں وہاں</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Follows <strong className="text-foreground">ASHA (American Speech-Language-Hearing Association)</strong> disfluency marking conventions, adapted for Urdu script.
            </p>
          </div>
        </div>

        <DatasetStats />

        <div className="mt-8 animate-fade-in">
          <DatasetTable />
        </div>
      </main>
    </div>
  );
};

export default Dataset;
```

- [ ] **Step 2: Rewrite `src/components/DatasetStats.tsx`**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileAudio, Users, Layers } from "lucide-react";

const DatasetStats = () => {
  const stats = [
    { icon: FileAudio, value: "543", label: "Total Samples", urdu: "کل نمونے", color: "text-primary", bg: "bg-primary/10" },
    { icon: Clock, value: "~65 min", label: "Total Audio", urdu: "کل آڈیو", color: "text-accent", bg: "bg-accent/10" },
    { icon: Users, value: "3", label: "TTS Voices", urdu: "آوازیں", color: "text-secondary", bg: "bg-secondary/10" },
    { icon: Layers, value: "3", label: "Stutter Classes", urdu: "لکنت کی اقسام", color: "text-green-400", bg: "bg-green-500/10" },
    { icon: FileAudio, value: "415", label: "Synthetic (TTS)", urdu: "مصنوعی", color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { icon: FileAudio, value: "128", label: "Real Human", urdu: "حقیقی", color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-scale-in">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="border border-white/10 backdrop-blur-xl bg-card/40 hover:bg-card/60 hover:shadow-lg transition-all duration-300"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`p-2.5 ${stat.bg} rounded-xl`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                <div className="text-[10px] font-urdu text-muted-foreground">{stat.urdu}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DatasetStats;
```

- [ ] **Step 3: Rewrite `src/components/DatasetTable.tsx`**

```tsx
import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DEMO_DATASET } from "@/config/constants";

type Sample = typeof DEMO_DATASET[0];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Mild": return "bg-green-500/20 text-green-400 border-green-500/50";
    case "Moderate": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "Severe": return "bg-red-500/20 text-red-400 border-red-500/50";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
};

const getTypeColor = (type: string) => {
  if (type.includes("Sy")) return "bg-primary/20 text-primary border-primary/50";
  if (type.includes("-p")) return "bg-secondary/20 text-secondary border-secondary/50";
  if (type.includes("-w")) return "bg-accent/20 text-accent border-accent/50";
  return "bg-white/10 text-white border-white/20";
};

const TAG_COLORS: Record<string, string> = {
  "حرف": "bg-primary/20 text-primary border-b-2 border-primary rounded px-1 mx-0.5",
  "بلاک": "bg-secondary/20 text-secondary border-b-2 border-secondary rounded px-1 mx-0.5",
  "لفظ": "bg-accent/20 text-accent border-b-2 border-accent rounded px-1 mx-0.5",
};

const AnnotatedTranscript = ({ sample }: { sample: Sample }) => {
  if (!sample.annotatedTranscript) return null;

  const text = sample.annotatedTranscript;
  const tagPattern = /\[(حرف|بلاک|لفظ)\]([\s\S]*?)\[\/(?:حرف|بلاک|لفظ)\]/g;
  const parts: Array<{ text: string; tag: string | null }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tagPattern)) {
    if (match.index! > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), tag: null });
    }
    parts.push({ text: match[2], tag: match[1] });
    lastIndex = match.index! + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), tag: null });
  }

  return (
    <div className="p-4 bg-black/30 rounded-xl border border-white/10" dir="rtl">
      <p className="font-urdu text-base text-foreground" style={{ lineHeight: "2.8" }}>
        {parts.map((part, i) =>
          part.tag ? (
            <span key={i} className={cn("inline-block", TAG_COLORS[part.tag])}>
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10 justify-end" dir="ltr">
        <span className="text-xs text-muted-foreground self-center">Legend:</span>
        {[
          { tag: "حرف", label: "Syllable Rep", cls: "bg-primary/20 text-primary border-primary/50" },
          { tag: "بلاک", label: "Block", cls: "bg-secondary/20 text-secondary border-secondary/50" },
          { tag: "لفظ", label: "Word Rep", cls: "bg-accent/20 text-accent border-accent/50" },
        ].filter(t => sample.stutterMarkers?.some(m =>
          (m.type === "syllable" && t.tag === "حرف") ||
          (m.type === "block" && t.tag === "بلاک") ||
          (m.type === "word_repetition" && t.tag === "لفظ")
        )).map(t => (
          <Badge key={t.tag} variant="outline" className={`text-xs font-urdu ${t.cls}`}>
            [{t.tag}] {t.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};

const SampleCard = ({ sample }: { sample: Sample }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.src = `/demo-samples/${sample.filename}`;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error("Audio unavailable", { description: `Could not load ${sample.filename}` }));
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  return (
    <Card className={cn(
      "border backdrop-blur-xl transition-all duration-300",
      sample.isComingSoon
        ? "border-white/10 bg-card/20 opacity-70"
        : "border-white/10 bg-card/40 hover:border-white/20"
    )}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-foreground">{sample.label}</h3>
              {sample.isComingSoon && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Coming Soon</Badge>
              )}
            </div>
            <p className="text-sm font-urdu text-primary">{sample.labelUrdu}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-1.5 flex-shrink-0">
            <Badge variant="outline" className={getTypeColor(sample.stutterType)}>{sample.stutterType}</Badge>
            <Badge variant="outline" className={getSeverityColor(sample.severity)}>{sample.severity}</Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{sample.description}</p>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2 bg-black/20 rounded-lg text-center border border-white/5">
            <div className="text-sm font-mono font-bold text-foreground">
              0:{sample.duration.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] text-muted-foreground">Duration</div>
          </div>
          <div className="p-2 bg-black/20 rounded-lg text-center border border-white/5">
            <div className="text-sm font-bold text-foreground">{sample.stutterCount || '—'}</div>
            <div className="text-[10px] text-muted-foreground">Stutters</div>
          </div>
          <div className="p-2 bg-black/20 rounded-lg text-center border border-white/5">
            <div className="text-sm font-bold text-foreground">{sample.totalWords || '—'}</div>
            <div className="text-[10px] text-muted-foreground">Words</div>
          </div>
        </div>

        {/* Mini Waveform */}
        {!sample.isComingSoon && (
          <div className="w-full h-10 bg-black/40 rounded-lg flex items-end gap-[2px] px-2 mb-4 overflow-hidden border border-white/5">
            {[...Array(60)].map((_, i) => {
              const isStutterZone = sample.stutterMarkers?.some(m => {
                const pos = (m.start / (sample.totalWords || 10)) * 60;
                return Math.abs(i - pos) < 4;
              });
              const baseH = 15 + Math.sin(i * 0.35) * 10 + (i % 7) * 2.5;
              return (
                <div
                  key={i}
                  className={cn("flex-1 rounded-sm transition-colors", isStutterZone ? "bg-accent" : "bg-primary/50")}
                  style={{ height: `${Math.max(8, Math.min(baseH, 85))}%` }}
                />
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!sample.isComingSoon && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePlay}
              className="border-primary/50 text-primary hover:bg-primary/20"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
              {isPlaying ? "Stop" : "Listen"}
            </Button>
          )}
          {!sample.isComingSoon && sample.annotatedTranscript && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(e => !e)}
              className="text-muted-foreground hover:text-white flex-1 justify-between min-w-0"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Volume2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{isExpanded ? "Hide" : "View"} Annotated Transcript</span>
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
            </Button>
          )}
        </div>

        {/* Expanded Annotation Panel */}
        {isExpanded && !sample.isComingSoon && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <div className="text-xs text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">ASHA Standard Annotation</span>
            </div>
            <AnnotatedTranscript sample={sample} />
            {sample.totalWords > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs text-center">
                <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                  <div className="font-bold text-primary">
                    {((sample.disfluencyCount / sample.totalWords) * 100).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground">Stutter Rate</div>
                </div>
                <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                  <div className="font-bold text-foreground">{sample.annotationStyle}</div>
                  <div className="text-muted-foreground">Standard</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <audio ref={audioRef} style={{ display: 'none' }} />
    </Card>
  );
};

const DatasetTable = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-2">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Sample Browser</h2>
        <p className="text-sm text-muted-foreground font-urdu">نمونہ براؤزر</p>
      </div>
      <Badge variant="outline" className="border-primary/50 text-primary text-xs">
        {DEMO_DATASET.filter(s => !s.isComingSoon).length} samples available
      </Badge>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {DEMO_DATASET.map(sample => (
        <SampleCard key={sample.id} sample={sample} />
      ))}
    </div>
  </div>
);

export default DatasetTable;
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dataset.tsx src/components/DatasetStats.tsx src/components/DatasetTable.tsx
git commit -m "feat: redesign Dataset page as research showcase — ASHA annotation viewer, audio player, waveform bar, mobile card layout, 543-sample stats"
```

---

## Task 9: Mobile Fixes on `Index.tsx`

**Files:**
- Modify: `src/pages/Index.tsx`

Hero action cards at < 640px can overflow their container. Processing overlay needs `overflow-y-auto` so step list is scrollable on short screens.

- [ ] **Step 1: Update action card button classes**

For each of the three action card `<button>` elements (Record, Upload, Demo), change:
```tsx
className="group relative h-[180px] sm:h-[240px] w-full sm:w-[240px] ..."
```
to:
```tsx
className="group relative h-[160px] sm:h-[240px] w-full sm:w-[200px] lg:w-[240px] max-w-[340px] sm:max-w-none ..."
```

- [ ] **Step 2: Fix processing overlay scrollability on mobile**

Find the processing overlay wrapper:
```tsx
<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in text-center p-6">
```

Change to:
```tsx
<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in text-center p-4 sm:p-6 overflow-y-auto">
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "fix: responsive action card sizing and processing overlay scroll on mobile"
```

---

## Task 10: Final Build Verification

- [ ] **Step 1: Run TypeScript build**

```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
npm run build 2>&1 | head -80
```

Expected: `✓ built in X.Xs` — zero TypeScript errors. If errors appear, fix each one before continuing.

- [ ] **Step 2: Start dev server and check console**

```bash
npm run dev
```

Open browser to `http://localhost:8080` (or the port shown). Open DevTools → Console. Expected: no red errors on load.

- [ ] **Step 3: Navigate all three routes**

Visit `/`, `/dataset`, `/about`. Each must render completely without a white screen or React error boundary.

- [ ] **Step 4: Test mobile layout at 390px**

In DevTools → Toggle device toolbar → iPhone 14 (390×844). Verify:
- Nav hamburger appears, dropdown opens/closes
- Hero cards stack vertically with no horizontal scroll
- Dataset page shows 2-column card grid on 640px+, 1-column below
- About page text is readable, no overflow

- [ ] **Step 5: Test Gemini analysis flow (requires API key)**

Ensure `VITE_GEMINI_API_KEY` is set in `.env.local`. Record 5–10 seconds of speech. Click Analyze. Expected: 4-step processing animation → results page with real transcript and stutter breakdown (not the error fallback state).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: StutterNet+ full overhaul — all bugs fixed, redesigned Dataset and About, hardened Gemini API, mobile-responsive"
```

---

## Summary

| Task | Area | Impact |
|---|---|---|
| 1 | Fix Index.tsx handleAnalyze crash | Runtime crash fix — app wouldn't work at all |
| 2 | Fix AudioRecorder formatTime | Missing function used in JSX |
| 3 | Fix Gemini base64 + prompt + retry | Stack overflow on real audio; inaccurate results |
| 4 | Clean App.css | Remove Vite scaffold noise |
| 5 | Mobile nav hamburger | No mobile nav existed |
| 6 | Rewrite About page | Wrong architecture; wrong stats; no bottleneck |
| 7 | Enrich constants.ts | Thin data blocks annotation showcase |
| 8 | Redesign Dataset page | Management UI → research showcase |
| 9 | Mobile Index fixes | Card overflow + overlay scroll |
| 10 | Build verification | Ensure nothing breaks end-to-end |
