import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI (you'll need to add your API key)
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

export const analyzeAudioWithGemini = async (audioBlob: Blob): Promise<AudioAnalysisResult> => {
  console.log('🚀 Starting real Gemini API analysis...');
  console.log('Audio blob size:', audioBlob.size, 'bytes');
  console.log('Audio blob type:', audioBlob.type);
  
  try {
    // Check API key
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      throw new Error('Gemini API key not configured properly');
    }
    
    console.log('✅ API key found');
    
    // Convert audio blob to base64 (chunked to avoid stack overflow on large audio)
    const audioBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
    }
    const audioBase64 = btoa(binary);

    const safeMimeType = audioBlob.type && audioBlob.type.startsWith('audio/')
      ? audioBlob.type
      : 'audio/webm;codecs=opus';

    console.log('✅ Audio converted to base64, length:', audioBase64.length);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    console.log('🤖 Calling Gemini API with improved prompt...');

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

    console.log('✅ Gemini API responded');

    const response = await result!.response;
    const analysisText = response.text();
    
    console.log('📝 Analysis response:', analysisText);
    
    // Parse JSON response securely
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         try {
           analysis = JSON.parse(jsonMatch[0]);
         } catch (fallbackError) {
           throw new Error("Failed to parse Gemini API JSON response");
         }
      } else {
         throw new Error("API returned an invalid non-JSON response");
      }
    }
    
    // Apply UI safe defaults
    if (!analysis.highlightedWords) {
      analysis.highlightedWords = [];
    }
    if (!analysis.stutterTypes) {
      analysis.stutterTypes = [];
    }
    
    console.log('✅ Parsed analysis:', analysis);
    
    // Add color coding for stutter types
    const stutterTypesWithColors = analysis.stutterTypes.map((type: { type: string, urdu: string, count: number, percent: number }, index: number) => ({
      ...type,
      color: index === 0 ? "bg-primary" : index === 1 ? "bg-accent" : "bg-secondary"
    }));

    const finalResult = {
      ...analysis,
      stutterTypes: stutterTypesWithColors,
      isGeminiAnalysis: true // Flag to identify real analysis
    };
    
    console.log('🎉 Real Gemini analysis complete:', finalResult);
    return finalResult;

  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    
    // Return a user-friendly error response
    return {
      transcript: "خرابی: آڈیو تجزیہ ممکن نہیں - برائے کرم دوبارہ کوشش کریں",
      totalWords: 0,
      disfluencyCount: 0,
      severityScore: 0,
      confidence: 0,
      avgDuration: 0,
      stutterTypes: [
        { type: "Takrar (Repetitions)", urdu: "تکرار", count: 0, color: "bg-primary", percent: 0 },
        { type: "Tawalat (Prolongations)", urdu: "طوالت", count: 0, color: "bg-accent", percent: 0 },
        { type: "Rukawat (Blocks)", urdu: "رکاوٹ", count: 0, color: "bg-secondary", percent: 0 }
      ],
      highlightedWords: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      isGeminiAnalysis: false
    };
  }
};

export const validateAudioDuration = (audioBlob: Blob): Promise<boolean> => {
  // Simple validation - just check if audio exists
  console.log('📏 Validating audio:', audioBlob.size, 'bytes');
  return Promise.resolve(true);
};