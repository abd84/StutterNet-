# Local Inference Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Python FastAPI inference server running FluentNet (best_model.pt), wire to React frontend via Vite proxy, one-env-var toggle local/gemini, fix About page workflow.

**Architecture:** React SPA → /api/analyze (Vite proxy) → FastAPI:8000 → FluentNet PyTorch → JSON. VITE_INFERENCE_MODE=local uses trained model; =gemini falls back to Gemini.

**Tech Stack:** FastAPI + uvicorn + PyTorch + scipy + soundfile (all installed). React/TypeScript/Vite frontend.

---

## Checkpoint Facts (verified)
- File: `checkpoints/best_model.pt`
- Classes: `['clean', 'syllable_repetition', 'word_repetition', 'block']`
- Input: `(B, 1, 257, 701)` STFT spectrogram
- Preprocessing: 16kHz mono, 7s=112000 samples, pre-emphasis=0.97, n_fft=512, hop=160, win=400, Hann, amp→dB, min-max [0,1]
- Spatial flow: Input(1,257,701)→stem→(32,65,176)→block1(s=2)→(64,33,88)→block2(s=2)→(128,17,44)→block3(s=1)→AdaptAvgPool→(128,44)→BiLSTM→Attention→(128)→classifier→(4)

## File Map
| File | Action |
|---|---|
| `inference_server/model.py` | Create — FluentNet PyTorch definition |
| `inference_server/preprocess.py` | Create — audio→tensor pipeline |
| `inference_server/main.py` | Create — FastAPI server |
| `inference_server/requirements.txt` | Create |
| `inference_server/start.sh` | Create |
| `vite.config.ts` | Modify — add proxy /api→:8000 |
| `src/lib/inference.ts` | Create — mode-switching client |
| `src/components/AudioRecorder.tsx` | Modify — use inference.ts |
| `.env.local` | Create — VITE_INFERENCE_MODE=local |
| `src/pages/About.tsx` | Modify — workflow card fix |

---

## Task 1: FluentNet Model Definition

**Files:** Create `inference_server/model.py`

- [ ] **Step 1: Create inference_server directory**
```bash
mkdir -p "/Users/abdullah/Desktop/Stutter /StutterNet-/inference_server"
```

- [ ] **Step 2: Write inference_server/model.py**
```python
"""
FluentNet — must match checkpoints/best_model.pt layer names exactly.
Classes: ['clean', 'syllable_repetition', 'word_repetition', 'block']
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class SEBlock(nn.Module):
    def __init__(self, channels: int, reduction: int = 16):
        super().__init__()
        self.excitation = nn.Sequential(
            nn.Linear(channels, channels // reduction, bias=True),
            nn.ReLU(inplace=True),
            nn.Linear(channels // reduction, channels, bias=True),
            nn.Sigmoid(),
        )

    def forward(self, x):
        b, c, _, _ = x.shape
        gap = x.mean(dim=[2, 3])
        scale = self.excitation(gap)
        return x * scale.view(b, c, 1, 1)


class SEResBlock(nn.Module):
    def __init__(self, in_ch: int, out_ch: int, stride: int = 1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_ch)
        self.se = SEBlock(out_ch)
        # Always include shortcut conv (matches checkpoint for all 3 blocks)
        self.shortcut = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 1, stride=stride, bias=False),
            nn.BatchNorm2d(out_ch),
        )

    def forward(self, x):
        residual = self.shortcut(x)
        out = F.relu(self.bn1(self.conv1(x)), inplace=True)
        out = self.bn2(self.conv2(out))
        out = self.se(out)
        return F.relu(out + residual, inplace=True)


class SEResNetEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(1, 32, 7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, stride=2, padding=1),
        )
        self.block1 = SEResBlock(32, 64, stride=2)
        self.block2 = SEResBlock(64, 128, stride=2)
        self.block3 = SEResBlock(128, 128, stride=1)  # no spatial downsample, but shortcut conv exists

    def forward(self, x):
        return self.block3(self.block2(self.block1(self.stem(x))))


class BahdanauAttention(nn.Module):
    def __init__(self, hidden_dim=128, attn_dim=64):
        super().__init__()
        self.W = nn.Linear(hidden_dim, attn_dim)
        self.v = nn.Linear(attn_dim, 1, bias=False)

    def forward(self, h):
        energy = self.v(torch.tanh(self.W(h))).squeeze(-1)  # (B, T)
        weights = F.softmax(energy, dim=1)
        return (h * weights.unsqueeze(-1)).sum(dim=1)        # (B, hidden_dim)


class BiLSTMLayer(nn.Module):
    def __init__(self, input_size=128, hidden_size=64, dropout=0.3):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True, bidirectional=True)
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        out, _ = self.lstm(self.drop(x))
        return out


class FluentNet(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.encoder = SEResNetEncoder()
        self.pool = nn.AdaptiveAvgPool2d((1, None))
        self.bilstm = BiLSTMLayer()
        self.attention = BahdanauAttention()
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes),
        )

    def forward(self, x):
        feat = self.encoder(x)           # (B, 128, 17, 44)
        feat = self.pool(feat).squeeze(2)  # (B, 128, 44)
        feat = feat.permute(0, 2, 1)     # (B, 44, 128)
        h = self.bilstm(feat)
        ctx = self.attention(h)
        return self.classifier(ctx)


def load_fluentnet(checkpoint_path: str, device: str = "cpu"):
    ck = torch.load(checkpoint_path, map_location=device, weights_only=False)
    class_names = ck.get("class_names", ["clean", "syllable_repetition", "word_repetition", "block"])
    model = FluentNet(num_classes=len(class_names))
    model.load_state_dict(ck["model_state_dict"])
    model.eval().to(device)
    return model, class_names
```

