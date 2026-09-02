import Image from "next/image"

// Founder credibility — a named person with a real credential is the one thing a
// template generator can't produce, and it directly answers "is this real."
//
// These are the actual founders' photos, not stock avatars — the honest-trust P0
// bans FABRICATED personnel/stock imagery to imply a supply that isn't there; real
// founders vouching for their own product is the opposite, and the strongest
// credibility signal on the page.
function FounderAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-card ring-1 ring-border shrink-0 bg-muted">
      <Image src={src} alt={alt} fill sizes="44px" className="object-cover" />
    </span>
  )
}

export function FounderBar() {
  return (
    <section className="w-full px-5 py-8 md:py-12 flex justify-center">
      <div className="w-full max-w-[860px] border border-border bg-card rounded-2xl px-6 py-6 md:px-10 md:py-7 flex flex-col sm:flex-row items-center gap-5 md:gap-7 text-center sm:text-left">
        <div className="flex items-center -space-x-2 shrink-0">
          <FounderAvatar src="/aaryan.jpg" alt="Aaryan Sajwani" />
          <FounderAvatar src="/tanay.jpg" alt="Tanay Naik" />
        </div>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Event medical staffing shouldn&rsquo;t run on spreadsheets and phone trees, it should be
          run by actual people. Built by two Cornell students:{" "}
          <a
            href="https://www.linkedin.com/in/aaryan-sajwani-2090142b4/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-medium underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
          >
            Aaryan Sajwani
          </a>
          , premed student &amp; certified EMT, and{" "}
          <a
            href="https://www.linkedin.com/in/tanay-naik111/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-medium underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
          >
            Tanay Naik
          </a>
          , mechanical engineer.
        </p>
      </div>
    </section>
  )
}
