/**
 * inference.ts — unified audio analysis entry point.
 * VITE_INFERENCE_MODE=local  → trained FluentNet via /api/analyze (16 kHz mono WAV)
 * VITE_INFERENCE_MODE=gemini → Google Gemini (same WAV normalisation as local)
 */
import { analyzeAudioWithGemini, AudioAnalysisResult } from "./gemini";
import { prepareAudioForAnalysis } from "./audioWav";

const MODE = import.meta.env.VITE_INFERENCE_MODE ?? "local";

async function analyzeWithLocalModel(blob: Blob): Promise<AudioAnalysisResult> {
  const { wavBlob } = await prepareAudioForAnalysis(blob);
  const form = new FormData();
  form.append("audio", wavBlob, "recording.wav");
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
          { type:"Syllable Level",      urdu:"حرف سطح",      count:0, color:"bg-primary",   percent:0 },
          { type:"Word Level",          urdu:"لفظ سطح",      count:0, color:"bg-accent",    percent:0 },
          { type:"Pause / Block Level", urdu:"وقفہ / رکاوٹ", count:0, color:"bg-secondary", percent:0 },
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
