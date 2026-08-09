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
  title: "Urban Wildlife Simulation",
  description:
    "An endless participatory simulation about feeding choices, urban wildlife, and the pressures shaping a shared city habitat.",
  openGraph: {
    title: "Urban Wildlife Simulation",
    description:
      "Feed seven urban species, read their uncertain responses, and keep four connected city systems from collapsing.",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Urban Wildlife Simulation illustrated park",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Urban Wildlife Simulation",
    description:
      "An endless simulation of feeding choices and urban wildlife systems.",
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
