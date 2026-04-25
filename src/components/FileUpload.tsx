import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Upload, File, X, Brain, RefreshCw, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { analyzeAudio, getInferenceMode } from "@/lib/inference";
import { AudioAnalysisResult } from "@/lib/gemini";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileReady: (fileData: string) => void;
  onAnalysisComplete?: (analysis: AudioAnalysisResult | { isProcessing?: boolean } | null) => void;
}

const ACCEPTED_TYPES = ["audio/wav", "audio/wave", "audio/mp3", "audio/mpeg", "audio/ogg",
  "audio/flac", "audio/x-flac", "audio/m4a", "audio/mp4", "audio/webm", "audio/aac"];
const ACCEPTED_EXTS = [".wav", ".mp3", ".ogg", ".flac", ".m4a", ".webm", ".aac"];

function isAudioFile(file: File) {
  return ACCEPTED_TYPES.includes(file.type) ||
    file.type.startsWith("audio/") ||
    ACCEPTED_EXTS.some(ext => file.name.toLowerCase().endsWith(ext));
}

const FileUpload = ({ onFileReady, onAnalysisComplete }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mode = getInferenceMode();
  const modeLabel = "FluentNet";

  const handleFile = useCallback((file: File) => {
    if (!isAudioFile(file)) {
      toast.error("Invalid File", {
        description: `Please upload an audio file (${ACCEPTED_EXTS.join(", ")})`,
      });
      return;
    }

    // Revoke previous object URL to avoid memory leak
    if (objectUrl) URL.revokeObjectURL(objectUrl);

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setFileBlob(file);
    setObjectUrl(url);
    setIsPlaying(false);
    onFileReady(url);

    toast.success("File Ready", {
      description: `${file.name} — click Analyze to run ${modeLabel}`,
    });
  }, [objectUrl, onFileReady, modeLabel]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input value so same file can be re-selected
    e.target.value = "";
  }, [handleFile]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const analyzeFile = async () => {
    if (!fileBlob) {
      toast.error("No File Selected", { description: "Please upload an audio file first." });
      return;
    }

    setIsAnalyzing(true);

    // Signal parent to start processing overlay while analysis runs
    if (onAnalysisComplete) {
      onAnalysisComplete({ isProcessing: true });
    }

    try {
      const analysis = await analyzeAudio(fileBlob);

      if (onAnalysisComplete) {
        onAnalysisComplete(analysis);
      }

      toast.success("Analysis Complete", {
        description: analysis.error ? "Check results for details." : "Speech analysis is ready!",
      });
    } catch (error) {
      console.error("[FileUpload] Analysis error:", error);
      toast.error("Analysis Failed", {
        description: "Could not analyze audio. Is the inference server running?",
      });
      // Reset so parent doesn't stay stuck on processing overlay
      if (onAnalysisComplete) onAnalysisComplete(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemove = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setSelectedFile(null);
    setFileBlob(null);
    setObjectUrl("");
    setIsPlaying(false);
    onFileReady("");
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <Card className="p-8 backdrop-blur-xl bg-card/70 border border-border/50 shadow-lg">
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer",
            isDragging
              ? "border-secondary bg-secondary/10 scale-105"
              : "border-border hover:border-secondary/50 hover:bg-secondary/5"
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div className="flex flex-col items-center space-y-4 pointer-events-none">
            <div className={cn(
              "p-6 rounded-full transition-all duration-300",
              isDragging ? "bg-secondary/20" : "bg-secondary/10"
            )}>
              <Upload className={cn(
                "w-12 h-12 transition-colors",
                isDragging ? "text-secondary" : "text-muted-foreground"
              )} />
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-foreground mb-1">
                Drop your audio file here
              </p>
              <p className="text-sm text-muted-foreground font-urdu mb-4">
                یا کلک کریں اور فائل منتخب کریں
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/40 text-secondary text-sm font-medium">
                <Upload className="w-4 h-4" />
                Browse Files
              </span>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {ACCEPTED_EXTS.join(" · ")}
            </p>
          </div>

          <input
            id="file-input"
            type="file"
            accept={ACCEPTED_EXTS.join(",") + ",audio/*"}
            onChange={handleFileInput}
            className="hidden"
            onClick={e => e.stopPropagation()}
          />
        </div>
      ) : (
        <div className="animate-scale-in space-y-5">
          {/* File Info Row */}
          <div className="flex items-center justify-between p-5 bg-secondary/10 rounded-xl border-2 border-secondary/40">
            <div className="flex items-center space-x-4 min-w-0">
              <div className="p-3 bg-secondary/20 rounded-lg shrink-0">
                <File className="w-6 h-6 text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatSize(selectedFile.size)} · {selectedFile.type || "audio"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Audio Preview */}
          {objectUrl && (
            <div className="flex items-center gap-4 p-4 bg-black/20 rounded-xl border border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full border border-secondary/40 hover:bg-secondary/20 shrink-0"
              >
                {isPlaying
                  ? <Pause className="w-4 h-4 text-secondary" />
                  : <Play className="w-4 h-4 text-secondary" />}
              </Button>
              <audio
                ref={audioRef}
                src={objectUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-8"
                controls
                style={{ filter: "invert(0.8) sepia(1) saturate(3) hue-rotate(200deg)", height: "32px" }}
              />
            </div>
          )}

          {/* Analyze Button */}
          <div className="flex justify-center pt-1">
            <Button
              onClick={analyzeFile}
              disabled={isAnalyzing}
              size="lg"
              className={cn(
                "rounded-full px-10 py-6 text-base font-semibold shadow-lg transition-all duration-300",
                "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-105",
                "disabled:opacity-50 disabled:hover:scale-100"
              )}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 mr-2" />
                  Analyze Audio
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default FileUpload;
