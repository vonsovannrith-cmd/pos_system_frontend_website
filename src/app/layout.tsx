
import type { Metadata } from "next";
import { Kantumruy_Pro } from "next/font/google";

import "./globals.css";

const kantumruy = Kantumruy_Pro({
  variable: "--font-kantumruy",
  subsets: ["khmer", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "POS System",
  description: "Point of Sale",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="km">
      <body className={`${kantumruy.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
