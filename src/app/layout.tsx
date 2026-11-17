import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { existsSync } from "fs";
import path from "path";
import { Providers } from "@/components/providers";
import { getOwner } from "@/lib/owner";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin", "greek"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const mono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin", "greek"] });

export async function generateMetadata(): Promise<Metadata> {
  const owner = await getOwner();
  const personal = existsSync(path.join(process.cwd(), "public", "favicon.svg"));
  return {
    title: { default: `${owner.name} — Professional profile`, template: `%s — ${owner.name}` },
    description: "Interactive professional profile with Donna, an AI secretary.",
    robots: { index: false, follow: false },
    ...(personal
      ? {
          manifest: "/site.webmanifest",
          icons: {
            icon: [
              { url: "/favicon.ico", sizes: "any" },
              { url: "/favicon.svg", type: "image/svg+xml" },
              { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
              { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
            ],
            apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
          },
        }
      : { icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] } }),
  };
}

export const viewport: Viewport = {
  themeColor: "#111418",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
