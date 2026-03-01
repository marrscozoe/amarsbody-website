import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMarsBody | Personal Training & Nutrition",
  description: "Dallas personal training. Get wedding-ready, beach-body ready, or just stronger. Custom nutrition + fitness plans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
