# StutterNet+ Demo Video Script
**Estimated Duration: ~2 minutes 10 seconds @ 1.09x ElevenLabs speed (~450 words)**
**Format:** Two synced scripts — ElevenLabs narration + your on-screen navigation actions

---

## OVERVIEW OF FLOW
```
[00:00] Homepage    → 15s — one-line project intro
[00:15] About       → 45s — problem, dataset, architecture, severity
[01:00] Dataset     → 20s — corpus showcase
[01:20] Homepage    → 5s  — transition back
[01:25] Try Demo    → 45s — select sample, analyze, review results
[02:10] Closing     → 10s — sign-off + live audio mention
```

---
---

# SCRIPT A — ELEVEN LABS NARRATION
*(Paste each segment verbatim. ~450 words total — designed for ~2 minutes at 1.09x ElevenLabs speed. Pauses come from punctuation only.)*

---

**[SEGMENT 1 — Homepage | 00:00–00:22]**

Welcome to StutterNet Plus — the world's first deep learning system for automatic stutter detection in the Urdu language. Urdu is spoken by over 230 million people worldwide, yet before this project, not a single AI-powered speech pathology tool existed for the language. No dataset, no model, no diagnostic software of any kind. StutterNet Plus changes that. The platform offers three modes of analysis — live microphone recording for real-time assessment, audio file upload for existing recordings, and a built-in demo using real samples from our research dataset.

---

**[SEGMENT 2 — About Page: Problem & Dataset | 00:22–00:48]**

The About page tells the full research story. The challenge we faced was twofold — there were no automated stutter detection tools for Urdu, and there was no annotated dataset to train one on. So we solved both problems at once. We constructed the first-ever Urdu stuttering speech corpus from scratch: five hundred and forty-three labelled audio samples, approximately 65 minutes of speech in total. The dataset combines AI-generated synthetic recordings — produced using ElevenLabs voice cloning across three different speaker personas — with 128 real human speech recordings sourced from podcasts and a community corpus. Three stutter classes are covered: syllable repetition, word repetition, and block-pause events, with near-perfect class balance across the entire dataset.

---

**[SEGMENT 3 — About Page: Architecture & Severity | 00:48–01:15]**

For the model, we evaluated multiple deep learning architectures. Our best-performing configuration is FluentNet — a Squeeze-and-Excitation ResNet encoder feeding into a Bidirectional LSTM with Bahdanau Attention, trained on short-time Fourier transform spectrograms. With 722 thousand parameters, it achieves 61.9 percent accuracy. We also designed a clinical severity scoring system that mirrors real speech-language pathology practice. Blocks — where a speaker is completely arrested mid-sentence — are weighted the highest at two. Prolongations at one point five. And repetitions at one. The weighted count is normalized against the total words spoken, producing a single severity score from zero to one hundred. Mild, moderate, or severe — at a glance.

---

**[SEGMENT 4 — Dataset Page | 01:15–01:33]**

The Dataset page presents the full corpus. Five hundred and forty-three annotated clips, balanced equally across all three stutter classes. Each sample includes ASHA-standard annotation markers overlaid directly on the Urdu transcript, so researchers can see exactly which phonemes or words were flagged. Every clip is playable right here in the browser.

---

**[SEGMENT 5 — Demo | 01:33–02:05]**

Back on the homepage, we click Try Demo. Four real dataset samples load — Syllable Repetition, Pause and Block, Word-level Stuttering, and Mixed Stuttering. We select Syllable Repetition and hit Analyze. The model processes the audio in under a second — uploading the clip, extracting spectrogram features, and running the FluentNet classifier. The result: an overall severity score of 52 percent — Moderate — with two syllable repetition events detected. The confidence score, waveform visualization, and fully annotated Urdu transcript are all shown below. For your own recordings, the Upload File mode accepts any WAV file. And the Record Audio mode lets clinicians assess patients live, directly in the browser, with no additional software needed.

---

**[SEGMENT 6 — Closing | 02:05–02:15]**

StutterNet Plus. A Final Year Project from FAST-NUCES, by Abdullah Naeem, Ibrahim Zia, and Matiullah Khan — supervised by Ms. Umm-e-Ammarah.

