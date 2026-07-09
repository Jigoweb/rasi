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
    <div className="font-schibsted">
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Bandi e news RASI
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            Bandi, incontri e aggiornamenti dal mondo della gestione collettiva dei diritti connessi.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {newsList && newsList.length > 0 ? newsList.map((item, i) => (
            <div
              key={item.id}
              className="flex h-full flex-col rounded-md border border-rasi-line bg-white p-6 transition-colors hover:border-rasi-ember"
              style={{ animationDelay: `${(i % 6) * 60}ms` }}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    item.status === "closed"
                      ? "bg-rasi-line text-rasi-slate"
                      : "bg-rasi-ember/10 text-rasi-ember"
                  }`}
                >
                  {item.status === "closed" ? "Concluso" : "Attivo"}
                </span>
                <span className="text-sm text-rasi-slate">
                  {item.published_at ? new Date(item.published_at).toLocaleDateString("it-IT") : ""}
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-snug text-rasi-ink">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-rasi-slate">
                {stripHtml(item.content || "").slice(0, 140) || "Aggiornamento in fase di pubblicazione."}
                {stripHtml(item.content || "").length > 140 ? "..." : ""}
              </p>
              <Link href={`/news/${item.slug}`} className="mt-6">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-rasi-ink text-sm font-semibold text-rasi-ink hover:bg-rasi-ink hover:text-rasi-paper"
                >
                  Leggi di più
                </Button>
              </Link>
            </div>
          )) : (
            <div className="col-span-full py-16 text-center text-rasi-slate">
              Nessuna news disponibile.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
