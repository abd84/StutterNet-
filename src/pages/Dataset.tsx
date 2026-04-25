import { useState } from "react";
import Navigation from "@/components/Navigation";
import DatasetTable from "@/components/DatasetTable";
import DatasetStats from "@/components/DatasetStats";
import { Badge } from "@/components/ui/badge";
import { Database, BookOpen, Mic2, FileText, ChevronRight } from "lucide-react";

// --- Hardcoded representative samples from annotations.json ---
const ANNOTATION_SAMPLES = [
  {
    id: "HARF_001",
    label: 1,
    label_name: "syllable_repetition",
    category_urdu: "حرف",
    scenario: "Job Interview",
    voice_used: "Abdullah",
    duration_seconds: 7.9,
    stutter_unit: "ک",
    tts_text:
      "میں نے پچھلے پانچ سال مارکیٹنگ میں... ک... ک... کام کیا ہے اور مجھے اس فیلڈ میں کافی تجربہ ہے",
    annotated:
      "میں نے پچھلے پانچ سال مارکیٹنگ میں [حرف] ک... ک... [/حرف] کام کیا ہے اور مجھے اس فیلڈ میں کافی تجربہ ہے",
  },
  {
    id: "HARF_002",
    label: 1,
    label_name: "syllable_repetition",
    category_urdu: "حرف",
    scenario: "Office Presentation",
    voice_used: "Abdullah",
    duration_seconds: 8.2,
    stutter_unit: "ت",
    tts_text:
      "اس پروجیکٹ کی ڈیڈ لائن اگلے ہفتے ہے اور ہمیں... ت... ت... تیاری مکمل کرنی ہوگی جلد از جلد",
    annotated:
      "اس پروجیکٹ کی ڈیڈ لائن اگلے ہفتے ہے اور ہمیں [حرف] ت... ت... [/حرف] تیاری مکمل کرنی ہوگی جلد از جلد",
  },
  {
    id: "HARF_003",
    label: 1,
    label_name: "syllable_repetition",
    category_urdu: "حرف",
    scenario: "Phone Call to Family",
    voice_used: "Abdullah",
    duration_seconds: 5.9,
    stutter_unit: "م",
    tts_text:
      "امی مجھے آج رات کو تھوڑی دیر ہو جائے گی کیونکہ... م... م... میٹنگ ابھی ختم نہیں ہوئی",
    annotated:
      "امی مجھے آج رات کو تھوڑی دیر ہو جائے گی کیونکہ [حرف] م... م... [/حرف] میٹنگ ابھی ختم نہیں ہوئی",
  },
  {
    id: "LAFZ_001",
    label: 2,
    label_name: "word_repetition",
    category_urdu: "لفظ",
    scenario: "Ordering Food",
    voice_used: "Abdullah",
    duration_seconds: 7.2,
    stutter_unit: "رائتہ",
    tts_text:
      "مجھے ایک پلیٹ بریانی دے دیں اور ساتھ میں... رائتہ... رائتہ... بھی لگا دیں پلیز",
    annotated:
      "مجھے ایک پلیٹ بریانی دے دیں اور ساتھ میں [لفظ] رائتہ... رائتہ... [/لفظ] بھی لگا دیں پلیز",
  },
  {
    id: "LAFZ_002",
    label: 2,
    label_name: "word_repetition",
    category_urdu: "لفظ",
    scenario: "Talking to Teacher",
    voice_used: "Abdullah",
    duration_seconds: 7.5,
    stutter_unit: "مجھے",
    tts_text:
      "سر میں نے اسائنمنٹ مکمل کر لی ہے لیکن... مجھے... مجھے... ایک سوال پوچھنا تھا اس کے بارے میں",
    annotated:
      "سر میں نے اسائنمنٹ مکمل کر لی ہے لیکن [لفظ] مجھے... مجھے... [/لفظ] ایک سوال پوچھنا تھا اس کے بارے میں",
  },
  {
    id: "LAFZ_003",
    label: 2,
    label_name: "word_repetition",
    category_urdu: "لفظ",
    scenario: "Shopping",
    voice_used: "Abdullah",
    duration_seconds: 8.1,
    stutter_unit: "رنگ",
    tts_text:
      "یہ شرٹ کتنے کی ہے اور کیا اس میں... رنگ... رنگ... نیلا بھی ملتا ہے یا صرف یہی ہے",
    annotated:
      "یہ شرٹ کتنے کی ہے اور کیا اس میں [لفظ] رنگ... رنگ... [/لفظ] نیلا بھی ملتا ہے یا صرف یہی ہے",
  },
  {
    id: "BLOCK_001",
    label: 3,
    label_name: "block",
    category_urdu: "بلاک",
    scenario: "Doctor Visit",
    voice_used: "Abdullah",
    duration_seconds: 5.8,
    stutter_unit: null,
    tts_text:
      "ڈاکٹر صاحب مجھے کل رات سے بخار ہے اور سر میں بہت... درد ہو رہا... مجھے دوائی لکھ دیں",
    annotated:
      "ڈاکٹر صاحب مجھے کل رات سے بخار ہے اور سر میں بہت [بلاک] [/بلاک] درد ہو رہا... مجھے دوائی لکھ دیں",
  },
  {
    id: "BLOCK_002",
    label: 3,
    label_name: "block",
    category_urdu: "بلاک",
    scenario: "Apologising to Friend",
    voice_used: "Abdullah",
    duration_seconds: 7.4,
    stutter_unit: null,
    tts_text:
      "یار مجھے معلوم ہے میں نے غلطی کی اور میں تم سے... معافی مانگنا... چاہتا ہوں دل سے سچ میں",
    annotated:
      "یار مجھے معلوم ہے میں نے غلطی کی اور میں تم سے [بلاک] [/بلاک] معافی مانگنا... چاہتا ہوں دل سے سچ میں",
  },
  {
    id: "BLOCK_003",
    label: 3,
    label_name: "block",
    category_urdu: "بلاک",
    scenario: "Asking for Help",
    voice_used: "Abdullah",
    duration_seconds: 6.3,
    stutter_unit: null,
    tts_text:
      "معاف کریں کیا آپ مجھے بتا سکتے ہیں کہ یہاں... قریب... کوئی دکان ہے جہاں میں پانی لے سکوں",
    annotated:
      "معاف کریں کیا آپ مجھے بتا سکتے ہیں کہ یہاں [بلاک] [/بلاک] قریب... کوئی دکان ہے جہاں میں پانی لے سکوں",
  },
];

