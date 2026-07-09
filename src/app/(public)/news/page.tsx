import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { supabaseServer } from "@/shared/lib/supabase-server";
import { extractArticleParagraphs } from "@/shared/lib/html-content";

function excerpt(html: string) {
  const paragraphs = extractArticleParagraphs(html);
  const text = paragraphs.join(" ");
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
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
          {newsList && newsList.length > 0 ? newsList.map((item) => (
            <div
              key={item.id}
              className="flex h-full flex-col rounded-md border border-rasi-line bg-white p-6 transition-colors hover:border-rasi-ember"
            >
              <h3 className="text-lg font-semibold leading-snug text-rasi-ink">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-rasi-slate">
                {excerpt(item.content || "") || "Aggiornamento in fase di pubblicazione."}
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
