import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Gem Coach",
  description: "Personal English speaking tutor powered by Gemini and Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`}>
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-100">
        {children}
      </body>
    </html>
  );
}
