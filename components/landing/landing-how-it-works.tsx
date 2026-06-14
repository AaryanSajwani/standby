const STEPS = [
  {
    n: "01",
    title: "Assess",
    body: "Answer five short steps about your event. Standby scores medical exposure across crowd, environment, and activity — a 0–10 risk level with the factors that drove it.",
  },
  {
    n: "02",
    title: "Staff",
    body: "Get a staffing configuration tied to that score: how many EMTs, which certification level, and for how long. Browse license-verified personnel matched to your event and request coverage.",
  },
  {
    n: "03",
    title: "Document",
    body: "Every recommendation references its basis. When the authority having jurisdiction — or your insurer — asks why, you have a defensible answer instead of a guess.",
  },
]

export function LandingHowItWorks() {
  return (
    <section className="w-full px-5 overflow-hidden flex flex-col justify-start py-6 md:py-8 lg:py-14">
      <div className="self-stretch py-6 md:py-8 lg:py-14 flex flex-col justify-center items-center gap-2">
        <div className="flex flex-col justify-start items-center gap-4">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">How it works</span>
          <h2 className="text-center text-foreground text-3xl md:text-4xl lg:text-[40px] font-semibold leading-tight">
            Assess. Staff. Document.
          </h2>
          <p className="self-stretch max-w-[640px] text-center text-muted-foreground text-sm md:text-base font-medium leading-relaxed">
            One workflow turns event details into a defensible medical coverage plan —
            not a feature bolted onto a staffing list, but the reason the staffing gets chosen.
          </p>
        </div>
      </div>
      <div className="w-full pt-0.5 pb-4 md:pb-6 lg:pb-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-[1100px] mx-auto">
        {STEPS.map(({ n, title, body }) => (
          <div
            key={n}
            className="flex flex-col gap-4 p-6 md:p-8 rounded-2xl border border-border/60 bg-card relative overflow-hidden"
          >
            <span className="font-mono text-5xl font-bold tabular-nums text-primary/30 leading-none">{n}</span>
            <h3 className="text-foreground text-xl font-semibold">{title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
