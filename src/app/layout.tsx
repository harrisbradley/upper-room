import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upper Room — Bible Study Organizer",
  description: "Create and join Bible studies with a simple share link.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
