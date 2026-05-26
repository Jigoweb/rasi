import type { Metadata } from "next";
import { Inter, Poppins, Lora } from "next/font/google";
import { AuthProvider } from "@/shared/contexts/auth-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ 
  weight: ["400", "500", "600", "700"], 
  subsets: ["latin"], 
  variable: "--font-poppins" 
});
const lora = Lora({ 
  subsets: ["latin"], 
  variable: "--font-lora" 
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
    <html lang="it" className={`${inter.variable} ${poppins.variable} ${lora.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
