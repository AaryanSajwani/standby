export function LandingTestimonial() {
  return (
    <section className="w-full px-5 overflow-hidden flex justify-center items-center">
      <div className="flex-1 flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch px-4 py-12 md:px-6 md:py-16 lg:py-28 flex flex-col justify-start items-start gap-2">
          <div className="self-stretch flex justify-between items-center">
            <div className="flex-1 px-4 py-8 md:px-12 lg:px-20 md:py-8 lg:py-10 overflow-hidden rounded-xl flex flex-col justify-center items-center gap-6 md:gap-8 lg:gap-11 border border-primary/20 bg-card relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,#F0424910,transparent)] pointer-events-none rounded-xl" />
              <div className="w-full max-w-[1024px] text-center text-foreground leading-7 md:leading-10 lg:leading-[64px] font-medium text-lg md:text-3xl lg:text-5xl">
                "Standby cut our pre-event prep time in half. We went from a two-week manual risk review to a defensible assessment in under five minutes — with documentation ready for the city."
              </div>
              <div className="flex justify-start items-center gap-5">
                <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-sm font-bold text-primary">JT</span>
                </div>
                <div className="flex flex-col justify-start items-start">
                  <div className="text-foreground text-base font-medium leading-6">Jamie Torres</div>
                  <div className="text-muted-foreground text-sm font-normal leading-6">Director of Events, Sunburst Music Festival</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
