import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, Brain, Zap, Play, Pause, Volume2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AudioAnalysisResult } from "@/lib/gemini";
import { DEMO_ANALYSIS_RESULTS, DEMO_DATASET } from "@/config/constants";

interface AnalysisResultsProps {
  audioUrl?: string;
  duration?: number;
  selectedDemo?: string | null;
  analysisData?: AudioAnalysisResult; // Real analysis data from Gemini API
}

const AnalysisResults = ({ audioUrl, duration = 45, selectedDemo, analysisData }: AnalysisResultsProps) => {
  const [isLoaded, setIsLoaded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Look up the demo sample metadata (label, stutter subtype) from DEMO_DATASET
  const demoSampleMeta = selectedDemo ? DEMO_DATASET.find(s => s.id === selectedDemo) : null;

  // Use real analysis data if available, otherwise use demo data or default
  const data = analysisData || (selectedDemo && DEMO_ANALYSIS_RESULTS[selectedDemo]) || {
    severityScore: 65,
    totalWords: 25,
    disfluencyCount: 5,
    avgDuration: 2.1,
    confidence: 95,
    stutterTypes: [
      { type: "Syllable Level",      urdu: "حرف سطح",      count: 3, color: "bg-primary",   percent: 60 },
      { type: "Word Level",          urdu: "لفظ سطح",      count: 1, color: "bg-accent",    percent: 20 },
      { type: "Pause / Block Level", urdu: "وقفہ / رکاوٹ", count: 1, color: "bg-secondary", percent: 20 }
    ],
    transcript: "یہ اک نمونہ ٹرانسکرپٹ ہے جس میں کچھ الفاظ کو نشان زد کیا گیا ہے",
    highlightedWords: [2, 3, 8]
  };


  const { severityScore, totalWords, disfluencyCount, avgDuration, confidence, stutterTypes, transcript, highlightedWords, isComingSoon, message, urduMessage } = data as any;

  // Check if this is a coming soon feature
  if (isComingSoon) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <Card className="backdrop-blur-2xl bg-card/40 border border-white/10 shadow-xl">
          <div className="p-12 text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center border border-white/10">
              <Brain className="w-12 h-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-foreground">{message}</h2>
              <p className="text-xl font-urdu text-primary/80 dir-rtl">{urduMessage}</p>
              <p className="text-muted-foreground max-w-md mx-auto">
                Advanced mixed stutter pattern analysis with multiple disfluency types is under development. 
                Single stutter type analysis is available for all samples.
              </p>
            </div>
            <div className="flex justify-center gap-4 pt-4">
              <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Another Sample
              </Button>
            </div>
          </div>
        </Card>
        <audio ref={audioRef} />
      </div>
    );
  }

  // Audio playback handler
  const handleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      toast.success("Audio Stopped");
    } else {
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          toast.success("Playing Audio");
        }).catch(() => {
          toast.error("Audio playback failed");
        });
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      } else {
        toast.error("No audio available");
      }
    }
  };

  // Dynamic severity classification
  const getSeverityLevel = (score: number) => {
    if (score === 0) return { label: "No Stuttering", urdu: "کوئی لکنت نہیں", color: "text-green-400" };
    if (score < 25) return { label: "Very Mild", urdu: "بہت کم", color: "text-green-400" };
    if (score < 50) return { label: "Mild", urdu: "کم", color: "text-yellow-400" };
    if (score < 75) return { label: "Moderate", urdu: "درمیانہ", color: "text-orange-400" };
    return { label: "Severe", urdu: "شدید", color: "text-red-400" };
  };

  const severityInfo = getSeverityLevel(severityScore);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { icon: Brain, label: "AI Confidence", value: `${confidence}%`, color: "text-primary", bg: "bg-primary/10" },
          { icon: Zap, label: "Processing Time", value: "1.2s", color: "text-accent", bg: "bg-accent/10" },
        ].map((stat, i) => (
          <Card key={i} className="backdrop-blur-xl bg-card/30 border border-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Enhanced Interactive Waveform */}
      <Card className="backdrop-blur-2xl bg-card/40 border border-white/10 shadow-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="text-foreground">Audio Waveform Analysis</span>
              <span className="text-sm font-urdu text-muted-foreground">آڈیو ویو فارم</span>
            </div>
            <Button
              onClick={handleAudioPlayback}
              variant="outline"
              size="sm"
              className="border-primary/50 text-primary hover:bg-primary/20"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Audio
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Listen Audio
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Interactive Waveform */}
          <div className="w-full h-40 bg-black/40 rounded-xl flex items-center justify-center overflow-hidden p-4 border border-white/5 shadow-inner relative">
            <div className="flex items-end justify-center space-x-[2px] w-full h-full">
              {[...Array(120)].map((_, i) => {
                // Create more realistic waveform with stutter patterns
                const isStutterZone = highlightedWords?.some(wordIndex => {
                  const wordPosition = (wordIndex / transcript.split(" ").length) * 120;
                  return Math.abs(i - wordPosition) < 5;
                }) || false;
                const baseHeight = 20 + Math.sin(i * 0.1) * 15 + Math.random() * 30;
                const stutterMultiplier = isStutterZone ? 1.8 : 1;
                const finalHeight = Math.max(5, baseHeight * stutterMultiplier);
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-sm transition-all duration-300 relative group cursor-pointer",
                      isStutterZone 
                        ? "bg-accent shadow-[0_0_8px_0_rgba(255,0,153,0.6)] hover:shadow-[0_0_15px_0_rgba(255,0,153,0.8)]" 
                        : "bg-primary/60 hover:bg-primary/80"
                    )}
                    style={{
                      height: `${finalHeight}%`,
                    }}
                    title={isStutterZone ? "Stutter detected" : "Normal speech"}
                  >
                    {isStutterZone && (
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 animate-ping" />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Waveform Labels */}
            <div className="absolute top-2 left-4 text-xs text-muted-foreground bg-black/50 px-2 py-1 rounded">
              Duration: {duration}s
            </div>
            <div className="absolute top-2 right-4 text-xs text-muted-foreground bg-black/50 px-2 py-1 rounded">
              {disfluencyCount > 0 ? `${disfluencyCount} stutters detected` : "No stutters detected"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Overall Score Card */}
        <Card className="backdrop-blur-2xl bg-card/40 border border-white/10 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
          <CardHeader>
            <CardTitle className="text-center text-xl flex flex-col items-center gap-2">
              <span className="font-urdu text-primary text-2xl">مجموعی شدت کا سکور</span>
              <span className="text-sm font-normal text-muted-foreground tracking-widest uppercase">Overall Severity Score</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-10">
            <div className="relative w-48 h-48 mb-6 mt-4">
              {/* Animated Progress Ring */}
              <svg className="transform -rotate-90 w-full h-full p-2">
                <circle
                  cx="50%"
                  cy="50%"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-muted/20"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - (isLoaded ? severityScore : 0) / 100)}`}
                  className={cn(
                    "transition-all duration-2000 ease-out drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]",
                    severityScore > 75 ? "text-destructive drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]" : 
                    severityScore > 50 ? "text-warning drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]" : "text-primary"
                  )}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-bold text-white tracking-tighter">
                  {isLoaded ? severityScore : 0}%
                </div>
                <div className={cn("text-xs font-medium tracking-widest uppercase mt-1", severityInfo.color)}>
                  {severityInfo.label}
                </div>
                <div className="text-xs font-urdu text-muted-foreground mt-1">
                  {severityInfo.urdu}
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">AI Confidence: {confidence}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Stutter Type Breakdown */}
        <Card className="backdrop-blur-2xl bg-card/40 border border-white/10 shadow-xl overflow-hidden flex flex-col justify-center">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Activity className="w-5 h-5 text-accent" />
              <span className="text-foreground">Classification Breakdown</span>
              <span className="text-sm font-urdu text-muted-foreground ml-auto">لکنت کی اقسام</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stutter subtype badge — shown in demo mode */}
            {demoSampleMeta && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-xs text-muted-foreground">Detected Subtype:</span>
                <span className="text-sm font-bold text-primary">{demoSampleMeta.label}</span>
                <span className="text-sm font-urdu text-primary/80 mr-auto">{demoSampleMeta.labelUrdu}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">{demoSampleMeta.stutterType}</span>
              </div>
            )}
            {stutterTypes && stutterTypes.map((stutter: { type: string, urdu: string, count: number, color: string, percent: number }, index: number) => (
              <div key={index} className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{stutter.type}</span>
                    <span className="text-xs font-urdu text-muted-foreground">
                      {stutter.urdu}
                    </span>
                  </div>
                  <div className="flex items-end flex-col">
                    <span className="text-lg font-bold text-foreground">{stutter.count}</span>
                    <span className="text-xs text-muted-foreground">{stutter.percent}%</span>
                  </div>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000 group-hover:shadow-[0_0_10px_0_currentColor]", stutter.color)}
                    style={{ width: `${stutter.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Transcript */}
      <Card className="backdrop-blur-2xl bg-card/40 border border-white/10 shadow-xl overflow-hidden relative">
        <CardHeader>
          <CardTitle className="text-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-urdu">نقل</span>
                <span>/ Transcript</span>
              </div>
              <div className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded">
                Words: {totalWords} | Stutters: {disfluencyCount}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black/20 rounded-xl p-6 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary" />
            
            {/* Audio Player */}
            <audio ref={audioRef} style={{ display: 'none' }} />
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Button
                  onClick={handleAudioPlayback}
                  variant="outline"
                  size="sm"
                  className="border-accent/50 text-accent hover:bg-accent/20"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  {isPlaying ? "Stop" : "Play"} Original Audio
                </Button>
                <div className="text-xs text-muted-foreground">
                  Verify audio matches transcript
                </div>
              </div>
            </div>
            
            <p className="text-foreground leading-relaxed text-lg mb-4" dir="rtl" style={{ fontFamily: 'Noto Nastaliq Urdu, serif', lineHeight: '2.5' }}>
              {transcript.split(" ").map((word: string, i: number) => {
                const isStutter = highlightedWords?.includes(i) || false;
                // Strip Gemini asterisk markers (*word*) before display
                const cleanWord = word.replace(/^\*|\*$/g, '');
                const isUrduWord = /[\u0600-\u06FF]/.test(cleanWord);

                return (
                  <span
                    key={i}
                    className={cn(
                      "transition-all inline-block px-2 py-1 rounded relative mx-1",
                      isStutter
                        ? "bg-accent/20 text-accent font-bold border-b-2 border-accent hover:bg-accent/30 cursor-pointer shadow-sm"
                        : "hover:bg-white/5",
                      isUrduWord ? "font-urdu" : "font-sans"
                    )}
                    style={{
                      direction: isUrduWord ? 'rtl' : 'ltr',
                      display: 'inline-block',
                      verticalAlign: 'baseline'
                    }}
                    title={isStutter ? `Detected stutter: ${cleanWord}` : ""}
                  >
                    {cleanWord}
                    {isStutter && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-ping opacity-75" />
                    )}
                  </span>
                );
              })}
            </p>
            
            {/* Transcript Statistics */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{totalWords > 0 ? ((disfluencyCount / totalWords) * 100).toFixed(1) : "0.0"}%</div>
                <div className="text-xs text-muted-foreground">Stutter Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-accent">{totalWords}</div>
                <div className="text-xs text-muted-foreground">Total Words</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-secondary">{avgDuration}s</div>
                <div className="text-xs text-muted-foreground">Avg Duration</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisResults;