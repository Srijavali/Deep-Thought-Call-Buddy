
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeepThought | Cold Call Companion",
  description: "AI-powered cold-call companion for managing prospects and follow-ups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
