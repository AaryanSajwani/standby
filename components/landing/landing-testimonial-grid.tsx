const testimonials = [
  {
    quote:
      "Standby transformed how we approach event medical planning. The AI risk scoring catches risks we hadn't even considered, and the compliance documentation has saved us thousands in insurance negotiations.",
    name: "Sarah Chen",
    role: "VP Operations, LiveNation Events",
    initials: "SC",
    type: "large-primary",
  },
  {
    quote:
      "We were skeptical about AI for medical planning, but the staffing recommendations were spot-on for our 15,000-person marathon. Every number was justified.",
    name: "Marcus Webb",
    role: "Race Director, Metro Marathon",
    initials: "MW",
    type: "small",
  },
  {
    quote:
      "The EMT marketplace alone is worth it. We found qualified personnel for a last-minute venue change within two hours.",
    name: "Priya Nair",
    role: "Senior Festival Coordinator",
    initials: "PN",
    type: "small",
  },
  {
    quote:
      "Standby's compliance reports made our AHJ submission completely painless. The documentation was exactly what the city needed, first try.",
    name: "Tom Bradford",
    role: "Event Safety Officer, City Arena",
    initials: "TB",
    type: "small",
  },
  {
    quote:
      "From a 45-minute staffing deliberation to a 4-minute assessment. That's the Standby difference for our corporate events.",
    name: "Lisa Park",
    role: "Corporate Events Manager",
    initials: "LP",
    type: "small",
  },
  {
    quote:
      "We've run 14 events with Standby this season. Every assessment has been accurate, and every AHJ has approved on first submission.",
    name: "Derek Okonkwo",
    role: "Head of Operations, Stadium Events Co.",
    initials: "DO",
    type: "small",
  },
  {
    quote:
      "The risk model has deep domain knowledge. It flagged factors our in-house team had never considered — crowd density vectors, proximity to trauma centers, historical weather patterns for the venue.",
    name: "Dr. Amara Singh",
    role: "Chief Medical Officer, MegaFest",
    initials: "AS",
    type: "large-light",
  },
]

const TestimonialCard = ({
  quote,
  name,
  role,
  initials,
  type,
}: {
  quote: string
  name: string
  role: string
  initials: string
  type: string
}) => {
  const isLarge = type.startsWith("large")

  let cardClass = "flex flex-col justify-between items-start overflow-hidden rounded-xl shadow-sm relative p-6 w-full"
  let quoteClass = "font-normal break-words relative z-10 "
  let nameClass = "relative z-10 "
  let roleClass = "relative z-10 "

  if (type === "large-primary") {
    cardClass += " bg-primary min-h-[502px]"
    quoteClass += "text-white text-2xl font-medium leading-8"
    nameClass += "text-white text-base font-medium leading-6"
    roleClass += "text-white/60 text-sm font-normal leading-6"
  } else if (type === "large-light") {
    cardClass += " bg-card/40 border border-border/40 min-h-[502px]"
    quoteClass += "text-foreground text-2xl font-medium leading-8"
    nameClass += "text-foreground text-base font-medium leading-6"
    roleClass += "text-muted-foreground text-sm font-normal leading-6"
  } else {
    cardClass += " bg-card/60 border border-border/40 min-h-[244px]"
    quoteClass += "text-foreground/80 text-[17px] font-normal leading-6"
    nameClass += "text-foreground text-sm font-medium leading-[22px]"
    roleClass += "text-muted-foreground text-sm font-normal leading-[22px]"
  }

  const avatarSize = isLarge ? "w-12 h-12" : "w-9 h-9"
  const avatarText = isLarge ? "text-sm" : "text-xs"

  return (
    <div className={cardClass}>
      <p className={quoteClass}>{quote}</p>
      <div className="relative z-10 flex items-center gap-3 mt-6">
        <div
          className={`${avatarSize} rounded-full flex items-center justify-center flex-shrink-0 ${
            type === "large-primary" ? "bg-white/20" : "bg-primary/20 border border-primary/30"
          }`}
        >
          <span className={`font-mono font-bold ${avatarText} ${type === "large-primary" ? "text-white" : "text-primary"}`}>
            {initials}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className={nameClass}>{name}</div>
          <div className={roleClass}>{role}</div>
        </div>
      </div>
    </div>
  )
}

export function LandingTestimonialGrid() {
  return (
    <section className="w-full px-5 overflow-hidden flex flex-col justify-start py-6 md:py-8 lg:py-14">
      <div className="self-stretch py-6 md:py-8 lg:py-14 flex flex-col justify-center items-center gap-2">
        <div className="flex flex-col justify-start items-center gap-4">
          <h2 className="text-center text-foreground text-3xl md:text-4xl lg:text-[40px] font-semibold leading-tight">
            Event safety, made defensible
          </h2>
          <p className="self-stretch text-center text-muted-foreground text-sm md:text-base font-medium leading-relaxed">
            Hear how event coordinators, safety officers, and medical directors <br className="hidden md:block" />
            build confidence with Standby.
          </p>
        </div>
      </div>
      <div className="w-full pt-0.5 pb-4 md:pb-6 lg:pb-10 flex flex-col md:flex-row justify-center items-start gap-4 md:gap-4 lg:gap-6 max-w-[1100px] mx-auto">
        <div className="flex-1 flex flex-col gap-4 lg:gap-6">
          <TestimonialCard {...testimonials[0]} />
          <TestimonialCard {...testimonials[1]} />
        </div>
        <div className="flex-1 flex flex-col gap-4 lg:gap-6">
          <TestimonialCard {...testimonials[2]} />
          <TestimonialCard {...testimonials[3]} />
          <TestimonialCard {...testimonials[4]} />
        </div>
        <div className="flex-1 flex flex-col gap-4 lg:gap-6">
          <TestimonialCard {...testimonials[5]} />
          <TestimonialCard {...testimonials[6]} />
        </div>
      </div>
    </section>
  )
}
