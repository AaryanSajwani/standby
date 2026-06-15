export function LandingMethodology() {
  return (
    <section className="w-full px-5 overflow-hidden flex justify-center items-center">
      <div className="flex-1 flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch px-4 py-12 md:px-6 md:py-16 lg:py-28 flex flex-col justify-start items-start gap-2">
          <div className="self-stretch flex justify-between items-center">
            <div className="flex-1 px-4 py-8 md:px-12 lg:px-20 md:py-8 lg:py-10 overflow-hidden rounded-xl flex flex-col justify-center items-center gap-6 md:gap-8 lg:gap-10 border border-primary/20 bg-card relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,#F0424910,transparent)] pointer-events-none rounded-xl" />
              <span className="relative z-10 font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Why it's defensible
              </span>
              <div className="relative z-10 w-full max-w-[1024px] text-center text-foreground leading-7 md:leading-10 lg:leading-[56px] font-medium text-lg md:text-3xl lg:text-[44px] text-balance">
                When an AHJ asks &ldquo;why this many medics?&rdquo;, &ldquo;the model said so&rdquo; isn&apos;t an answer.
                Standby ties every staffing number to published mass-gathering medicine guidance —
                so your coverage plan holds up before anyone questions it.
              </div>
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Grounded in mass-gathering medicine literature
                </div>
                <p className="text-muted-foreground text-xs font-normal leading-5 max-w-[460px] text-center">
                  A multi-factor risk model, not a black box. Standby&apos;s recommendations are a
                  starting point and should always be reviewed by a qualified medical director.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
