import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "History of Venture Capital",
  description:
    "An interactive subway-style timeline exploring the history of venture capital from 1946 to 2025. Discover the connections between major VC firms, investments, IPOs, and key milestones that shaped the industry.",
  keywords:
    "venture capital, VC history, startup funding, Silicon Valley, timeline, interactive visualization, ARDC, Fairchild, Sequoia, Kleiner Perkins, Y Combinator, Andreessen Horowitz",
  authors: [{ name: "VC History Project" }],
  creator: "VC History Project",
  publisher: "VC History Project",
  robots: "index, follow",
  openGraph: {
    title: "History of Venture Capital",
    description:
      "An interactive subway-style timeline exploring the history of venture capital from 1946 to 2025. Discover the connections between major VC firms, investments, IPOs, and key milestones that shaped the industry.",
    url: "https://vc-history.vercel.app",
    siteName: "History of Venture Capital",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "History of Venture Capital - Interactive Timeline",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "History of Venture Capital",
    description:
      "An interactive subway-style timeline exploring the history of venture capital from 1946 to 2025. Discover the connections between major VC firms, investments, IPOs, and key milestones.",
    images: ["/og-image.png"],
    creator: "@vchistory",
    site: "@vchistory",
  },
  metadataBase: new URL("https://vc-history.vercel.app"),
  alternates: {
    canonical: "/",
  },
  other: {
    "theme-color": "#1e293b",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Additional meta tags for better social media support */}
        <meta property="og:image:secure_url" content="https://vc-history.vercel.app/og-image.png" />
        <meta name="twitter:image:src" content="https://vc-history.vercel.app/og-image.png" />

        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-4HZH9BMR7E"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-4HZH9BMR7E');
            `,
          }}
        />
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "History of Venture Capital",
              description:
                "An interactive subway-style timeline exploring the history of venture capital from 1946 to 2025",
              url: "https://vc-history.vercel.app",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web Browser",
              author: {
                "@type": "Organization",
                name: "VC History Project",
              },
              datePublished: "2025-01-21",
              inLanguage: "en-US",
            }),
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
