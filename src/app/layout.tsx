import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { Navbar } from "@/components/layout/navbar";
import { DemoMode } from "@/components/demo/demo-mode";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ToastContainer } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scotty's Ledger - Personal Finance Digital Twin",
  description: "Your financial life visualized as an interactive graph",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider>
          <AmbientBackground />
          <Navbar />
          <main className="relative z-10 md:ml-[200px] px-6 md:px-8 py-6 md:py-8 pb-20 md:pb-8 min-h-screen">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
          <DemoMode />
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
