import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://urban-pigeon-simulation.lkt1009.chatgpt.site"),
  title: "Urban Pigeon Simulation",
  description:
    "A calm participatory simulation exploring how repeated feeding can shape urban pigeon behavior over time.",
  openGraph: {
    title: "Urban Pigeon Simulation",
    description:
      "A participatory simulation of feeding pressure and behavioral change, represented as a moving illustrated flock.",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Urban Pigeon Simulation illustrated flock",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Urban Pigeon Simulation",
    description:
      "A participatory simulation of feeding pressure and behavioral change.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
