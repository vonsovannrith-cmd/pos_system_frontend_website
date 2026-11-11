
import type { Metadata } from "next";
import { Google_Sans_Flex, Kantumruy_Pro } from "next/font/google";
import "./globals.css";

const googleSans = Google_Sans_Flex({
  variable: "--font-google-sans",
  subsets: ["latin"],
  display: "swap",
});

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
      <body
        className={`${googleSans.variable} ${kantumruy.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