---
---

# SCRIPT B — YOUR NAVIGATION CUES
*(Print or keep this on a second screen while recording. Each line tells you exactly what to do on screen, synced to the timestamp.)*

---

| Timestamp | Your Action |
|-----------|-------------|
| **00:00** | **Homepage.** Recording starts. Hero is fully visible — StutterNet+ title, Urdu subtitle, three action cards. Stay still for 5 seconds. |
| **00:05** | Slowly scroll down to reveal the three feature pills at the bottom: **Real-time Waveform · Deep Learning AI · Urdu Native**. |
| **00:12** | Scroll back up to the hero. |
| **00:18** | Click **"About"** in the top navbar. |
| **00:20** | **About page loads.** Stay on **Project Overview** — heading, problem statement, 543-sample callout visible. |
| **00:30** | Scroll down slowly to reveal the **Dataset stats row** (543 / 415 / 128 / ~65 min cards) and the source table below it. |
| **00:42** | Continue scrolling to **Model 1: FluentNet** — show the architecture pipeline block (Input → SE-ResNet → BiLSTM → Attention → Classifier). |
| **00:52** | Continue scrolling to **How We Measure Severity** — let the three weighted cards (Repetitions ×1.0 · Prolongations ×1.5 · Blocks ×2.0) be clearly visible. |
| **01:05** | Scroll slightly to show the **severity formula line** below the cards. |
| **01:10** | Click **"Dataset"** in the top navbar. |
| **01:12** | **Dataset page.** Stay on the header — **"Urdu Stuttering Corpus"** title and the stutter class legend (Syllable / Block+Pause / Word). |
| **01:18** | Scroll down slowly to show **annotated sample cards** — Urdu text with colored inline stutter markers. |
| **01:26** | Scroll a bit more to show the **stats row** at the bottom (543 / ~65 min / 415 / 128). |
| **01:30** | Click the **StutterNet+ logo** in the top-left navbar to go back to Homepage. |
| **01:32** | **Homepage.** Stay still on hero for 2 seconds. |
| **01:34** | Click the **"Try Demo"** card (play icon, third card). |
| **01:36** | **Demo panel opens.** Let all 4 sample cards be visible. Pause for a moment. |
| **01:40** | Click **"Syllable Repetition"** (top-left, 0:04). Card highlights as selected. |
| **01:44** | Click **"Analyze Demo Sample"** button. |
| **01:46** | **Analyzing overlay** — Uploading → Extracting Features → Running Model → Classification Complete. Do NOT touch the screen. |
| **01:58** | **Results appear.** Stay on the **52% severity gauge** (Moderate) and the waveform visualization. |
| **02:03** | Scroll down slightly to reveal **Classification Breakdown** (Takrar: 2 / Tawwal: 0 / Rukawat: 0) and the **Urdu transcript**. |
| **02:07** | Click **"← Start New Analysis"**. Briefly click **"Upload File"** card — let it appear, don't upload. Then briefly click **"Record Audio"** — don't record. |
| **02:12** | Click the logo to return to homepage hero. Hold this as the narration closes. |
| **02:15** | Stop recording. |

---

## PRODUCTION NOTES

- **Screen resolution:** Record at 1440×900 or 1280×800 for a clean look. Avoid 4K unless you'll scale it down.
- **Browser:** Use Chrome/Arc in fullscreen, hide bookmarks bar.
- **Cursor:** Use a larger cursor or cursor-highlight tool so viewers can follow your clicks.
- **Scroll speed:** Slow and deliberate — 2–3 seconds per scroll gesture.
- **Pauses:** Pauses in the narration are created by punctuation — periods, em-dashes, and paragraph breaks. ElevenLabs reads these naturally. If a page takes a moment to load, slow your scroll to fill the gap, or add a subtle zoom in post.
- **ElevenLabs voice recommendation:** "Rachel" or "Adam" at 0.95 stability, 0.65 similarity. Speed: 1.0x (default).
- **Music:** Low-key ambient/lo-fi background at -18 to -20 dB under the narration. Fade out at closing line.
