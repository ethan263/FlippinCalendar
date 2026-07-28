import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Newsreader,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { shadcn } from "@clerk/ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { getMetadataBase } from "@/lib/site";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "flippinCalendar — AI front desk for modern teams",
    template: "%s · flippinCalendar",
  },
  description:
    "Run bookings, customer conversations, and a text-and-audio web concierge from one multi-tenant workspace.",
  applicationName: "flippinCalendar",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "flippinCalendar",
    title: "flippinCalendar — AI front desk for modern teams",
    description:
      "Run bookings, customer conversations, and a text-and-audio web concierge from one multi-tenant workspace.",
  },
  twitter: {
    card: "summary_large_image",
    title: "flippinCalendar — AI front desk for modern teams",
    description:
      "Run bookings, customer conversations, and a text-and-audio web concierge from one multi-tenant workspace.",
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ClerkProvider
          dynamic
          ui={ui}
          taskUrls={{
            "choose-organization": "/session-tasks/choose-organization",
          }}
          appearance={{
            theme: shadcn,
            elements: {
              // Clerk's fixed drawers intentionally ship without a z-index.
              // Keep checkout and its backdrop above flippinCalendar's sticky UI.
              drawerBackdrop: { zIndex: 9_999 },
              drawerRoot: { zIndex: 10_000 },
            },
          }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/app"
          signUpFallbackRedirectUrl="/app"
          afterSignOutUrl="/"
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
