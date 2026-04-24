import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase-server";

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: item } = await supabaseServer
    .from("bandi_news")
    .select("*")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .single();

  if (!item) {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto py-16 px-4 md:px-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <span className={`text-xs font-poppins font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
          item.status === "closed" ? "bg-anthropic-mid-gray/20 text-anthropic-dark" : "bg-anthropic-green/20 text-anthropic-green"
        }`}>
          {item.status === "closed" ? "Concluso" : "Attivo"}
        </span>
        <span className="font-poppins text-sm text-anthropic-mid-gray">
          {item.published_at ? new Date(item.published_at).toLocaleDateString("it-IT") : ""}
        </span>
      </div>

      <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-8">{item.title}</h1>

      {item.cover_image_url ? (
        <div className="mb-10 rounded-3xl overflow-hidden border border-anthropic-light-gray">
          <img src={item.cover_image_url} alt="" className="w-full h-auto" />
        </div>
      ) : null}

      <div
        className="prose prose-lg prose-anthropic font-lora text-anthropic-dark/80"
        dangerouslySetInnerHTML={{ __html: item.content || "" }}
      />
    </article>
  );
}

