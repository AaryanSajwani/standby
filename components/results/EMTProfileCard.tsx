import { MapPin } from "lucide-react";

interface EMTProfileCardProps {
  name: string;
  certLevel: string;
  yearsExperience: number;
  radiusMiles: number;
  available: boolean;
}

export function EMTProfileCard({
  name,
  certLevel,
  yearsExperience,
  radiusMiles,
  available,
}: EMTProfileCardProps) {
  return (
    <div className="border border-border bg-card p-5 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground text-lg">{name}</h3>
          <span className="inline-block mt-1 font-mono text-xs tracking-wider bg-secondary text-primary px-2 py-1">
            {certLevel}
          </span>
        </div>
        <span
          className={`inline-flex items-center font-mono text-xs tracking-wider px-2 py-1 ${
            available
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {available ? "AVAILABLE" : "UNAVAILABLE"}
        </span>
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Experience</span>
          <span className="font-mono text-foreground">{yearsExperience} years</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Service radius</span>
          <span className="font-mono text-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {radiusMiles} mi
          </span>
        </div>
      </div>

      <button
        disabled={!available}
        className={`mt-5 w-full py-3 font-mono text-sm tracking-wider uppercase transition-colors ${
          available
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        Request Staffing
      </button>
    </div>
  );
}
