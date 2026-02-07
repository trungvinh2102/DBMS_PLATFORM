/**
 * @file layout.tsx
 * @description Root layout component that provides global providers, fonts, and base structure.
 */

import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DBMS",
  description: "DBMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="relative flex h-screen flex-col bg-background overflow-hidden">
            <Header />
            <main className="flex-1 flex flex-col overflow-hidden">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
