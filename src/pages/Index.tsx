import { useState, useEffect, useRef } from "react";
import Navigation from "@/components/Navigation";
import AudioRecorder from "@/components/AudioRecorder";
import FileUpload from "@/components/FileUpload";
import AnalysisResults from "@/components/AnalysisResultsNew";
import { Button } from "@/components/ui/button";
import { Mic, Upload, Activity, Database, CheckCircle2, Brain, Sparkles, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AudioAnalysisResult } from "@/lib/gemini";
import { DEMO_DATASET, APP_CONFIG } from "@/config/constants";

const Index = () => {
  const [inputMode, setInputMode] = useState<"record" | "upload" | "demo" | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AudioAnalysisResult | null>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const demoSamples = DEMO_DATASET;

  const processingSteps = [
    { label: "Uploading Audio...", urdu: "آڈیو اپ لوڈ ہو رہی ہے", icon: Upload },
    { label: "Extracting MFCC Features...", urdu: "خصوصیات نکالی جا رہی ہیں", icon: Activity },
    { label: "Running Urdu-Stutter-Net...", urdu: "ماڈل چل رہا ہے", icon: Database },
    { label: "Classification Complete", urdu: "درجہ بندی مکمل", icon: CheckCircle2 },
  ];

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

  const handleDemoMode = () => {
    setInputMode('demo');
    // Default to first sample if none selected
    const sample = demoSamples[0];
    setAudioData(`/demo-samples/${sample.filename}`);
    setRecordingTime(sample.duration);
    setSelectedDemo(sample.id);
    toast.success("Demo Mode Activated", {
      description: "Select from real Urdu stuttering dataset samples"
    });
  };

  const handleDemoSelection = (demoId: string) => {
    const sample = demoSamples.find(s => s.id === demoId);
    if (sample) {
      if (sample.isComingSoon) {
        toast.info("Feature Coming Soon", {
          description: "Mixed stutter analysis is under development"
        });
        return;
      }
      
      setSelectedDemo(demoId);
      setAudioData(`/demo-samples/${sample.filename}`);
      setRecordingTime(sample.duration);
      toast.success("Demo Sample Selected", {
        description: `${sample.label} - ${sample.description}`
      });
    }
  };

  const handleReset = () => {
    setInputMode(null);
    setAudioData(null);
    setShowResults(false);
    setIsAnalyzing(false);
    setProcessingStep(0);
    setRecordingTime(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/30 selection:text-white">
      {/* Background Ambience — hidden on mobile for performance */}
      <div className="fixed inset-0 bg-gradient-mesh opacity-40 pointer-events-none z-0" />
      <div className="hidden sm:block fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="hidden sm:block fixed bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-secondary/20 rounded-full blur-[150px] pointer-events-none animate-pulse-glow" style={{ animationDelay: "1s" }} />

      {/* Decorative Urdu Background Words & Shapes — hidden on mobile for performance */}
      <div className="hidden sm:block fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Original Words */}
        <div className="absolute top-[10%] left-[5%] text-9xl font-urdu text-white/5 rotate-12 blur-sm animate-float" style={{ animationDuration: '20s' }}>آواز</div>
        <div className="absolute top-[20%] right-[10%] text-8xl font-urdu text-primary/5 -rotate-12 blur-[2px] animate-float" style={{ animationDuration: '25s', animationDelay: '2s' }}>تکلم</div>
        <div className="absolute bottom-[15%] left-[15%] text-[10rem] font-urdu text-secondary/5 rotate-6 blur-sm animate-float" style={{ animationDuration: '30s', animationDelay: '5s' }}>روانی</div>
        <div className="absolute bottom-[25%] right-[5%] text-9xl font-urdu text-white/5 -rotate-6 blur-[2px] animate-float" style={{ animationDuration: '22s', animationDelay: '1s' }}>تحقیق</div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 text-[15rem] font-urdu text-primary/5 rotate-0 blur-md opacity-30 animate-pulse" style={{ animationDuration: '10s' }}>اردو</div>

        {/* New Additional Words */}
        <div className="absolute top-[5%] left-[40%] text-6xl font-urdu text-accent/5 rotate-45 blur-[1px] animate-float" style={{ animationDuration: '18s', animationDelay: '3s' }}>لہجہ</div>
        <div className="absolute bottom-[10%] right-[30%] text-7xl font-urdu text-white/5 -rotate-12 blur-[1px] animate-float" style={{ animationDuration: '28s', animationDelay: '4s' }}>تلفظ</div>
        <div className="absolute top-[60%] left-[5%] text-8xl font-urdu text-secondary/5 rotate-90 blur-sm animate-float" style={{ animationDuration: '35s', animationDelay: '0s' }}>سماجی</div>
        <div className="absolute top-[15%] right-[40%] text-6xl font-urdu text-primary/5 rotate-180 blur-[2px] animate-float" style={{ animationDuration: '40s', animationDelay: '7s' }}>نفسیاتی</div>

        {/* Geometric Shapes */}
        <div className="absolute top-[30%] left-[20%] w-32 h-32 border border-white/5 rounded-full animate-spin-slow opacity-20" />
        <div className="absolute bottom-[40%] right-[20%] w-48 h-48 border border-primary/10 rounded-full animate-spin-reverse-slow opacity-20" />
        <div className="absolute top-[10%] right-[5%] w-24 h-24 border-2 border-dashed border-accent/10 rounded-full animate-spin-slow opacity-20" />
        <svg className="absolute top-0 left-0 w-full h-full opacity-10">
          <path d="M0,100 Q200,200 400,100 T800,100" fill="none" stroke="white" strokeWidth="2" className="animate-pulse" />
          <path d="M0,300 Q200,400 400,300 T800,300" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary animate-pulse" style={{ animationDelay: '1s' }} />
        </svg>
      </div>

      <div className={cn("relative z-10 flex flex-col", showResults ? "min-h-screen" : "min-h-screen sm:h-screen sm:overflow-hidden")}>
        <Navigation />

        <main className="flex-grow container mx-auto px-6 flex flex-col items-center justify-center sm:justify-center">

          {/* Hero Section */}
          {!inputMode && !showResults && (
            <div className="w-full flex flex-col items-center justify-center space-y-6 py-6 sm:py-4 sm:h-full">

              <div className="text-center relative z-10 animate-fade-in space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-2 animate-fade-in">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-white/80">Next-Gen Speech Pathology AI</span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter drop-shadow-2xl leading-none">
                  <span className="bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent">Stutter</span>
                  <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Net+</span>
                </h1>

                <p className="text-xl md:text-3xl font-urdu text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-float">
                  اردو زبان میں لکنت کی جدید تشخیص
                </p>

                <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-tight px-4">
                  Advanced deep learning powered detection of <span className="text-primary font-bold">Stuttering Patterns</span>.
                </p>
              </div>

              {/* Action Cards */}
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 w-full max-w-5xl relative z-20 justify-center px-4">
                {/* Record Option */}
                <button
                  onClick={() => setInputMode("record")}
                  className="group relative h-[160px] sm:h-[240px] w-full sm:w-[200px] lg:w-[240px] max-w-[340px] sm:max-w-none rounded-[20px] md:rounded-[24px] border border-white/10 p-1 transition-all duration-500 hover:scale-[1.02] sm:hover:scale-[1.05] hover:rotate-1"
                >
                  {/* Glass Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl rounded-[18px] md:rounded-[22px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[18px] md:rounded-[22px]" />

                  <div className="relative h-full flex flex-col items-center justify-center space-y-3 md:space-y-4 p-3 md:p-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:shadow-[0_0_40px_rgba(0,243,255,0.4)] transition-all duration-500">
                      <Mic className="w-6 h-6 md:w-8 md:h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-primary transition-colors">Record Audio</h3>
                      <p className="text-base md:text-lg font-urdu text-white/60">براہ راست</p>
                    </div>
                  </div>
                </button>

                {/* Upload Option */}
                <button
                  onClick={() => setInputMode("upload")}
                  className="group relative h-[160px] sm:h-[240px] w-full sm:w-[200px] lg:w-[240px] max-w-[340px] sm:max-w-none rounded-[20px] md:rounded-[24px] border border-white/10 p-1 transition-all duration-500 hover:scale-[1.02] sm:hover:scale-[1.05] hover:rotate-1"
                >
                  {/* Glass Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl rounded-[18px] md:rounded-[22px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[18px] md:rounded-[22px]" />

                  <div className="relative h-full flex flex-col items-center justify-center space-y-3 md:space-y-4 p-3 md:p-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 group-hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-500">
                      <Upload className="w-6 h-6 md:w-8 md:h-8 text-secondary group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-secondary transition-colors">Upload File</h3>
                      <p className="text-base md:text-lg font-urdu text-white/60">فائل اپ لوڈ</p>
                    </div>
                  </div>
                </button>

                {/* Demo Option */}
                <button
                  onClick={handleDemoMode}
                  className="group relative h-[160px] sm:h-[240px] w-full sm:w-[200px] lg:w-[240px] max-w-[340px] sm:max-w-none rounded-[20px] md:rounded-[24px] border border-accent/20 p-1 transition-all duration-500 hover:scale-[1.02] sm:hover:scale-[1.05] hover:rotate-1 bg-gradient-to-br from-accent/5 to-transparent"
                >
                  {/* Glass Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl rounded-[18px] md:rounded-[22px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-accent/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[18px] md:rounded-[22px]" />

                  <div className="relative h-full flex flex-col items-center justify-center space-y-3 md:space-y-4 p-3 md:p-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 group-hover:shadow-[0_0_40px_rgba(255,0,153,0.4)] transition-all duration-500">
                      <PlayCircle className="w-6 h-6 md:w-8 md:h-8 text-accent group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-accent transition-colors">Try Demo</h3>
                      <p className="text-base md:text-lg font-urdu text-white/60">نمونہ</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Feature Highlights - Responsive */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-8 w-full max-w-4xl pt-4 px-4">
                {[
                  { icon: Activity, title: "Real-time", desc: "Waveform" },
                  { icon: Brain, title: "Deep Learning", desc: "AI Powered" },
                  { icon: Activity, title: "Urdu Native", desc: "Specialized" }
                ].map((feature, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm">
                    <div className="p-2 rounded-lg bg-black/40">
                      <feature.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recording / Uploading / Demo Interface */}
          {(inputMode && !isAnalyzing && !showResults) && (
            <div className="w-full max-w-4xl animate-fade-in flex flex-col items-center justify-center py-4">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="self-start mb-4 hover:bg-white/5 text-muted-foreground hover:text-white group"
              >
                <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Home
              </Button>

              {inputMode === "demo" ? (
                <div className="w-full mb-4">
                  <div className="p-6 backdrop-blur-2xl bg-card/40 border border-white/10 shadow-xl overflow-hidden relative group rounded-xl">
                    {/* Decorative Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] bg-accent/20 blur-[80px] rounded-full pointer-events-none" />
                    
                    <div className="flex flex-col items-center space-y-6 relative z-10">
                      <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20 animate-pulse-glow">
                        <PlayCircle className="w-10 h-10 text-accent" />
                      </div>
                      
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-white">Real Dataset Demo</h3>
                        <p className="text-lg font-urdu text-accent">حقیقی ڈیٹا سیٹ کے نمونے</p>
                        <p className="text-sm text-muted-foreground max-w-xl">
                          Select from authentic Urdu stuttering samples from our research dataset.
                        </p>
                      </div>

                      {/* Sample Selection Grid - More compact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl">
                        {demoSamples.map((sample) => (
                          <button
                            key={sample.id}
                            onClick={() => handleDemoSelection(sample.id)}
                            disabled={sample.isComingSoon}
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all duration-300 text-left relative",
                              sample.isComingSoon
                                ? "border-gray-500/50 bg-gray-500/10 opacity-60 cursor-not-allowed"
                                : selectedDemo === sample.id
                                ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(255,0,153,0.3)]"
                                : "border-white/20 bg-white/5 hover:border-accent/50 hover:bg-accent/5"
                            )}
                          >
                            {sample.isComingSoon && (
                              <div className="absolute top-2 right-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                                Coming Soon
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                sample.isComingSoon ? "bg-gray-500" :
                                sample.severity === "None" ? "bg-green-500" :
                                sample.severity === "Moderate" ? "bg-yellow-500" : "bg-red-500"
                              )} />
                              <h4 className="font-bold text-white text-sm">{sample.label}</h4>
                              <span className="text-xs text-muted-foreground ml-auto">
                                0:{sample.duration.toString().padStart(2, '0')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{sample.description}</p>
                            <p className="text-xs font-urdu text-accent">{sample.stutterType}</p>
                          </button>
                        ))}
                      </div>

                      {/* Selected Sample Info & Analyze Button - More compact */}
                      {selectedDemo && (
                        <div className="space-y-4 w-full max-w-2xl">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(() => {
                              const sample = demoSamples.find(s => s.id === selectedDemo);
                              return sample ? [
                                <div key="duration" className="p-3 bg-black/20 rounded-lg border border-accent/20">
                                  <div className="text-xs text-muted-foreground">Duration</div>
                                  <div className="text-lg font-bold text-white">
                                    0:{sample.duration.toString().padStart(2, '0')}
                                  </div>
                                </div>,
                                <div key="type" className="p-3 bg-black/20 rounded-lg border border-accent/20">
                                  <div className="text-xs text-muted-foreground">Type</div>
                                  <div className="text-lg font-bold text-white">{sample.stutterType}</div>
                                </div>,
                                <div key="severity" className="p-3 bg-black/20 rounded-lg border border-accent/20">
                                  <div className="text-xs text-muted-foreground">Severity</div>
                                  <div className={cn(
                                    "text-lg font-bold",
                                    sample.isComingSoon ? "text-orange-400" : "text-white"
                                  )}>
                                    {sample.severity}
                                  </div>
                                </div>
                              ] : null;
                            })()}
                          </div>

                          {/* Demo Analyze Button - Prominently placed */}
                          <div className="flex justify-center pt-2">
                            <Button
                              size="lg"
                              onClick={() => handleAnalysisComplete(null)}
                              disabled={isAnalyzing || (demoSamples.find(s => s.id === selectedDemo)?.isComingSoon)}
                              className="px-8 py-4 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground font-semibold shadow-xl transition-all duration-300 disabled:opacity-50 text-base rounded-xl"
                            >
                              {isAnalyzing ? (
                                <div className="flex items-center justify-center gap-3">
                                  <Activity className="w-5 h-5 animate-spin" />
                                  <span>Analyzing Demo Sample...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-3">
                                  <Brain className="w-5 h-5" />
                                  <span>Analyze Demo Sample • نمونہ تجزیہ</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full mb-12 transform hover:scale-[1.01] transition-transform duration-500">
                  {inputMode === "record" ? (
                    <AudioRecorder 
                      onAudioReady={setAudioData} 
                      onAnalysisComplete={handleAnalysisComplete}
                    />
                  ) : (
                    <FileUpload 
                      onFileReady={setAudioData}
                      onAnalysisComplete={handleAnalysisComplete}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analysis Simulation */}
          {isAnalyzing && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in text-center p-4 sm:p-6 overflow-y-auto">
              <div className="w-full max-w-lg space-y-12 relative">
                {/* Glowing Orbs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full animate-pulse -z-10" />

                <h2 className="text-4xl font-bold text-white mb-8 animate-pulse">Analyzing Audio...</h2>

                <div className="space-y-6">
                  {processingSteps.map((step, index) => {
                    const isActive = index === processingStep;
                    const isCompleted = index < processingStep;
                    // const isPending = index > processingStep;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center space-x-6 transition-all duration-500 rounded-2xl p-6 border",
                          isActive ? "border-primary bg-primary/10 translate-x-4 shadow-[0_0_30px_rgba(0,243,255,0.2)]" : "border-white/5 bg-white/5 opacity-40",
                          isCompleted ? "border-primary/50 text-white opacity-80" : ""
                        )}
                      >
                        <div className={cn(
                          "p-3 rounded-full transition-all duration-300",
                          isActive ? "bg-primary text-black scale-110" : "bg-black/40 text-muted-foreground",
                          isCompleted ? "bg-primary/80 text-black" : ""
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className={cn("w-6 h-6", isActive && "animate-spin-slow")} />}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className={cn(
                            "font-bold text-xl",
                            isActive ? "text-white" : "text-muted-foreground",
                            isCompleted ? "text-primary-foreground" : "" // Note: text-primary-foreground might count as dark on dark, changed to white for safety
                            , isCompleted && "text-white"
                          )}>{step.label}</span>
                          <span className="text-lg font-urdu text-white/50">{step.urdu}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Results View */}
          {showResults && (
            <div className="w-full max-w-7xl animate-fade-in py-8">
              <div className="flex justify-between items-center mb-10 px-4 pt-4">
                <Button variant="outline" onClick={handleReset} className="border-white/10 hover:bg-white/10 backdrop-blur-md">
                  ← Start New Analysis
                </Button>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs text-muted-foreground font-mono">LIVE SESSION</p>
                </div>
              </div>
              <AnalysisResults 
                audioUrl={audioData || ""} 
                duration={recordingTime || 45} 
                selectedDemo={inputMode === 'demo' ? selectedDemo : null}
                analysisData={analysisResults}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
