import type { Metadata } from "next"
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google"
import { ShellWrapper } from "@/components/layout/ShellWrapper"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

// Required by Prompt 2 results page for event name heading
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
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
      className={`${geist.variable} ${geistMono.variable} ${playfair.variable} bg-background`}
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <ShellWrapper>{children}</ShellWrapper>
      </body>
    </html>
  )
}
