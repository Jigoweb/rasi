import { supabaseServer } from "@/shared/lib/supabase-server";
import { DocumentDownloadList } from "@/features/cms/components/PublicDocumentLayout";
import { Reveal } from "../reveal";
import type { PublicDocument } from "@/shared/lib/cms-content";

type DocumentRow = {
  id: string;
  title: string;
  file_url: string;
};

const GROUP_RULES: { id: string; label: string; test: (title: string) => boolean }[] = [
  {
    id: "trasparenza",
    label: "Relazioni di trasparenza",
    test: (t) => /relazione.*trasparenza/i.test(t),
  },
  {
    id: "mandati",
    label: "Mandati e adesione",
    test: (t) => /mandato|regolamento.*adesione|regolamento.*conferimento/i.test(t),
  },
  {
    id: "aie",
    label: "Modulistica AIE",
    test: (t) => /\baie\b|domanda_aie|modulo.?aie|dichiarazione.*aie/i.test(t),
  },
  {
    id: "tariffe",
    label: "Tariffe e accordi",
    test: (t) => /tariff|canali|piattaforme|sale cinematografiche/i.test(t),
  },
  {
    id: "covid",
    label: "Covid e misure di sostegno",
    test: (t) => /covid|rilancio|emergenza|misura_/i.test(t),
  },
  {
    id: "privacy",
    label: "Privacy e trattamento dati",
    test: (t) => /privacy|informativa.*dati|gdpr/i.test(t),
  },
  {
    id: "regolamenti",
    label: "Regolamenti e codici",
    test: (t) => /regolamento|statuto|codice.?etico|scheda_repertorio/i.test(t),
  },
];

function groupDocuments(documents: DocumentRow[]): { id: string; label: string; items: PublicDocument[] }[] {
  const assigned = new Set<string>();
  const groups: { id: string; label: string; items: PublicDocument[] }[] = [];

  for (const rule of GROUP_RULES) {
    const items = documents
      .filter((doc) => !assigned.has(doc.id) && rule.test(doc.title))
      .map((doc) => {
        assigned.add(doc.id);
        return { title: doc.title, url: doc.file_url };
      });

    if (items.length > 0) {
      groups.push({ id: rule.id, label: rule.label, items });
    }
  }

  const altri = documents
    .filter((doc) => !assigned.has(doc.id))
    .map((doc) => ({ title: doc.title, url: doc.file_url }));

  if (altri.length > 0) {
    groups.push({ id: "altri", label: "Altri documenti", items: altri });
  }

  return groups;
}

export default async function ModulisticaPage() {
  const { data: documents } = await supabaseServer
    .from("documents")
    .select("id,title,file_url")
    .eq("category", "modulistica")
    .order("title", { ascending: true });

  const rows = documents ?? [];
  const groups = groupDocuments(rows);

  return (
    <div className="font-schibsted">
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Modulistica
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            Moduli, mandati, regolamenti e documenti utili per artisti, eredi e produttori fonografici.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-10 px-4 py-16 md:px-6 md:py-24">
        {groups.length > 0 ? (
          groups.map((group, index) => (
            <Reveal key={group.id} delayMs={index * 60}>
              <DocumentDownloadList documents={group.items} heading={group.label} />
            </Reveal>
          ))
        ) : (
          <p className="text-center text-rasi-slate">Nessun documento disponibile al momento.</p>
        )}
      </section>
    </div>
  );
}
