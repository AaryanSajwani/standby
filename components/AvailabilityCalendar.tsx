"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

// Drag-to-select month calendar (converted from the availability-calendar.jsx
// drop-in: TS, semantic tokens for dark surfaces, past/far-future dates
// disabled to match the emt_availability date-window constraint in 0004).
//
// mode="multi": value is string[] of "YYYY-MM-DD"; click+drag toggles days.
// mode="range": value is {start,end}; drag paints one contiguous range,
//               committed to onChange on drag end.

export interface AvailabilityRange {
  start: string | null
  end: string | null
}

interface BaseProps {
  compact?: boolean
  /** Days strictly before this key (YYYY-MM-DD) are not selectable. */
  disableBefore?: string
  /** Days strictly after this key are not selectable. */
  disableAfter?: string
  /** Fires once when a drag session ends — persist here, not in onChange. */
  onDragEnd?: () => void
}

interface MultiProps extends BaseProps {
  mode: "multi"
  value: string[]
  onChange: (value: string[]) => void
}

interface RangeProps extends BaseProps {
  mode: "range"
  value: AvailabilityRange | null
  onChange: (value: AvailabilityRange | null) => void
}

export type AvailabilityCalendarProps = MultiProps | RangeProps

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const pad = (n: number) => String(n).padStart(2, "0")
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

function todayKey(): string {
  const t = new Date()
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate())
}

interface GridCell {
  key: string
  day: number
  inMonth: boolean
}

// 6x7 grid of cells for a month, padded with the neighboring months' days
function buildGrid(y: number, m: number): GridCell[] {
  const total = daysInMonth(y, m)
  const lead = new Date(y, m, 1).getDay()
  const prevTotal = daysInMonth(y, m === 0 ? 11 : m - 1)
  const cells: GridCell[] = []
  for (let i = lead - 1; i >= 0; i--) {
    const py = m === 0 ? y - 1 : y
    const pm = m === 0 ? 11 : m - 1
    cells.push({ key: dateKey(py, pm, prevTotal - i), day: prevTotal - i, inMonth: false })
  }
  for (let d = 1; d <= total; d++) {
    cells.push({ key: dateKey(y, m, d), day: d, inMonth: true })
  }
  while (cells.length < 42) {
    const rem = cells.length - (lead + total) + 1
    const ny = m === 11 ? y + 1 : y
    const nm = m === 11 ? 0 : m + 1
    cells.push({ key: dateKey(ny, nm, rem), day: rem, inMonth: false })
  }
  return cells
}

