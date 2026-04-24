import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { supabaseServer } from "@/shared/lib/supabase-server";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function NewsPage() {
  const { data: newsList } = await supabaseServer
    .from("bandi_news")
    .select("id,slug,title,content,status,cover_image_url,published_at,created_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  return (
    <div className="py-16 md:py-24 container mx-auto px-4 md:px-6">
      <div className="flex flex-col items-center text-center mb-16">
        <h1 className="font-poppins text-4xl md:text-6xl font-bold text-anthropic-dark mb-6">
          News e Bandi
        </h1>
        <p className="font-lora text-xl text-anthropic-mid-gray max-w-2xl">
          Rimani aggiornato sulle ultime iniziative, sui bandi per i finanziamenti e sugli accordi a tutela degli artisti.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {newsList && newsList.length > 0 ? newsList.map((item) => (
          <div key={item.id} className="flex flex-col h-full bg-anthropic-light-gray/20 rounded-3xl p-8 border border-anthropic-light-gray/50 hover:border-anthropic-orange transition-colors group">
            <div className="flex items-center justify-between mb-6">
              <span className={`text-xs font-poppins font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                item.status === 'closed' ? 'bg-anthropic-mid-gray/20 text-anthropic-dark' :
                'bg-anthropic-green/20 text-anthropic-green'
              }`}>
                {item.status === 'closed' ? 'Concluso' : 'Attivo'}
              </span>
              <span className="font-poppins text-sm text-anthropic-mid-gray">
                {item.published_at ? new Date(item.published_at).toLocaleDateString("it-IT") : ""}
              </span>
            </div>
            <h3 className="font-poppins text-2xl font-semibold text-anthropic-dark mb-4 group-hover:text-anthropic-orange transition-colors">
              {item.title}
            </h3>
            <p className="font-lora text-anthropic-dark/70 mb-8 flex-grow leading-relaxed">
              {stripHtml(item.content || "").slice(0, 160) || "Aggiornamento in fase di pubblicazione."}
              {stripHtml(item.content || "").length > 160 ? "…" : ""}
            </p>
            <Link href={`/news/${item.slug}`} className="mt-auto">
              <Button variant="outline" className="w-full font-poppins rounded-full border-anthropic-dark text-anthropic-dark hover:bg-anthropic-dark hover:text-anthropic-light">
                Leggi di più
              </Button>
            </Link>
          </div>
        )) : (
          <div className="col-span-full text-center text-anthropic-mid-gray font-lora py-16">
            Nessuna news disponibile.
          </div>
        )}
      </div>
    </div>
  );
}
