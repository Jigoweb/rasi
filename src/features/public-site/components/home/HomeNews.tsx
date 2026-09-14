import Link from "next/link";

export type HomeNewsItem = {
  id: string;
  slug: string;
  title: string;
  published_at: string | null;
  status: string;
};

export function HomeNews({ items }: { items: HomeNewsItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="w-full py-20 bg-anthropic-light">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-poppins text-3xl md:text-4xl font-bold text-anthropic-dark">
            I nostri impegni
          </h2>
          <Link href="/news" className="font-poppins text-sm text-anthropic-orange hover:underline">
            Tutte le news
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.slug}`}
              className="rounded-3xl border border-anthropic-light-gray p-6 hover:border-anthropic-orange transition-colors"
            >
              <div className="text-xs font-poppins uppercase tracking-wide text-anthropic-mid-gray mb-3">
                {item.published_at
                  ? new Date(item.published_at).toLocaleDateString("it-IT")
                  : item.status === "closed"
                    ? "Archivio"
                    : "Aggiornamento"}
              </div>
              <h3 className="font-poppins text-xl font-semibold text-anthropic-dark">{item.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
