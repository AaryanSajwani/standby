// Founder credibility — a named person with a real credential is the one thing a
// template generator can't produce, and it directly answers "is this real."
//
// Avatars are monogram blocks (the honest default — same pattern as personnel
// cards; no stock photos). To use a real photo, swap a monogram <div> for
// <Image src="/aaryan.jpg" … /> after adding the asset to /public.
function Monogram({ initials }: { initials: string }) {
  return (
    <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
      <span className="font-mono text-sm font-bold text-primary">{initials}</span>
    </div>
  )
}

export function FounderBar() {
  return (
    <section className="w-full px-5 py-8 md:py-12 flex justify-center">
      <div className="w-full max-w-[860px] border border-border bg-card rounded-2xl px-6 py-6 md:px-10 md:py-7 flex flex-col sm:flex-row items-center gap-5 md:gap-7 text-center sm:text-left">
        <div className="flex items-center -space-x-2 shrink-0">
          <Monogram initials="AS" />
          <Monogram initials="T" />
        </div>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Built by <span className="text-foreground font-medium">Aaryan Sajwani</span>, certified EMT, and{" "}
          <span className="text-foreground font-medium">Tanay</span>, Cornell&nbsp;&rsquo;29 — because event medical
          staffing shouldn&rsquo;t run on spreadsheets and phone trees.
        </p>
      </div>
    </section>
  )
}
