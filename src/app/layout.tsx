import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/query/provider";
import { AuthProvider } from "@/lib/auth/context";
import { SiteHeader } from "@/components/site-header";
import { MockBoot } from "@/components/mock-boot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Drop of Water — Clean water, funded together",
  description:
    "Drop of Water is a crowdfunding platform for water-infrastructure projects. Fund wells, sponsor campaigns, and see your impact.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900">
        <QueryProvider>
          <MockBoot />
          <AuthProvider>
            <SiteHeader />
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
