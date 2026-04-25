/**
 * inference.ts — unified audio analysis entry point.
 * VITE_INFERENCE_MODE=local  → trained FluentNet via /api/analyze
 * VITE_INFERENCE_MODE=gemini → Google Gemini 2.5 Flash (fallback)
 */
import { analyzeAudioWithGemini, AudioAnalysisResult } from "./gemini";

const MODE = import.meta.env.VITE_INFERENCE_MODE ?? "local";

/**
 * Convert any browser audio blob (webm, mp4, ogg…) to 16-bit mono WAV
 * using the Web Audio API so soundfile on the server can always read it.
 */
async function toWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close();
  }

  // Mix down to mono at 16 kHz
  const numSamples = decoded.length;
  const numChannels = decoded.numberOfChannels;
  const pcm = new Float32Array(numSamples);
  for (let ch = 0; ch < numChannels; ch++) {
    const chData = decoded.getChannelData(ch);
    for (let i = 0; i < numSamples; i++) pcm[i] += chData[i];
  }
  for (let i = 0; i < numSamples; i++) pcm[i] /= numChannels;

  // Encode as 16-bit PCM WAV
  const int16 = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)));
  }

  const sr = decoded.sampleRate;
  const byteRate = sr * 2;
  const dataSize = int16.byteLength;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const write = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, dataSize, true);
  new Int16Array(buf, 44).set(int16);

  return new Blob([buf], { type: "audio/wav" });
}

async function analyzeWithLocalModel(blob: Blob): Promise<AudioAnalysisResult> {
  const wav = await toWav(blob);
  const form = new FormData();
  form.append("audio", wav, "recording.wav");
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
