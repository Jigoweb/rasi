import Link from "next/link";
import { supabaseServer } from "@/shared/lib/supabase-server";
import { getLegacyDocuments } from "@/shared/data/legacy-document-urls";
import { Reveal } from "../reveal";
import { FileText } from "lucide-react";

export default async function NormePage() {
  const { data: pages } = await supabaseServer
    .from("pages")
    .select("slug,title")
    .eq("category", "norme")
    .eq("is_published", true)
    .order("title", { ascending: true });

  const items = (pages ?? []).map((page) => ({
    ...page,
    hasDocument: getLegacyDocuments("norme", page.slug).length > 0,
  }));

  return (
    <div className="font-schibsted">
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Norme e riferimenti
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            Leggi, decreti e direttive di riferimento per la gestione collettiva dei diritti connessi nello spettacolo.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((page) => (
              <Link
                key={page.slug}
                href={`/norme/${page.slug}`}
                className="group flex items-start gap-4 rounded-2xl border border-rasi-line bg-rasi-paper p-6 transition-colors hover:border-rasi-ember/40 hover:bg-rasi-line/10"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rasi-line/50 text-rasi-ember transition-colors group-hover:bg-rasi-ember/10">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug text-rasi-ink group-hover:text-rasi-ember">
                    {page.title}
                  </span>
                  <span className="mt-1 block text-sm text-rasi-slate">
                    {page.hasDocument ? "Documento disponibile" : "Consulta il testo"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
