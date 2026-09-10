import type { Metadata } from "next";
import { HomeArtistiInAzione } from "@/features/public-site/components/home/HomeArtistiInAzione";
import { HomeAudience } from "@/features/public-site/components/home/HomeAudience";
import { HomeHero } from "@/features/public-site/components/home/HomeHero";
import { HomeKpi } from "@/features/public-site/components/home/HomeKpi";
import { HomeNews } from "@/features/public-site/components/home/HomeNews";
import { HomeWhyMandate } from "@/features/public-site/components/home/HomeWhyMandate";
import { supabaseServer } from "@/shared/lib/supabase-server";

export const metadata: Metadata = {
  title: "R.A.S.I. | Rete Artisti Spettacolo per l'Innovazione",
  description:
    "Organismo di gestione collettiva dei diritti connessi al diritto d'autore. Mandato al 10%, Award System e tutela degli artisti.",
};

export default async function Home() {
  const { data: news } = await supabaseServer
    .from("bandi_news")
    .select("id,slug,title,published_at,status")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-col font-lora">
      <HomeHero />
      <HomeNews items={news || []} />
      <HomeAudience />
      <HomeWhyMandate />
      <HomeKpi />
      <HomeArtistiInAzione />
    </div>
  );
}
