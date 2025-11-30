import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Header } from "@/components/header";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Gamanchakra - AI Travel Planner",
  description: "Your personal AI-powered travel companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#F05A22", // Orange
        },
      }}
    >
      <html lang="en">
        <body
          className={`${outfit.variable} ${playfair.variable} antialiased bg-white text-slate-900`}
        >
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
