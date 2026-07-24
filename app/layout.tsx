import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ShellWrapper } from "@/components/layout/ShellWrapper"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
      className={`${geist.variable} ${geistMono.variable} bg-background`}
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