function MonthYearPicker({
  year,
  month,
  onPick,
  onClose,
}: {
  year: number
  month: number
  onPick: (y: number, m: number) => void
  onClose: () => void
}) {
  const [viewYear, setViewYear] = useState(year)
  return (
    <div className="absolute z-10 top-full left-0 mt-1 p-2 min-w-45 bg-card border border-border">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={() => setViewYear((y) => y - 1)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous year"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-xs tabular-nums text-foreground">{viewYear}</span>
        <button
          type="button"
          onClick={() => setViewYear((y) => y + 1)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next year"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_NAMES.map((name, i) => {
          const active = i === month && viewYear === year
          return (
            <button
              type="button"
              key={name}
              onClick={() => {
                onPick(viewYear, i)
                onClose()
              }}
              className={cn(
                "text-xs py-1 border transition-colors",
                active
                  ? "bg-secondary text-foreground border-border"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {name.slice(0, 3)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AvailabilityCalendar(props: AvailabilityCalendarProps) {
  const { compact = false, disableBefore, disableAfter, onDragEnd } = props
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragAction = useRef<"add" | "remove">("add") // multi mode only
  const dragAnchor = useRef<string | null>(null) // range mode only
  const [tempRange, setTempRange] = useState<AvailabilityRange | null>(null)
  // Touch drags fire emulated mouse events afterwards (mousedown after
  // touchend) — ignore mouse input briefly after any touch so a tap doesn't
  // toggle the same day twice.
  const suppressMouseUntil = useRef(0)

  const selectedSet = props.mode === "multi" ? new Set(props.value) : null
  const effectiveRange = props.mode === "range" ? tempRange ?? props.value : null

  // End the drag session on mouseup anywhere. Range mode commits the painted
  // range exactly once here (the .jsx original left tempRange behind, which
  // shadowed a cleared value and re-committed on every later mouseup).
  useEffect(() => {
    if (!dragging) return
    const stop = () => {
      setDragging(false)
      dragAnchor.current = null
      if (props.mode === "range" && tempRange) {
        props.onChange(tempRange)
        setTempRange(null)
      }
      onDragEnd?.()
    }
    const stopTouch = () => {
      suppressMouseUntil.current = Date.now() + 800
      stop()
    }
    window.addEventListener("mouseup", stop)
    window.addEventListener("touchend", stopTouch)
    window.addEventListener("touchcancel", stopTouch)
    return () => {
      window.removeEventListener("mouseup", stop)
      window.removeEventListener("touchend", stopTouch)
      window.removeEventListener("touchcancel", stopTouch)
    }
  }, [dragging, tempRange, props, onDragEnd])

  const isDisabledKey = (key: string) =>
    (disableBefore !== undefined && key < disableBefore) ||
    (disableAfter !== undefined && key > disableAfter)

  const applyMulti = (key: string) => {
    if (props.mode !== "multi") return
    const next = new Set(props.value)
    if (dragAction.current === "add") next.add(key)
    else next.delete(key)
    props.onChange(Array.from(next).sort())
  }

  const handleDown = (cell: GridCell) => {
    if (!cell.inMonth || isDisabledKey(cell.key)) return
    setDragging(true)
    if (props.mode === "multi") {
      dragAction.current = selectedSet!.has(cell.key) ? "remove" : "add"
      applyMulti(cell.key)
    } else {
      dragAnchor.current = cell.key
      setTempRange({ start: cell.key, end: cell.key })
    }
  }

  // Extends the drag to a day key that is already known to be selectable
  // (callers only pass keys of enabled, in-month cells).
  const handleDragOver = (key: string) => {
    if (!dragging) return
    if (props.mode === "multi") {
      applyMulti(key)
    } else if (dragAnchor.current) {
      const a = dragAnchor.current < key ? dragAnchor.current : key
      const b = dragAnchor.current < key ? key : dragAnchor.current
      setTempRange({ start: a, end: b })
    }
  }

  // Touch path: touch-action is disabled on the grid (touch-none), so during
  // a drag we hit-test the moving finger with elementFromPoint against the
  // data-daykey markers that only enabled, in-month cells carry.
  const handleGridTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    suppressMouseUntil.current = Date.now() + 800
    const touch = e.touches[0]
    if (!touch) return
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const key = el?.closest<HTMLElement>("[data-daykey]")?.dataset.daykey
    if (key) handleDragOver(key)
  }

  const grid = buildGrid(year, month)
  const tk = todayKey()

  return (
    <div className="select-none w-full">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2 relative">
        <button
          type="button"
          onClick={() => setMonth((m) => (m === 0 ? (setYear((y) => y - 1), 11) : m - 1))}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 relative">
          <span className="text-sm font-medium text-foreground tracking-wide">
            {MONTH_NAMES[month]} <span className="font-mono tabular-nums">{year}</span>
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Jump to month and year"
          >
            <CalendarDays className="w-3.5 h-3.5" />
          </button>
          {pickerOpen && (
            <MonthYearPicker
              year={year}
              month={month}
              onPick={(y, m) => {
                setYear(y)
                setMonth(m)
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setMonth((m) => (m === 11 ? (setYear((y) => y + 1), 0) : m + 1))}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        className="grid grid-cols-7 gap-px bg-border border border-border touch-none"
        onTouchMove={handleGridTouchMove}
      >
        {grid.map((cell) => {
          const disabled = !cell.inMonth || isDisabledKey(cell.key)
          const isToday = cell.key === tk && cell.inMonth

          let selected = false
          let inRangeBetween = false
          if (props.mode === "multi") {
            selected = cell.inMonth && !!selectedSet?.has(cell.key)
          } else if (effectiveRange?.start && cell.inMonth) {
            selected = cell.key === effectiveRange.start || cell.key === effectiveRange.end
            inRangeBetween =
              !!effectiveRange.end &&
              cell.key > effectiveRange.start &&
              cell.key < (effectiveRange.end ?? "")
          }

          return (
            <div
              key={cell.key}
              data-daykey={!disabled ? cell.key : undefined}
              onMouseDown={(e) => {
                if (Date.now() < suppressMouseUntil.current) return
                e.preventDefault()
                handleDown(cell)
              }}
              onMouseEnter={() => {
                if (!disabled) handleDragOver(cell.key)
              }}
              onTouchStart={() => {
                suppressMouseUntil.current = Date.now() + 800
                handleDown(cell)
              }}
              className={cn(
                "relative flex items-center justify-center bg-card",
                compact ? "h-8" : "h-10",
                !cell.inMonth
                  ? "text-muted-foreground/25"
                  : disabled
                  ? "text-muted-foreground/40"
                  : selected
                  ? "bg-risk-low text-background cursor-pointer"
                  : inRangeBetween
                  ? "bg-risk-low/15 text-foreground cursor-pointer"
                  : "text-foreground cursor-pointer hover:bg-secondary"
              )}
            >
              <span className="font-mono text-xs tabular-nums">{cell.day}</span>
              {isToday && !selected && (
                <span className="absolute bottom-1 w-1 h-0.5 bg-primary" aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
