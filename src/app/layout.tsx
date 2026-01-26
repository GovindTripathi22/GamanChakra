import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const dynamic = "force-dynamic";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Voyage - AI Travel Planner",
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
          colorPrimary: "#F05A22",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${outfit.variable} ${playfair.variable} antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider>
            <Header />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
