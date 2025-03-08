import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import "./globals.css";

import { Suspense } from "react";

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Truman",
  description: "Self Tracker & Statistics Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense>{children}</Suspense>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
