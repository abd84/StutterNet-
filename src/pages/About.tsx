import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Database, Zap, Users, Layers, Activity } from "lucide-react";

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
                    <li>Three evaluated architectures: FluentNet (722K), Custom CNN+BiGRU (155K), StutterNet baseline (434K)</li>
                    <li>Live AI-powered demo using the trained FluentNet model</li>
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

          {/* Model 1: FluentNet (best on AI data) */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Brain className="w-6 h-6 text-primary" /> Model 1: Best Performing — FluentNet Architecture (SE-ResNet + BiLSTM + Attention)
              </CardTitle>
              <CardDescription className="font-urdu text-base">ماڈل ۱ — سپیکٹروگرام پر مبنی</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">

              {/* Core Goal Banner */}
              <div className="p-4 bg-primary/10 border border-primary/40 rounded-lg">
                <p className="text-sm font-semibold text-primary mb-1">Our Core Research Goal</p>
                <p className="text-sm">
                  We set out to prove that <strong className="text-foreground">AI-generated stuttered audio</strong> (ElevenLabs TTS) can substitute for real patient recordings —
                  solving two hard problems at once: the <strong className="text-foreground">complete absence of any Urdu stuttering dataset</strong> and
                  the <strong className="text-foreground">data-privacy barriers</strong> that make recording real patients ethically complex.
                  This page documents what we found.
                </p>
              </div>

              {/* Architecture naming clarification */}
              <div className="p-4 bg-black/30 rounded-lg border border-white/10 text-sm space-y-2">
                <p className="font-semibold text-foreground">Architecture naming — clarified</p>
                <p>
                  Throughout this project we tested <strong className="text-foreground">multiple architectures and training configurations</strong>.
                  Two emerged as most relevant:
                </p>
                <ul className="list-disc ml-5 space-y-1.5">
                  <li>
                    <strong className="text-primary">FluentNet</strong> — the architecture whose blueprint (SE-ResNet → BiLSTM → Bahdanau Attention) is
                    inspired by published speech-disfluency literature.
                    However, the <em>regularization strategy, loss function, input/output dimensions, and every hyperparameter</em> were
                    <strong className="text-foreground"> entirely re-tuned by our team</strong> from scratch specifically for this Urdu stuttering dataset.
                    This makes it substantially our own implementation.
                    <strong className="text-primary"> Best accuracy on AI-only data: 61.9%, Macro F1 = 0.60.</strong>
                  </li>
                  <li>
                    <strong className="text-secondary">StutterNet+</strong> — our own <em>originally proposed</em> architecture (described in Model 2 below).
                    It outperformed FluentNet when trained on the <em>combined AI + real human dataset</em>,
                    showing stronger generalization across acoustic domains.
                  </li>
                </ul>
              </div>

              <p className="leading-relaxed text-sm">
                The FluentNet variant was trained exclusively on <strong className="text-foreground">ElevenLabs TTS data (415 samples)</strong> with a 90/10 stratified split.
                It operates on 7-second STFT spectrograms and has <strong className="text-foreground">722K trainable parameters</strong>.
              </p>

              <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/30 text-sm">
                <strong className="text-secondary">StutterNet+ shines on mixed data:</strong> When AI-generated samples were combined with real human recordings,
                our own proposed <strong className="text-foreground">StutterNet+</strong> architecture surpassed FluentNet — confirming that our architecture generalizes
                better across acoustic domains. FluentNet excels in the controlled synthetic setting; StutterNet+ is the stronger real-world candidate once
                enough diverse data is available.
              </div>

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

          {/* Severity Measurement */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary" /> How We Measure Severity
              </CardTitle>
              <CardDescription className="font-urdu text-base">شدت کی پیمائش</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground text-sm">

              {/* Plain-English box */}
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="font-semibold text-foreground mb-2">In plain words — what does "severity" mean here?</p>
                <p className="leading-relaxed">
                  Severity tells you <strong className="text-foreground">how much a stutter gets in the way of normal speech</strong>.
                  Think of it like a score from 0 to 100 — the higher the number, the harder it is for the speaker to communicate.
                  A small hiccup like repeating one syllable barely hurts the score. But a full block — where the speaker gets completely stuck and struggles to push the word out — raises the score a lot.
                  We count how many stutters happened, what type they were, and how long the speech was,
                  then combine those into one number so a clinician can quickly see: <em>mild problem, moderate problem, or severe problem</em>.
                </p>
              </div>

              <p className="leading-relaxed">
                Not all stutters are equally disruptive. We use a <strong className="text-foreground">weighted clinical scoring formula</strong> that reflects the real-world impact of each stutter type — the same logic used by speech-language pathologists.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: "Repetitions (Takrar)", weight: "×1.0", color: "border-primary/30 bg-primary/5", desc: "Least disruptive. A repeated syllable or word adds minimal communication burden." },
                  { label: "Prolongations (Tawalat)", weight: "×1.5", color: "border-accent/30 bg-accent/5", desc: "Moderately disruptive. Holding a sound abnormally long signals effort and tension." },
                  { label: "Blocks (Rukawat)", weight: "×2.0", color: "border-secondary/30 bg-secondary/5", desc: "Most disruptive. A complete speech arrest with audible struggle is clinically the most severe event." },
                ].map((t, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${t.color}`}>
                    <div className="font-bold text-foreground text-sm">{t.label} <span className="text-primary">{t.weight}</span></div>
                    <p className="text-xs mt-1">{t.desc}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-black/20 rounded-lg border border-white/10 text-xs space-y-1">
                <div><strong className="text-foreground">Formula:</strong> weighted_score = (repetitions × 1) + (prolongations × 1.5) + (blocks × 2)</div>
                <div><strong className="text-foreground">Base severity</strong> = (weighted_score ÷ total_words) × 200, clamped to 0–100</div>
                <div><strong className="text-foreground">Modifiers:</strong> +10 for audible struggle/tension · +8 for secondary behaviours · −5 for effort-free events</div>
                <div className="text-muted-foreground pt-1">Example: 1 block in a 5-word sentence scores ~80 (severe). Five easy repetitions in 50 words scores ~10 (very mild).</div>
              </div>
            </CardContent>
          </Card>

          {/* How the Tool Works */}
          <Card className="backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Zap className="w-6 h-6 text-accent" /> How This Tool Works
              </CardTitle>
              <CardDescription className="font-urdu text-base">یہ ٹول کیسے کام کرتا ہے</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This is a <strong className="text-foreground">live AI-powered web tool</strong> built for researchers, speech-language pathologists, and clinicians
                working with Urdu-speaking populations. It runs our trained deep learning model (SE-ResNet + BiLSTM + Bahdanau Attention, 722K parameters)
                via a Python FastAPI inference server. Audio submitted through the browser is preprocessed into an STFT spectrogram and classified
                in under one second on a standard CPU — no cloud upload, no third-party service.
              </p>

              {/* Use cases */}
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  { title: "Speech-Language Pathologists", desc: "Quickly screen for stutter type and severity in Urdu-speaking patients without manual transcription or special equipment.", color: "border-primary/30 bg-primary/5" },
                  { title: "Clinical Researchers", desc: "Annotate and benchmark new Urdu speech samples against model predictions to expand the dataset and study stutter patterns.", color: "border-secondary/30 bg-secondary/5" },
                  { title: "Educators & Therapists", desc: "Track therapy progress over time by comparing pre- and post-therapy recordings for the same speaker.", color: "border-accent/30 bg-accent/5" },
                  { title: "NLP / Speech AI Researchers", desc: "Use this platform as a baseline for building or fine-tuning future low-resource Urdu speech models.", color: "border-green-500/30 bg-green-500/5" },
                ].map((uc, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${uc.color}`}>
                    <div className="font-semibold text-foreground text-xs mb-1">{uc.title}</div>
                    <p className="text-xs text-muted-foreground">{uc.desc}</p>
                  </div>
                ))}
              </div>

              {/* Workflow */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
                {[
                  { label: "Record / Upload", sub: "Browser MediaRecorder or WAV file", color: "border-primary/50 bg-primary/5" },
                  { label: "→", arrow: true },
                  { label: "Preprocessing", sub: "STFT spectrogram · 16kHz mono", color: "border-secondary/50 bg-secondary/5" },
                  { label: "→", arrow: true },
                  { label: "Our Trained Model", sub: "SE-ResNet + BiLSTM + Attention", color: "border-accent/50 bg-accent/5" },
                  { label: "→", arrow: true },
                  { label: "Stutter Class", sub: "Harf / Lafz / Block / Clean", color: "border-green-500/50 bg-green-500/5" },
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
