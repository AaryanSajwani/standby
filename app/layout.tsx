import type { Metadata } from "next"
import { Bebas_Neue, Raleway } from "next/font/google"
import { ShellWrapper } from "@/components/layout/ShellWrapper"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

// Raleway = body / prose / data (font-sans + font-mono both resolve to it).
// Bebas Neue = display headings (font-display + the h1–h6 base rule).
const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
})

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400", // Bebas Neue ships a single weight; next/font requires it explicit
  variable: "--font-bebas",
})

export const metadata: Metadata = {
  title: "Standby — Event Medical Risk Assessment",
  description:
    "Professional event medical risk assessment and EMT staffing marketplace.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${raleway.variable} ${bebasNeue.variable} bg-background`}
    >
      {/* overflow-x-clip (not -hidden: that breaks the sticky NavBar) stops the
          landing pages' oversized decorative blurs from letting phones pan sideways */}
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col overflow-x-clip">
        <TooltipProvider>
          <ShellWrapper>{children}</ShellWrapper>
        </TooltipProvider>
      </body>
    </html>
  )
}
