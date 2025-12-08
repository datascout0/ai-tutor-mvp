import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "AI Tutor",
  description: "Language tutor MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://code.responsivevoice.org/responsivevoice.js?key=YOUR_RESPONSIVEVOICE_KEY"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
