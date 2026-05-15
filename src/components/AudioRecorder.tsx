import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, RefreshCw, AlertCircle, Headphones, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { analyzeAudio } from "@/lib/inference";
import { validateAudioDuration, AudioAnalysisResult } from "@/lib/gemini";
import { APP_CONFIG } from "@/config/constants";

interface AudioRecorderProps {
  onAudioReady: (audioData: string) => void;
  onAnalysisComplete?: (analysis: AudioAnalysisResult | { isProcessing?: boolean } | null) => void;
}

const AudioRecorder = ({ onAudioReady, onAnalysisComplete }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(40).fill(0));
  const [isSupported, setIsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check browser compatibility
    const checkSupport = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        toast.error("Browser Not Supported", {
          description: "Your browser doesn't support audio recording. Please try Chrome, Firefox, or Safari."
        });
        return;
      }

      // Check for HTTPS requirement
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        toast.warning("HTTPS Required", {
          description: "Audio recording requires a secure connection. Please use HTTPS."
        });
      }

      // Check microphone permission
      try {
        const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionStatus(permissions.state);
        
        permissions.onchange = () => {
          setPermissionStatus(permissions.state);
        };
      } catch (error) {
        console.log("Permission API not supported");
      }
    };

    checkSupport();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const visualizeAudio = () => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    // Compress 1024 bins into 40 bars with smoother distribution
    const bars = 40;
    const step = Math.floor(dataArray.length / bars);
    const newLevels = [];

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      const startIndex = i * step;
      const endIndex = Math.min(startIndex + step, dataArray.length);
      
      // Average the values in this range for smoother visualization
      for (let j = startIndex; j < endIndex; j++) {
        sum += dataArray[j];
      }
      
      const average = sum / (endIndex - startIndex);
      newLevels.push(Math.min(average / 255, 1)); // Normalize to 0-1
    }

    setAudioLevel(newLevels);
    animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  };

  const startRecording = async () => {
    if (!isSupported) {
      toast.error("Recording Not Supported", {
        description: "Your browser doesn't support audio recording. Please use a modern browser."
      });
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Browser Not Supported", {
        description: "Your browser does not support audio recording. Please try Chrome or Firefox."
      });
      return;
    }

    try {
      // Enhanced media constraints for better audio quality
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 1,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Check if MediaRecorder supports the format
      const options = [];
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.push({ mimeType: 'audio/webm;codecs=opus' });
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.push({ mimeType: 'audio/mp4' });
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.push({ mimeType: 'audio/wav' });
      }

      const mediaRecorder = new MediaRecorder(stream, options[0] || {});
      mediaRecorderRef.current = mediaRecorder;

      // Setup Audio Context for visualization with better error handling
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = APP_CONFIG.AUDIO.FFT_SIZE; // Reduced for better performance
        analyzer.smoothingTimeConstant = APP_CONFIG.AUDIO.ANALYZER_SMOOTHING;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyzer);
        analyzerRef.current = analyzer;

        // Start visualization
        visualizeAudio();
      } catch (audioContextError) {
        console.warn("Audio visualization unavailable:", audioContextError);
        // Continue without visualization
      }

      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { 
          type: options[0]?.mimeType || 'audio/wav' 
        });
        
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setRecordedBlob(audioBlob);
        onAudioReady(url);

        // Clean up
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(new Array(40).fill(0.1));
        
        toast.success("Recording Complete", {
          description: "Audio captured successfully! Click 'Analyze Audio' for AI analysis."
        });
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toast.error("Recording Error", {
          description: "An error occurred during recording. Please try again."
        });
        setIsRecording(false);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      setPermissionStatus('granted');

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at MAX_RECORDING_DURATION seconds
          if (newTime >= APP_CONFIG.AUDIO.MAX_RECORDING_DURATION) {
            stopRecording();
            toast.info("Recording Auto-Stopped", {
              description: `Maximum recording duration reached (${APP_CONFIG.AUDIO.MAX_RECORDING_DURATION} seconds)`
            });
          }
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      
      let errorTitle = "Recording Failed";
      let errorMessage = "Could not access microphone.";

      const err = error as Error;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionStatus('denied');
        errorTitle = "Microphone Access Denied";
        errorMessage = "Please allow microphone access in your browser settings and refresh the page.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorTitle = "Microphone Not Found";
        errorMessage = "No microphone found on this device. Please connect a microphone and try again.";
      } else if (err.name === "NotReadableError") {
        errorTitle = "Microphone Busy";
        errorMessage = "The microphone is already in use by another application. Please close other apps and try again.";
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        errorTitle = "Secure Connection Required";
        errorMessage = "Microphone access requires HTTPS. Please ensure you are using a secure connection.";
      }

      toast.error(errorTitle, { description: errorMessage });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAnalyze = async () => {
    if (!recordedBlob) {
      toast.error("No Audio to Analyze", {
        description: "Please record an audio sample first."
      });
      return;
    }

    console.log('%c🎤 STARTING AUDIO ANALYSIS', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    console.log('Audio blob:', recordedBlob);

    // Validate duration before analysis
    const isDurationValid = await validateAudioDuration(recordedBlob);
    if (!isDurationValid) {
      toast.error("Audio Too Long", {
        description: `Please record audio under ${APP_CONFIG.AUDIO.MAX_ANALYSIS_DURATION_SEC} seconds, or use a smaller file.`,
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Call onAnalysisComplete immediately to show processing page
    if (onAnalysisComplete) {
      console.log('%c📤 TRIGGERING PROCESSING PAGE', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      onAnalysisComplete({ isProcessing: true }); // Signal processing has started
    }

    try {
      console.log('%c🤖 CALLING GEMINI API', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');
      const analysis = await analyzeAudio(recordedBlob as Blob);
      
      console.log('%c📊 ANALYSIS RESULT', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', analysis);
      
      // Pass the actual analysis data back to parent
      if (onAnalysisComplete) {
        console.log('%c✅ PASSING REAL ANALYSIS DATA', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
        onAnalysisComplete(analysis);
      }
      
      toast.success("Analysis Complete", {
        description: analysis.error ? "Analysis failed - check console for details" : "Your speech analysis is ready!"
      });
    } catch (error) {
      console.error('%c❌ ANALYSIS ERROR', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
      toast.error("Analysis Failed", {
        description: "Could not analyze audio. Please try again or check your API key."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-8 backdrop-blur-2xl bg-card/40 border border-white/10 shadow-xl overflow-hidden relative group">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex flex-col items-center space-y-8 relative z-10">
        {/* Advanced Waveform Visualization */}
        <div className="w-full h-40 bg-black/40 backdrop-blur-sm rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/5 shadow-inner">
          <div className="flex items-center justify-center space-x-1 w-full px-8 h-full">
            {audioLevel.map((level, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 rounded-full transition-all duration-75",
                  isRecording ? "bg-primary shadow-[0_0_10px_0_rgba(0,243,255,0.5)]" : "bg-muted-foreground/30"
                )}
                style={{
                  height: `${Math.max(10, level * 100)}%`,
                  opacity: isRecording ? 1 : 0.5,
                }}
              />
            ))}
          </div>

          {!isRecording && !audioURL && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground font-urdu bg-black/50 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
                آڈیو ریکارڈ کرنے کے لیے مائیک دبائیں
              </p>
            </div>
          )}
        </div>

        {/* Recording Controls - Simplified */}
        <div className="flex flex-col items-center gap-8">
          {/* Record/Stop Button */}
          {!isRecording && !audioURL && (
            <Button
              size="lg"
              onClick={startRecording}
              className="rounded-full w-24 h-24 shadow-glow hover:scale-105 transition-all duration-300 bg-primary/10 border-2 border-primary hover:bg-primary/20 text-primary"
            >
              <Mic className="w-10 h-10" />
            </Button>
          )}

          {isRecording && (
            <Button
              size="lg"
              onClick={stopRecording}
              className="rounded-full w-24 h-24 animate-pulse-glow bg-destructive/10 border-2 border-destructive hover:bg-destructive/20 text-destructive shadow-[0_0_30px_0_rgba(255,0,0,0.3)]"
            >
              <Square className="w-10 h-10 fill-current" />
            </Button>
          )}

          {/* Single Analyze Speech Button - Full width, prominent */}
          {audioURL && !isRecording && (
            <div className="w-full max-w-md">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full rounded-2xl px-8 py-6 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground font-semibold shadow-xl transition-all duration-300 disabled:opacity-50 text-lg"
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span>Processing Analysis...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Brain className="w-6 h-6" />
                    <span>Analyze Speech • تجزیہ کریں</span>
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Timer/Status */}
        <div className="text-center space-y-3">
          {isRecording && (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                <div className="w-2.5 h-2.5 bg-destructive rounded-full animate-recording-pulse shadow-[0_0_10px_0_rgba(255,0,0,0.8)]" />
                <span className="text-sm font-semibold text-destructive tracking-widest uppercase">Recording</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Max: 20 seconds • AI Analysis Available
              </div>
            </div>
          )}

          <div className={cn(
            "font-mono text-4xl font-bold tracking-wider drop-shadow-lg transition-colors",
            isRecording && recordingTime >= 18 ? "text-destructive animate-pulse" : "text-white"
          )}>
            {formatTime(recordingTime)}
            {recordingTime > 0 && <span className="text-muted-foreground text-2xl">/00:20</span>}
          </div>

          {audioURL && !isRecording && (
            <div className="space-y-1">
              {isAnalyzing ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-accent/20 border border-accent/30 backdrop-blur-sm">
                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                    <span className="text-accent font-medium">AI Analysis in Progress...</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Analyzing your speech...
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Recording captured successfully
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Ready for AI analysis
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {audioURL && (
          <audio
            ref={audioRef}
            src={audioURL}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Browser Compatibility & Status */}
        <div className="w-full pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {isSupported ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Browser Compatible</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-warning" />
                  <span>Browser Compatibility Issue</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Headphones className="w-3 h-3" />
                <span>Best with headphones</span>
              </div>
              {permissionStatus !== 'unknown' && (
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    permissionStatus === 'granted' ? 'bg-green-500' : 
                    permissionStatus === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
                  )} />
                  <span className="capitalize">{permissionStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AudioRecorder;
