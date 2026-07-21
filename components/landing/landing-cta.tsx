import Link from "next/link"
import Image from "next/image"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LandingCTA() {
  return (
    <section className="w-full pt-20 md:pt-40 pb-10 md:pb-20 px-5 relative flex flex-col justify-center items-center overflow-visible">
      <div className="absolute inset-0 top-[-90px] pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 1388 825"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <mask
            id="mask0_cta_standby"
            style={{ maskType: "alpha" }}
            maskUnits="userSpaceOnUse"
            x="269"
            y="27"
            width="850"
            height="493"
          >
            <rect x="269.215" y="27.4062" width="849.57" height="492.311" fill="url(#paint0_cta_standby)" />
          </mask>
          <g mask="url(#mask0_cta_standby)">
            <g filter="url(#filter0_cta_standby)">
              <ellipse cx="694" cy="-93.0414" rx="670.109" ry="354.908" fill="url(#paint1_cta_standby)" fillOpacity="0.8" />
            </g>
            <ellipse cx="694" cy="-91.5385" rx="670.109" ry="354.908" fill="url(#paint2_cta_standby)" />
            <ellipse cx="694" cy="-93.0414" rx="670.109" ry="354.908" fill="url(#paint3_cta_standby)" />
          </g>
          <defs>
            <filter id="filter0_cta_standby" x="-234.109" y="-705.949" width="1856.22" height="1225.82" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur stdDeviation="129" result="effect1_foregroundBlur" />
            </filter>
            <linearGradient id="paint0_cta_standby" x1="1118.79" y1="273.562" x2="269.215" y2="273.562" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--background)" stopOpacity="0" />
              <stop offset="0.2" stopColor="var(--background)" stopOpacity="0.8" />
              <stop offset="0.8" stopColor="var(--background)" stopOpacity="0.8" />
              <stop offset="1" stopColor="var(--background)" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="paint1_cta_standby" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(683.482 245.884) rotate(-3.78676) scale(469.009 248.4)">
              <stop offset="0.1294" stopColor="var(--primary-dark)" />
              <stop offset="0.2347" stopColor="var(--primary)" />
              <stop offset="0.3" stopColor="var(--primary)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="paint2_cta_standby" x1="694" y1="-446.446" x2="694" y2="263.369" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" stopOpacity="0" />
              <stop offset="1" stopColor="white" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="paint3_cta_standby" x1="694" y1="-447.949" x2="694" y2="261.866" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--background)" />
              <stop offset="1" stopColor="var(--background)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="relative z-10 flex flex-col justify-start items-center gap-9 max-w-4xl mx-auto text-center">
        <div className="flex flex-col justify-start items-center gap-4">
          <Image
            src="/standby-mark.png"
            alt="StandBy logo"
            width={56}
            height={56}
            className="h-12 w-12 md:h-14 md:w-14 object-contain mb-2"
          />
          <h2 className="text-foreground text-4xl md:text-5xl lg:text-[68px] font-semibold leading-tight lg:leading-[76px] break-words max-w-[600px]">
            Medical coverage that starts before the event does.
          </h2>
          <p className="text-muted-foreground text-sm md:text-base font-medium leading-relaxed break-words max-w-2xl">
            Generate a defensible risk report, secure your staffing, and get documentation ready — in under 5 minutes.
          </p>
        </div>
        <Link
          href="/assess"
          className={cn(buttonVariants({ size: "lg" }), "px-[30px] py-2 rounded-full text-base font-medium")}
        >
          Start your assessment
        </Link>
      </div>
    </section>
  )
}
