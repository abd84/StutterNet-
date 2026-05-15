import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DEMO_DATASET } from "@/config/constants";

type Sample = typeof DEMO_DATASET[0];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Mild": return "bg-green-500/20 text-green-400 border-green-500/50";
    case "Moderate": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "Severe": return "bg-red-500/20 text-red-400 border-red-500/50";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
};

const getTypeColor = (type: string) => {
  if (type.includes("Sy")) return "bg-primary/20 text-primary border-primary/50";
  if (type.includes("-p")) return "bg-secondary/20 text-secondary border-secondary/50";
  if (type.includes("-w")) return "bg-accent/20 text-accent border-accent/50";
  return "bg-white/10 text-white border-white/20";
};

const TAG_COLORS: Record<string, string> = {
  "حرف": "bg-primary/20 text-primary border-b-2 border-primary rounded px-1 mx-0.5",
  "بلاک": "bg-secondary/20 text-secondary border-b-2 border-secondary rounded px-1 mx-0.5",
  "لفظ": "bg-accent/20 text-accent border-b-2 border-accent rounded px-1 mx-0.5",
};

const AnnotatedTranscript = ({ sample }: { sample: Sample }) => {
  if (!sample.annotatedTranscript) return null;

  const text = sample.annotatedTranscript;
  const tagPattern = /\[(حرف|بلاک|لفظ)\]([\s\S]*?)\[\/(?:حرف|بلاک|لفظ)\]/g;
  const parts: Array<{ text: string; tag: string | null }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tagPattern)) {
    if (match.index! > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), tag: null });
    }
    parts.push({ text: match[2], tag: match[1] });
    lastIndex = match.index! + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), tag: null });
  }

  return (
    <div className="p-4 bg-black/30 rounded-xl border border-white/10" dir="rtl">
      <p className="font-urdu text-base text-foreground" style={{ lineHeight: "2.8" }}>
        {parts.map((part, i) =>
          part.tag ? (
            <span key={i} className={cn("inline-block", TAG_COLORS[part.tag])}>
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10 justify-end" dir="ltr">
        <span className="text-xs text-muted-foreground self-center">Legend:</span>
        {[
          { tag: "حرف", label: "Syllable Rep", cls: "bg-primary/20 text-primary border-primary/50" },
          { tag: "بلاک", label: "Block", cls: "bg-secondary/20 text-secondary border-secondary/50" },
          { tag: "لفظ", label: "Word Rep", cls: "bg-accent/20 text-accent border-accent/50" },
        ].filter(t => sample.stutterMarkers?.some(m =>
          (m.type === "syllable" && t.tag === "حرف") ||
          (m.type === "block" && t.tag === "بلاک") ||
          (m.type === "word_repetition" && t.tag === "لفظ")
        )).map(t => (
          <Badge key={t.tag} variant="outline" className={`text-xs font-urdu ${t.cls}`}>
            [{t.tag}] {t.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};

const SampleCard = ({ sample }: { sample: Sample }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.src = `/demo-samples/${sample.filename}`;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error("Audio unavailable", { description: `Could not load ${sample.filename}` }));
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  return (
    <Card className={cn(
      "border backdrop-blur-xl transition-all duration-300",
      sample.isComingSoon
        ? "border-white/10 bg-card/20 opacity-70"
        : "border-white/10 bg-card/40 hover:border-white/20"
    )}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-foreground">{sample.label}</h3>
              {sample.isComingSoon && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Coming Soon</Badge>
              )}
            </div>
            <p className="text-sm font-urdu text-primary">{sample.labelUrdu}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-1.5 flex-shrink-0">
            <Badge variant="outline" className={getTypeColor(sample.stutterType)}>{sample.stutterType}</Badge>
            <Badge variant="outline" className={getSeverityColor(sample.severity)}>{sample.severity}</Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{sample.description}</p>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2 bg-black/20 rounded-lg text-center border border-white/5">
            <div className="text-sm font-mono font-bold text-foreground">
              0:{sample.duration.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] text-muted-foreground">Duration</div>
          </div>
          <div className="p-2 bg-black/20 rounded-lg text-center border border-white/5">
            <div className="text-sm font-bold text-foreground">{sample.stutterCount || '—'}</div>
            <div className="text-[10px] text-muted-foreground">Stutters</div>
          </div>
          <div className="p-2 bg-black/20 rounded-lg text-center border border-white/5">
            <div className="text-sm font-bold text-foreground">{sample.totalWords || '—'}</div>
            <div className="text-[10px] text-muted-foreground">Words</div>
          </div>
        </div>

        {/* Mini Waveform */}
        {!sample.isComingSoon && (
          <div className="w-full h-10 bg-black/40 rounded-lg flex items-end gap-[2px] px-2 mb-4 overflow-hidden border border-white/5">
            {[...Array(60)].map((_, i) => {
              const isStutterZone = sample.stutterMarkers?.some(m => {
                const pos = (m.start / (sample.totalWords || 10)) * 60;
                return Math.abs(i - pos) < 4;
              });
              const baseH = 15 + Math.sin(i * 0.35) * 10 + (i % 7) * 2.5;
              return (
                <div
                  key={i}
                  className={cn("flex-1 rounded-sm transition-colors", isStutterZone ? "bg-accent" : "bg-primary/50")}
                  style={{ height: `${Math.max(8, Math.min(baseH, 85))}%` }}
                />
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!sample.isComingSoon && !sample.skipAudio && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePlay}
              className="border-primary/50 text-primary hover:bg-primary/20"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
              {isPlaying ? "Stop" : "Listen"}
            </Button>
          )}
          {!sample.isComingSoon && sample.annotatedTranscript && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(e => !e)}
              className="text-muted-foreground hover:text-white flex-1 justify-between min-w-0"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Volume2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{isExpanded ? "Hide" : "View"} Annotated Transcript</span>
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
            </Button>
          )}
        </div>

        {/* Expanded Annotation Panel */}
        {isExpanded && !sample.isComingSoon && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <div className="text-xs text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">ASHA Standard Annotation</span>
            </div>
            <AnnotatedTranscript sample={sample} />
            {sample.totalWords > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs text-center">
                <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                  <div className="font-bold text-primary">
                    {((sample.disfluencyCount / sample.totalWords) * 100).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground">Stutter Rate</div>
                </div>
                <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                  <div className="font-bold text-foreground">{sample.annotationStyle}</div>
                  <div className="text-muted-foreground">Standard</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <audio ref={audioRef} style={{ display: 'none' }} />
    </Card>
  );
};

const DatasetTable = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-2">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Sample Browser</h2>
        <p className="text-sm text-muted-foreground font-urdu">نمونہ براؤزر</p>
      </div>
      <Badge variant="outline" className="border-primary/50 text-primary text-xs">
        {DEMO_DATASET.filter(s => !s.isComingSoon).length} samples available
      </Badge>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {DEMO_DATASET.map(sample => (
        <SampleCard key={sample.id} sample={sample} />
      ))}
    </div>
  </div>
);

export default DatasetTable;
