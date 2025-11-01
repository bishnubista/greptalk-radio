import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greptalk: Repo Radio",
  description: "Turn any GitHub repo into a podcast - AI-generated code podcasts with real citations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
