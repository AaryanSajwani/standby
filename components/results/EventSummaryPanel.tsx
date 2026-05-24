import Link from "next/link";
import { Calendar, Users, Activity } from "lucide-react";

interface EventSummaryPanelProps {
  eventName: string;
  eventType: string;
  eventDate: string;
  attendance: number;
  riskFactors: {
    crowd: number;
    environmental: number;
    activity: number;
  };
}

function RiskBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}/10</span>
      </div>
      <div className="h-1.5 bg-secondary w-full">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

export function EventSummaryPanel({
  eventName,
  eventType,
  eventDate,
  attendance,
  riskFactors,
}: EventSummaryPanelProps) {
  return (
    <div className="border border-border bg-card">
      {/* Event Summary Section */}
      <div className="p-6 border-b border-border">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase mb-5">
          Event Summary
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Event Name</p>
            <p className="font-medium text-foreground">{eventName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Type
              </p>
              <p className="font-mono text-sm text-foreground">{eventType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date
              </p>
              <p className="font-mono text-sm text-foreground">{eventDate}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Expected Attendance
            </p>
            <p className="font-mono text-2xl text-foreground">{attendance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Risk Breakdown Section */}
      <div className="p-6 border-b border-border">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase mb-5">
          Risk Breakdown
        </h2>

        <div className="space-y-5">
          <RiskBar value={riskFactors.crowd} label="Crowd Risk" />
          <RiskBar value={riskFactors.environmental} label="Environmental Risk" />
          <RiskBar value={riskFactors.activity} label="Activity Risk" />
        </div>
      </div>

      {/* Actions Section */}
      <div className="p-6 space-y-3">
        <button className="w-full py-3 bg-primary text-primary-foreground font-mono text-sm tracking-wider uppercase hover:bg-primary/90 transition-colors">
          Save Report
        </button>
        <Link
          href="/assess"
          className="block text-center w-full py-3 bg-secondary text-foreground font-mono text-sm tracking-wider uppercase hover:bg-secondary/80 transition-colors border border-border"
        >
          Start New Assessment
        </Link>
      </div>
    </div>
  );
}
