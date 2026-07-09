import type { Metadata } from "next";

export const dynamic = 'force-dynamic'
import { Schibsted_Grotesk } from "next/font/google";
import { AuthProvider } from "@/shared/contexts/auth-context";
import "./globals.css";

const schibstedGrotesk = Schibsted_Grotesk({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-schibsted",
});

export const metadata: Metadata = {
  title: "RASI - Rete Artisti Spettacolo per l'Innovazione",
  description: "Organismo di Gestione Collettiva dei Diritti Connessi al Diritto d'Autore",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={schibstedGrotesk.variable}>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