const TYPE_TABS = [
  { key: "all",                label: "All Types",          urdu: "سب",   color: "text-foreground border-white/30 bg-white/5" },
  { key: "syllable_repetition", label: "Syllable Repetition", urdu: "حرف",  color: "text-primary border-primary/40 bg-primary/10" },
  { key: "word_repetition",    label: "Word Repetition",    urdu: "لفظ",  color: "text-accent border-accent/40 bg-accent/10" },
  { key: "block",              label: "Block / Pause",      urdu: "بلاک", color: "text-secondary border-secondary/40 bg-secondary/10" },
];

const LABEL_STYLES: Record<string, { badge: string; highlight: string; border: string }> = {
  syllable_repetition: {
    badge: "bg-primary/20 text-primary border-primary/40",
    highlight: "bg-primary/20 text-primary border border-primary/50 rounded px-1",
    border: "border-primary/30",
  },
  word_repetition: {
    badge: "bg-accent/20 text-accent border-accent/40",
    highlight: "bg-accent/20 text-accent border border-accent/50 rounded px-1",
    border: "border-accent/30",
  },
  block: {
    badge: "bg-secondary/20 text-secondary border-secondary/40",
    highlight: "bg-secondary/20 text-secondary border border-secondary/50 rounded px-1",
    border: "border-secondary/30",
  },
};

