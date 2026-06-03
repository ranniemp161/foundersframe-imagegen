import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoundersFrame Image Studio",
  description: "Transcript → styled explainer images for the FoundersFrame channel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
