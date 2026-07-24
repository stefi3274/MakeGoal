import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MakeGoal — N ap enfòme w",
  description: "Média sportif haïtien : actualités, analyses, matchs et communauté.",
  openGraph: {
    title: "MakeGoal — N ap enfòme w",
    description: "Média sportif haïtien : actualités, analyses, matchs et communauté.",
    url: "https://makegoal.vercel.app",
    siteName: "MakeGoal",
    images: [
      {
        url: "https://makegoal.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MakeGoal",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MakeGoal — N ap enfòme w",
    description: "Média sportif haïtien : actualités, analyses, matchs et communauté.",
    images: ["https://makegoal.vercel.app/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
