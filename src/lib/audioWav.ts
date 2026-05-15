/** Decode browser audio → 16 kHz mono WAV for FluentNet / Gemini. */

const TARGET_SAMPLE_RATE = 16_000;

async function decodeToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close();
  }
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0).slice();
  }
  const { length } = buffer;
  const mono = new Float32Array(length);
  const n = buffer.numberOfChannels;
  for (let c = 0; c < n; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += ch[i];
  }
  for (let i = 0; i < length; i++) mono[i] /= n;
  return mono;
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const outLen = Math.max(1, Math.round((input.length * toRate) / fromRate));
  const output = new Float32Array(outLen);
  const ratio = input.length / outLen;
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? 0;
    output[i] = s0 + frac * (s1 - s0);
  }
  return output;
}

function encodeWavPcm16(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  new Uint8Array(buffer, 44).set(new Uint8Array(pcm.buffer));

  return new Blob([buffer], { type: "audio/wav" });
}

export async function measureAudioDurationSeconds(blob: Blob): Promise<number> {
  const buf = await decodeToAudioBuffer(blob);
  return buf.duration;
}

export async function prepareAudioForAnalysis(
  blob: Blob,
): Promise<{ wavBlob: Blob; durationSec: number }> {
  const audioBuffer = await decodeToAudioBuffer(blob);
  const mono = mixToMono(audioBuffer);
  const resampled = resampleLinear(mono, audioBuffer.sampleRate, TARGET_SAMPLE_RATE);
  const durationSec = resampled.length / TARGET_SAMPLE_RATE;
  const wavBlob = encodeWavPcm16(resampled, TARGET_SAMPLE_RATE);
  return { wavBlob, durationSec };
}
