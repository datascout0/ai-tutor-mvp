import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frontline Learn · concept",
  description:
    "Concept prototype: turn a store procedure into a grounded micro-course, with manager review, an adaptive quiz and translation checks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