// Parse annotated string into segments, highlight the stutter span
function renderAnnotated(annotated: string, label_name: string) {
  const style = LABEL_STYLES[label_name] ?? LABEL_STYLES.syllable_repetition;
  // Split on bracket tags [TAG]...[/TAG]
  const tagPattern = /\[([^\]]+)\]([\s\S]*?)\[\/[^\]]+\]/g;
  const matches = [...annotated.matchAll(tagPattern)];

  if (matches.length === 0) {
    return <span className="font-urdu">{annotated}</span>;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const m of matches) {
    const start = m.index ?? 0;
    const end = start + m[0].length;

    // Text before this match
    if (start > cursor) {
      nodes.push(
        <span key={`pre-${start}`} className="font-urdu">
          {annotated.slice(cursor, start)}
        </span>
      );
    }

    const inner = m[2].trim();
    nodes.push(
      <span
        key={`tag-${start}`}
        className={`font-urdu font-bold mx-1 py-0.5 ${style.highlight}`}
      >
        {inner || "[ silent block ]"}
      </span>
    );

    cursor = end;
  }

  // Trailing text
  if (cursor < annotated.length) {
    nodes.push(
      <span key="tail" className="font-urdu">
        {annotated.slice(cursor)}
      </span>
    );
  }

  return nodes;
}

const Dataset = () => {
  const [activeTab, setActiveTab] = useState("all");

  const visible =
    activeTab === "all"
      ? ANNOTATION_SAMPLES
      : ANNOTATION_SAMPLES.filter((s) => s.label_name === activeTab);

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

        {/* Annotation Viewer */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Annotation Samples</h2>
            <span className="font-urdu text-sm text-muted-foreground ml-2">تشریح کے نمونے</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
            Real entries from{" "}
            <code className="text-primary bg-primary/10 px-1 rounded">annotations.json</code>.
            Each card shows the raw TTS transcript alongside the annotated version where the stutter event is
            tagged and <span className="text-primary font-semibold">highlighted</span>. Brackets follow
            ASHA-standard inline markup adapted for Urdu RTL script.
          </p>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  activeTab === tab.key
                    ? tab.color + " shadow-sm scale-[1.03]"
                    : "text-muted-foreground border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                {tab.label}
                {tab.urdu !== "سب" && (
                  <span className="font-urdu ml-1.5 opacity-70">{tab.urdu}</span>
                )}
              </button>
            ))}
          </div>

          {/* Sample Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visible.map((sample) => {
              const style = LABEL_STYLES[sample.label_name] ?? LABEL_STYLES.syllable_repetition;
              return (
                <div
                  key={sample.id}
                  className={`rounded-2xl bg-card/40 border backdrop-blur-xl p-4 space-y-3 ${style.border}`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground bg-black/30 px-2 py-0.5 rounded border border-white/10">
                        {sample.id}
                      </span>
                      <Badge className={`text-xs border ${style.badge}`}>
                        <span className="font-urdu mr-1">{sample.category_urdu}</span>
                        {sample.label_name.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>🎙 {sample.voice_used}</span>
                      <span>⏱ {sample.duration_seconds}s</span>
                    </div>
                  </div>

                  {/* Scenario */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span className="font-medium text-foreground">Scenario:</span>
                    {sample.scenario}
                    {sample.stutter_unit && (
                      <span className="ml-auto font-mono text-[11px] bg-black/30 border border-white/10 px-1.5 rounded shrink-0">
                        unit: <span className="font-urdu font-bold">{sample.stutter_unit}</span>
                      </span>
                    )}
                  </div>

                  {/* Raw TTS Text */}
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      Raw TTS Transcript
                    </div>
                    <div
                      className="text-sm font-urdu text-muted-foreground bg-black/20 rounded-lg px-3 py-2 border border-white/5 leading-relaxed text-right"
                      dir="rtl"
                    >
                      {sample.tts_text}
                    </div>
                  </div>

                  {/* Annotated Text */}
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      Annotated (ASHA-style)
                    </div>
                    <div
                      className="text-sm bg-black/30 rounded-lg px-3 py-2 border border-white/10 leading-relaxed text-right"
                      dir="rtl"
                    >
                      {renderAnnotated(sample.annotated, sample.label_name)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Highlighted region = stutter event as marked in{" "}
                      <code className="text-primary bg-primary/10 px-1 rounded">annotations.json</code>
                    </div>
                  </div>
                </div>
              );
            })}
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
