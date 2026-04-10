import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function NewsPage() {
  const newsList = [
    {
      title: "BANDO R.A.S.I. 2025",
      date: "Ottobre 2024",
      status: "Concluso",
      excerpt: "Il bando tematico per sostenere la produzione artistica e i nuovi progetti teatrali o musicali.",
      slug: "bando-rasi-2025",
    },
    {
      title: "R.A.S.I. all'Assemblea Generale SCAPR",
      date: "Maggio 2024",
      status: "News",
      excerpt: "R.A.S.I. partecipa a Ljubljana all'Assemblea Generale annuale per definire i nuovi standard dei diritti connessi europei.",
      slug: "assemblea-scapr-2024",
    },
    {
      title: "Accordo con Netflix firmato",
      date: "Gennaio 2024",
      status: "Accordo",
      excerpt: "Firmato lo storico accordo per la corresponsione dei diritti connessi agli attori e interpreti sulle piattaforme VOD.",
      slug: "accordo-netflix",
    }
  ];

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
        {newsList.map((item, i) => (
          <div key={i} className="flex flex-col h-full bg-anthropic-light-gray/20 rounded-3xl p-8 border border-anthropic-light-gray/50 hover:border-anthropic-orange transition-colors group">
            <div className="flex items-center justify-between mb-6">
              <span className={`text-xs font-poppins font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                item.status === 'Concluso' ? 'bg-anthropic-mid-gray/20 text-anthropic-dark' :
                item.status === 'Accordo' ? 'bg-anthropic-blue/20 text-anthropic-blue' :
                'bg-anthropic-green/20 text-anthropic-green'
              }`}>
                {item.status}
              </span>
              <span className="font-poppins text-sm text-anthropic-mid-gray">{item.date}</span>
            </div>
            <h3 className="font-poppins text-2xl font-semibold text-anthropic-dark mb-4 group-hover:text-anthropic-orange transition-colors">
              {item.title}
            </h3>
            <p className="font-lora text-anthropic-dark/70 mb-8 flex-grow leading-relaxed">
              {item.excerpt}
            </p>
            <Link href={`/news/${item.slug}`} className="mt-auto">
              <Button variant="outline" className="w-full font-poppins rounded-full border-anthropic-dark text-anthropic-dark hover:bg-anthropic-dark hover:text-anthropic-light">
                Leggi di più
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}