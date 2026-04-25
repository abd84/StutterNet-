import Navigation from "@/components/Navigation";
import DatasetTable from "@/components/DatasetTable";
import DatasetStats from "@/components/DatasetStats";
import { Badge } from "@/components/ui/badge";
import { Database, BookOpen, Mic2 } from "lucide-react";

const Dataset = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none opacity-40 z-0" />
      <Navigation />

      <main className="relative container mx-auto px-4 sm:px-6 py-8 sm:py-12 z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
            <Database className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-white/80">Research Dataset</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-2">Urdu Stuttering Corpus</h1>
          <p className="text-xl sm:text-2xl font-urdu text-primary mb-3">اردو لکنت کا ڈیٹا سیٹ</p>
          <p className="text-muted-foreground max-w-3xl">
            The first annotated Urdu stuttering speech dataset — 543 samples across 3 stutter categories,
            combining ElevenLabs TTS synthetic speech with real human recordings.
          </p>
        </div>

        {/* Annotation Key */}
        <div className="mb-8 p-4 sm:p-6 rounded-2xl bg-card/40 border border-white/10 backdrop-blur-xl animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold text-foreground">Annotation Key</h2>
            <span className="font-urdu text-sm text-muted-foreground ml-2">تشریح کلید</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/20 text-primary border-primary/50 font-mono text-xs">[حرف]...[/حرف]</Badge>
              </div>
              <div className="text-sm font-bold text-foreground">Syllable Repetition</div>
              <div className="text-xs font-urdu text-muted-foreground">حرف کی تکرار</div>
              <div className="text-xs text-muted-foreground mt-1">Involuntary phoneme/syllable-level repetition. Example: م... م... مجھے</div>
            </div>
            <div className="p-3 bg-secondary/10 rounded-xl border border-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-secondary/20 text-secondary border-secondary/50 font-mono text-xs">[بلاک]—[/بلاک]</Badge>
              </div>
              <div className="text-sm font-bold text-foreground">Block / Pause</div>
              <div className="text-xs font-urdu text-muted-foreground">رکاوٹ / وقفہ</div>
              <div className="text-xs text-muted-foreground mt-1">Complete articulatory arrest — silent block mid-word or mid-sentence with visible struggle</div>
            </div>
            <div className="p-3 bg-accent/10 rounded-xl border border-accent/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-accent/20 text-accent border-accent/50 font-mono text-xs">[لفظ]...[/لفظ]</Badge>
              </div>
              <div className="text-sm font-bold text-foreground">Word Repetition</div>
              <div className="text-xs font-urdu text-muted-foreground">لفظ کی تکرار</div>
              <div className="text-xs text-muted-foreground mt-1">Whole word repeated involuntarily 2+ times. Example: وہاں وہاں وہاں</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Follows <strong className="text-foreground">ASHA (American Speech-Language-Hearing Association)</strong> disfluency marking conventions, adapted for Urdu script.
            </p>
          </div>
        </div>

        <DatasetStats />

        <div className="mt-8 animate-fade-in">
          <DatasetTable />
        </div>
      </main>
    </div>
  );
};

export default Dataset;
