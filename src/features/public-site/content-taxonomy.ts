const NORME_SLUGS = new Set([
  "codice-civile",
  "decreto-mibac-5-9-2018",
  "decreto-mibac-26-2-2019",
  "dpcm-del-15-07-1976",
  "dpcm-del-19-12-2012-requisiti-collecting",
  "dl-64-del-30-04-2010-art-7",
  "legge-633-del-1941",
  "legge-93-del-05-02-1992",
  "dl-1-del-24-01-2012-art-39-liberalizzazione",
  "dl-22-del-21-02-2014",
  "dl-163-del-10-11-2014",
  "dpcm-del-02-02-2015",
  "dm-mibac-del-20-06-2014-compenso-copia-privata",
  "dpcm-del-17-01-2014",
  "dpcm-del-01-09-1975",
  "d-lgs-15-3-2017-in-attuazione-direttiva-2014-26-ue",
  "direttiva-eu-mercato-unico-digitale",
  "covid-19-sostegno-artisti",
  "covid-19-sostegno-artisti-e-lavoratori-dello-spettacolo",
  "covid-19-sostegno-artisti-e-lavoratori-dello-spettacolo-2",
]);

const DOCUMENT_SLUGS = new Set([
  "contratto-tipo-canale-tv-nazionale",
  "contratto-tipo-piattaforme-tv-nazionali",
  "tariffe-diritti-connessi-video",
  "tariffe-diritti-connessi-musica",
  "elenco-opere-video-interpretate-da-artisti-rasi",
  "elenco-opere-musicali-interpretate-da-artisti-rasi",
  "scheda-repertorio",
]);

const MANDATO_SLUGS = new Set([
  "mandato-artista-alla-rasi",
  "mandato-artista-minorenne-alla-rasi",
  "mandato-erede-artista-alla-r-a-s-i",
  "mandato-erede-minorenne-artista-alla-r-a-s-i",
]);

export type LegacyTarget =
  | { table: "pages"; category: string; slug: string }
  | { table: "bandi_news"; slug: string }
  | { table: "ignore" };

export function classifyLegacySlug(slug: string): LegacyTarget {
  if (NORME_SLUGS.has(slug)) {
    return { table: "pages", category: "norme", slug: slug.replace(/-2$/, "") };
  }
  if (DOCUMENT_SLUGS.has(slug)) {
    const nested =
      slug === "elenco-opere-video-interpretate-da-artisti-rasi"
        ? "elenco-opere-video-interpretate"
        : slug === "elenco-opere-musicali-interpretate-da-artisti-rasi"
          ? "elenco-opere-musicali-interpretate"
          : slug;
    const category = slug.startsWith("contratto") || slug.startsWith("tariffe") || slug.startsWith("elenco")
      ? "utilizzatori"
      : "modulistica";
    return { table: "pages", category, slug: nested };
  }
  if (MANDATO_SLUGS.has(slug)) {
    return { table: "ignore" };
  }
  return { table: "bandi_news", slug };
}

export const PRIORITY_NEWS = [
  { slug: "bando-rasi-2026", title: "BANDO R.A.S.I. 2026", status: "active" as const },
  { slug: "incontrarti-iv-ed-grazie", title: "IncontrArti IV ed. – Grazie", status: "closed" as const },
  { slug: "bando-rasi-2025", title: "BANDO R.A.S.I. 2025", status: "closed" as const },
  { slug: "r-a-s-i-allassemblea-generale-di-scapr", title: "R.A.S.I. all’assemblea generale di SCAPR – Ljubljana 2025", status: "closed" as const },
  {
    slug: "rasi-e-netflix-firmano-laccordo-per-lutilizzo-delle-interpretazioni-degli-artisti-della-collecting",
    title: "RASI e Netflix firmano l’accordo per l’utilizzo delle interpretazioni degli artisti della collecting",
    status: "closed" as const,
  },
  { slug: "bando-sotto-lo-stesso-tetto", title: "Bando “Sotto lo stesso tetto”", status: "active" as const },
];
