import Link from "next/link"
import { Calendar, Users, Activity } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"

interface EventSummaryPanelProps {
  eventName: string
  eventType: string
  eventDate: string
  attendance: number
  riskFactors: {
    crowd: number
    environmental: number
    activity: number
  }
}

function RiskBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}/10</span>
      </div>
      <Progress value={value * 10} className="h-1.5" />
    </div>
  )
}

export function EventSummaryPanel({
  eventName,
  eventType,
  eventDate,
  attendance,
  riskFactors,
}: EventSummaryPanelProps) {
  return (
    <Card className="flex flex-col">
      {/* Event Summary */}
      <CardHeader className="pb-0">
        <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Event Summary
        </span>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Event Name</p>
          <p className="font-medium text-foreground">{eventName}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Type
            </p>
            <p className="font-mono text-sm text-foreground">{eventType}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date
            </p>
            <p className="font-mono text-sm text-foreground">{eventDate}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> Expected Attendance
          </p>
          <p className="font-mono text-2xl font-bold text-foreground">
            {attendance.toLocaleString()}
          </p>
        </div>
      </CardContent>

      <Separator />

      {/* Risk Breakdown */}
      <CardHeader className="pb-0">
        <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Risk Breakdown
        </span>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <RiskBar value={riskFactors.crowd} label="Crowd Risk" />
        <RiskBar value={riskFactors.environmental} label="Environmental Risk" />
        <RiskBar value={riskFactors.activity} label="Activity Risk" />
      </CardContent>

      <Separator />

      {/* Actions */}
      <CardContent className="pt-4 space-y-2">
        <Button className="w-full font-mono text-xs tracking-wider uppercase">
          Save Report
        </Button>
        <Button asChild variant="outline" className="w-full font-mono text-xs tracking-wider uppercase">
          <Link href="/assess">Start New Assessment</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
