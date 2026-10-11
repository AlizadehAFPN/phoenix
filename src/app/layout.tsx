import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";

import { COPY } from "@/content/copy";
import { palette, THEME } from "@/theme";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: COPY.meta.title,
  description: COPY.meta.description,
  applicationName: THEME.productName,
  robots: THEME.indexable
    ? { index: true, follow: true }
    : { index: false, follow: false },
  openGraph: {
    type: "website",
    title: COPY.meta.title,
    description: COPY.meta.description,
    siteName: THEME.productName,
  },
};

export const viewport: Viewport = {
  /* The scene is space in both modes, so the browser chrome is too. */
  themeColor: palette.grey.dark,
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