- [ ] **Step 3: Verify model loads**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
python3 -c "
import sys; sys.path.insert(0, 'inference_server')
from model import load_fluentnet
import torch
model, classes = load_fluentnet('checkpoints/best_model.pt')
dummy = torch.zeros(1, 1, 257, 701)
with torch.no_grad():
    out = model(dummy)
print('Output shape:', out.shape)  # expect torch.Size([1, 4])
print('Classes:', classes)
print('PASS')
"
```
Expected: `Output shape: torch.Size([1, 4])` then `PASS`

- [ ] **Step 4: Commit**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
git add inference_server/model.py
git commit -m "feat: FluentNet model definition matching best_model.pt checkpoint"
```

---

## Task 2: Audio Preprocessing

**Files:** Create `inference_server/preprocess.py`

- [ ] **Step 1: Write inference_server/preprocess.py**
```python
"""
Audio preprocessing for FluentNet inference.
Pipeline: load→mono→resample(16kHz)→pad/truncate(7s)→pre-emphasis→STFT→dB→[0,1]
Output tensor shape: (1, 1, 257, 701)
"""
import io
from math import gcd
import numpy as np
import soundfile as sf
import scipy.signal as ss
import torch

SR = 16_000
N_SAMPLES = 112_000   # 7s
N_FFT = 512
HOP = 160
WIN = 400
PRE_EMPH = 0.97
TARGET_T = 701


def audio_bytes_to_tensor(audio_bytes: bytes) -> torch.Tensor:
    # Load
    waveform, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
    # Mono
    if waveform.ndim == 2:
        waveform = waveform.mean(axis=1)
    # Resample
    if sr != SR:
        g = gcd(SR, sr)
        waveform = ss.resample_poly(waveform, SR // g, sr // g).astype(np.float32)
    # Pad/truncate
    if len(waveform) >= N_SAMPLES:
        waveform = waveform[:N_SAMPLES]
    else:
        waveform = np.pad(waveform, (0, N_SAMPLES - len(waveform)))
    # Pre-emphasis
    waveform = np.append(waveform[0], waveform[1:] - PRE_EMPH * waveform[:-1])
    # STFT
    window = ss.windows.hann(WIN)
    _, _, zxx = ss.stft(waveform, fs=SR, window=window,
                        nperseg=WIN, noverlap=WIN - HOP, nfft=N_FFT,
                        boundary="zeros", padded=True)
    mag = np.abs(zxx).astype(np.float32)  # (257, T)
    # Fix time axis to TARGET_T
    if mag.shape[1] >= TARGET_T:
        mag = mag[:, :TARGET_T]
    else:
        mag = np.pad(mag, ((0, 0), (0, TARGET_T - mag.shape[1])))
    # Amplitude → dB → min-max [0,1]
    ref = mag.max() if mag.max() > 0 else 1.0
    db = 20.0 * np.log10(np.maximum(mag / ref, 1e-10))
    lo, hi = db.min(), db.max()
    db = (db - lo) / (hi - lo) if hi > lo else np.zeros_like(db)
    # (1, 1, 257, 701)
    return torch.from_numpy(db.astype(np.float32)).unsqueeze(0).unsqueeze(0)
```

