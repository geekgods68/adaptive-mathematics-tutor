import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { themeScriptSource } from "@/components/shell/themeScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RISE Mathematics Tutor",
  description:
    "RISE research platform: an adaptive/non-adaptive mathematics tutoring study on quadratic equations and functions, with an integrated student learning workspace and researcher workspace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script below (blocking, in <head>) adds/removes "dark" on this element before
      // React hydrates, based on localStorage/prefers-color-scheme -- a legitimate, intentional
      // client/server difference on this one element, not a bug. suppressHydrationWarning is the
      // standard Next.js pattern for exactly this (see their own dark-mode docs); it only
      // suppresses the warning for this element's own attributes, not its children.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScriptSource }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
