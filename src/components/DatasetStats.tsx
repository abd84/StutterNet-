import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileAudio, Users, Layers } from "lucide-react";

const DatasetStats = () => {
  const stats = [
    { icon: FileAudio, value: "543", label: "Total Samples", urdu: "کل نمونے", color: "text-primary", bg: "bg-primary/10" },
    { icon: Clock, value: "~65 min", label: "Total Audio", urdu: "کل آڈیو", color: "text-accent", bg: "bg-accent/10" },
    { icon: Users, value: "3", label: "TTS Voices", urdu: "آوازیں", color: "text-secondary", bg: "bg-secondary/10" },
    { icon: Layers, value: "3", label: "Stutter Classes", urdu: "لکنت کی اقسام", color: "text-green-400", bg: "bg-green-500/10" },
    { icon: FileAudio, value: "415", label: "Synthetic (TTS)", urdu: "مصنوعی", color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { icon: FileAudio, value: "128", label: "Real Human", urdu: "حقیقی", color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-scale-in">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="border border-white/10 backdrop-blur-xl bg-card/40 hover:bg-card/60 hover:shadow-lg transition-all duration-300"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`p-2.5 ${stat.bg} rounded-xl`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                <div className="text-[10px] font-urdu text-muted-foreground">{stat.urdu}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DatasetStats;