- [ ] **Step 2: Verify shape**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
python3 -c "
import sys, io, wave, numpy as np
sys.path.insert(0,'inference_server')
from preprocess import audio_bytes_to_tensor
buf=io.BytesIO()
with wave.open(buf,'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
    w.writeframes(np.zeros(112000,dtype=np.int16).tobytes())
t=audio_bytes_to_tensor(buf.getvalue())
print(t.shape)  # expect torch.Size([1, 1, 257, 701])
assert t.shape==(1,1,257,701),'FAIL'
print('PASS')
"
```

- [ ] **Step 3: Commit**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
git add inference_server/preprocess.py
git commit -m "feat: audio preprocessing pipeline (resample→pre-emphasis→STFT→dB→norm)"
```

---

## Task 3: FastAPI Server

**Files:** Create `inference_server/main.py`

- [ ] **Step 1: Write inference_server/main.py**
```python
"""StutterNet+ local inference server."""
import sys
from pathlib import Path
import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))
from model import FluentNet, load_fluentnet
from preprocess import audio_bytes_to_tensor

CHECKPOINT = Path(__file__).parent.parent / "checkpoints" / "best_model.pt"

CLASS_INFO = {
    "clean": {
        "transcript": "کوئی لکنت نہیں ملی — تقریر روانی کے ساتھ ہے",
        "disfluencyCount": 0, "severity_base": 0, "avgDuration": 0.0,
        "stutterTypes": [
            {"type":"Takrar (Repetitions)","urdu":"تکرار","count":0,"color":"bg-primary","percent":0},
            {"type":"Tawalat (Prolongations)","urdu":"طوالت","count":0,"color":"bg-accent","percent":0},
            {"type":"Rukawat (Blocks)","urdu":"رکاوٹ","count":0,"color":"bg-secondary","percent":0},
        ],
    },
    "syllable_repetition": {
        "transcript": "ماڈل کا نتیجہ: حرف کی تکرار",
        "disfluencyCount": 1, "severity_base": 50, "avgDuration": 0.5,
        "stutterTypes": [
            {"type":"Takrar (Repetitions)","urdu":"تکرار","count":1,"color":"bg-primary","percent":100},
            {"type":"Tawalat (Prolongations)","urdu":"طوالت","count":0,"color":"bg-accent","percent":0},
            {"type":"Rukawat (Blocks)","urdu":"رکاوٹ","count":0,"color":"bg-secondary","percent":0},
        ],
    },
    "word_repetition": {
        "transcript": "ماڈل کا نتیجہ: لفظ کی تکرار",
        "disfluencyCount": 1, "severity_base": 60, "avgDuration": 1.0,
        "stutterTypes": [
            {"type":"Takrar (Repetitions)","urdu":"تکرار","count":1,"color":"bg-primary","percent":100},
            {"type":"Tawalat (Prolongations)","urdu":"طوالت","count":0,"color":"bg-accent","percent":0},
            {"type":"Rukawat (Blocks)","urdu":"رکاوٹ","count":0,"color":"bg-secondary","percent":0},
        ],
    },
    "block": {
        "transcript": "ماڈل کا نتیجہ: رکاوٹ / بلاک",
        "disfluencyCount": 1, "severity_base": 70, "avgDuration": 1.5,
        "stutterTypes": [
            {"type":"Takrar (Repetitions)","urdu":"تکرار","count":0,"color":"bg-primary","percent":0},
            {"type":"Tawalat (Prolongations)","urdu":"طوالت","count":0,"color":"bg-accent","percent":0},
            {"type":"Rukawat (Blocks)","urdu":"رکاوٹ","count":1,"color":"bg-secondary","percent":100},
        ],
    },
}

_model: FluentNet | None = None
_class_names: list[str] = []

def get_model():
    global _model, _class_names
    if _model is None:
        if not CHECKPOINT.exists():
            raise RuntimeError(f"Checkpoint not found: {CHECKPOINT}")
        _model, _class_names = load_fluentnet(str(CHECKPOINT))
    return _model, _class_names

app = FastAPI(title="StutterNet+ Inference Server")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:8080","http://localhost:3000","http://localhost:5173"],
    allow_methods=["GET","POST"], allow_headers=["*"])

class Result(BaseModel):
    transcript: str; totalWords: int; disfluencyCount: int
    severityScore: int; confidence: int; avgDuration: float
    stutterTypes: list[dict]; highlightedWords: list[int]
    predictedClass: str; isLocalModelAnalysis: bool

@app.on_event("startup")
async def startup():
    try: get_model(); print(f"[StutterNet+] Model loaded: {CHECKPOINT}")
    except Exception as e: print(f"[StutterNet+] WARNING: {e}")

@app.get("/api/health")
def health():
    try:
        _, names = get_model()
        return {"status":"ok","model":"FluentNet","classes":names}
    except Exception as e:
        return {"status":"error","message":str(e)}

@app.post("/api/analyze", response_model=Result)
async def analyze(audio: UploadFile = File(...)):
    try: model, names = get_model()
    except RuntimeError as e: raise HTTPException(503, str(e))
    data = await audio.read()
    if not data: raise HTTPException(400, "Empty file")
    try: tensor = audio_bytes_to_tensor(data)
    except Exception as e: raise HTTPException(422, f"Preprocessing failed: {e}")
    with torch.no_grad():
        probs = F.softmax(model(tensor), dim=1)[0]
    idx = int(probs.argmax())
    cls = names[idx]
    conf = int(round(probs[idx].item() * 100))
    info = CLASS_INFO[cls]
    severity = int(info["severity_base"] * probs[idx].item()) if cls != "clean" else 0
    return Result(
        transcript=info["transcript"], totalWords=0,
        disfluencyCount=info["disfluencyCount"], severityScore=severity,
        confidence=conf, avgDuration=info["avgDuration"],
        stutterTypes=info["stutterTypes"], highlightedWords=[],
        predictedClass=cls, isLocalModelAnalysis=True,
    )
```

- [ ] **Step 2: Smoke test**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
python3 -m uvicorn inference_server.main:app --host 0.0.0.0 --port 8000 &
sleep 4
curl -s http://localhost:8000/api/health
kill %1
```
Expected: `{"status":"ok","model":"FluentNet",...}`

- [ ] **Step 3: Commit**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
git add inference_server/main.py
git commit -m "feat: FastAPI inference server /api/analyze and /api/health"
```

---

## Task 4: Requirements + Start Script

- [ ] **Step 1: Write inference_server/requirements.txt**
```
fastapi>=0.115.0
uvicorn[standard]>=0.35.0
torch>=2.0.0
scipy>=1.10.0
soundfile>=0.12.0
numpy>=1.24.0
python-multipart>=0.0.9
```

- [ ] **Step 2: Write inference_server/start.sh**
```bash
#!/usr/bin/env bash
set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "StutterNet+ Inference Server — http://localhost:8000"
cd "$PROJECT_DIR"
python3 -m uvicorn inference_server.main:app --host 0.0.0.0 --port 8000 --reload
```

- [ ] **Step 3: Make executable and commit**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
chmod +x inference_server/start.sh
git add inference_server/requirements.txt inference_server/start.sh
git commit -m "feat: inference server requirements.txt and start.sh"
```

---

## Task 5: Vite Proxy

**Files:** Modify `vite.config.ts`

- [ ] **Step 1: Add proxy to vite.config.ts**

In `vite.config.ts`, inside the `server:` block, add:
```typescript
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
```

Full updated file:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
}));
```

- [ ] **Step 2: Build check**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
npm run build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**
```bash
git add vite.config.ts
git commit -m "feat: Vite proxy /api→localhost:8000"
```

---

## Task 6: Frontend Inference Client

**Files:** Create `src/lib/inference.ts`

- [ ] **Step 1: Write src/lib/inference.ts**
```typescript
/**
 * inference.ts — unified audio analysis entry point.
 * VITE_INFERENCE_MODE=local  → trained FluentNet via /api/analyze
 * VITE_INFERENCE_MODE=gemini → Google Gemini 2.5 Flash (fallback)
 */
import { analyzeAudioWithGemini, AudioAnalysisResult } from "./gemini";

const MODE = import.meta.env.VITE_INFERENCE_MODE ?? "local";

async function analyzeWithLocalModel(blob: Blob): Promise<AudioAnalysisResult> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  const res = await fetch("/api/analyze", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return {
    transcript: d.transcript,
    totalWords: d.totalWords,
    disfluencyCount: d.disfluencyCount,
    severityScore: d.severityScore,
    confidence: d.confidence,
    avgDuration: d.avgDuration,
    stutterTypes: d.stutterTypes,
    highlightedWords: d.highlightedWords,
    isGeminiAnalysis: false,
  };
}

export async function analyzeAudio(blob: Blob): Promise<AudioAnalysisResult> {
  if (MODE === "local") {
    try {
      return await analyzeWithLocalModel(blob);
    } catch (err) {
      console.error("[inference] local model failed:", err);
      return {
        transcript: "خرابی: مقامی ماڈل تک رسائی ناممکن — سرور چل رہا ہے؟",
        totalWords: 0, disfluencyCount: 0, severityScore: 0,
        confidence: 0, avgDuration: 0, highlightedWords: [],
        stutterTypes: [
          { type:"Takrar (Repetitions)", urdu:"تکرار", count:0, color:"bg-primary", percent:0 },
          { type:"Tawalat (Prolongations)", urdu:"طوالت", count:0, color:"bg-accent", percent:0 },
          { type:"Rukawat (Blocks)", urdu:"رکاوٹ", count:0, color:"bg-secondary", percent:0 },
        ],
        error: err instanceof Error ? err.message : String(err),
        isGeminiAnalysis: false,
      };
    }
  }
  return analyzeAudioWithGemini(blob);
}

export function getInferenceMode(): "local" | "gemini" {
  return MODE === "gemini" ? "gemini" : "local";
}
```

- [ ] **Step 2: Commit**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
git add src/lib/inference.ts
git commit -m "feat: inference.ts — local/gemini mode switch via VITE_INFERENCE_MODE"
```

---

## Task 7: Update AudioRecorder.tsx

**Files:** Modify `src/components/AudioRecorder.tsx`

- [ ] **Step 1: Replace import line**

Find:
```typescript
import { analyzeAudioWithGemini, validateAudioDuration, AudioAnalysisResult } from "@/lib/gemini";
```
Replace with:
```typescript
import { analyzeAudio } from "@/lib/inference";
import { validateAudioDuration, AudioAnalysisResult } from "@/lib/gemini";
```

- [ ] **Step 2: Replace call site**

Find:
```typescript
      const analysis = await analyzeAudioWithGemini(recordedBlob);
```
Replace with:
```typescript
      const analysis = await analyzeAudio(recordedBlob);
```

- [ ] **Step 3: Build + commit**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
npm run build 2>&1 | tail -3
git add src/components/AudioRecorder.tsx
git commit -m "fix: AudioRecorder uses inference.ts instead of Gemini directly"
```

---

## Task 8: Create .env.local

- [ ] **Step 1: Create .env.local**

Create file at project root with this content:
```
# VITE_INFERENCE_MODE=local   → trained FluentNet (run: bash inference_server/start.sh)
# VITE_INFERENCE_MODE=gemini  → Google Gemini 2.5 Flash fallback
VITE_INFERENCE_MODE=local

# Only needed when VITE_INFERENCE_MODE=gemini
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

- [ ] **Step 2: Do NOT commit this file** (contains secrets). Add to .gitignore if desired.

---

## Task 9: Fix About.tsx Workflow Card

**Files:** Modify `src/pages/About.tsx`

- [ ] **Step 1: Replace the How This Demo Works CardContent**

Find the entire `<CardContent>` block inside the `<Zap>` card and replace with:
```tsx
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The live demo uses the <strong className="text-foreground">trained FluentNet model</strong> (SE-ResNet + BiLSTM + Bahdanau Attention, 722K parameters)
                running locally via a Python FastAPI server. Audio is recorded in the browser, sent to the server, preprocessed into an STFT spectrogram,
                and classified in under one second on a standard CPU.
                <strong className="text-primary"> Google Gemini 2.5 Flash is available as a fallback</strong> — switch via <code className="text-xs bg-black/30 px-1 rounded">VITE_INFERENCE_MODE=gemini</code> in <code className="text-xs bg-black/30 px-1 rounded">.env.local</code>.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
                {[
                  { label: "Record Audio", sub: "Browser MediaRecorder", color: "border-primary/50 bg-primary/5" },
                  { label: "→", arrow: true },
                  { label: "WAV Upload", sub: "POST /api/analyze", color: "border-secondary/50 bg-secondary/5" },
                  { label: "→", arrow: true },
                  { label: "FluentNet", sub: "SE-ResNet+BiLSTM+Attn", color: "border-accent/50 bg-accent/5" },
                  { label: "→", arrow: true },
                  { label: "Stutter Class", sub: "Harf / Lafz / Kaalb / Clean", color: "border-green-500/50 bg-green-500/5" },
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
              <div className="mt-3 p-3 bg-black/20 rounded-lg border border-white/10 text-xs text-muted-foreground">
                <strong className="text-foreground">Switching:</strong> Set <code className="bg-black/30 px-1 rounded">VITE_INFERENCE_MODE=local</code> (default) for FluentNet,
                or <code className="bg-black/30 px-1 rounded">VITE_INFERENCE_MODE=gemini</code> for Gemini. Restart dev server after changing.
              </div>
            </CardContent>
```

- [ ] **Step 2: Update "Our Contributions" list**

Find: `<li>Two trained deep learning detection models</li>`
Replace with: `<li>Three evaluated architectures: FluentNet (722K), Custom CNN+BiGRU (155K), StutterNet baseline (434K)</li>`

- [ ] **Step 3: Build + commit**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
npm run build 2>&1 | tail -3
git add src/pages/About.tsx
git commit -m "fix: About workflow shows FluentNet as primary, Gemini as env-controlled fallback"
```

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Start inference server**
```bash
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
bash inference_server/start.sh &
sleep 4
```

- [ ] **Step 2: Health check**
```bash
curl -s http://localhost:8000/api/health
```
Expected: `{"status":"ok","model":"FluentNet","classes":["clean","syllable_repetition","word_repetition","block"]}`

- [ ] **Step 3: Test with a sample if available**
```bash
SAMPLE=$(find "/Users/abdullah/Desktop/Stutter /StutterNet-/public" -name "*.mp3" 2>/dev/null | head -1)
[ -n "$SAMPLE" ] && curl -s -X POST http://localhost:8000/api/analyze -F "audio=@$SAMPLE" | python3 -m json.tool
```

- [ ] **Step 4: Final build**
```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 5: Kill server, final commit**
```bash
kill %1 2>/dev/null || true
git add inference_server/
git status
```

---

## Usage Summary

```bash
# Terminal 1 — inference server (trained model)
bash "/Users/abdullah/Desktop/Stutter /StutterNet-/inference_server/start.sh"

# Terminal 2 — frontend
cd "/Users/abdullah/Desktop/Stutter /StutterNet-"
npm run dev
```

Switch to Gemini: edit `.env.local` → `VITE_INFERENCE_MODE=gemini` + add real API key → restart `npm run dev`.
