export type WpRedirect = {
  source: string;
  destination: string;
};

const AUTH_SOURCES = [
  "/login",
  "/register",
  "/members",
  "/user",
  "/logout",
  "/password-reset",
];

/** Flat WordPress permalinks → nested Next.js routes. */
const FLAT_TO_NESTED: Record<string, string> = {
  "/inizio-attivita": "/chi-siamo/inizio-attivita",
  "/statuto": "/chi-siamo/statuto",
  "/privacy-policy": "/chi-siamo/privacy-policy",
  "/personal-data-policy": "/chi-siamo/personal-data-policy",
  "/procedure-di-trattamento-dei-reclami": "/chi-siamo/procedure-di-trattamento-dei-reclami",
  "/organi-sociali": "/chi-siamo/organi-sociali",
  "/regolamento-adesione": "/chi-siamo/regolamento-adesione",
  "/relazione-di-trasparenza": "/chi-siamo/relazione-di-trasparenza",
  "/linee-di-condotta": "/chi-siamo/linee-di-condotta",
  "/quando-gli-artisti-maturano-il-compenso-per-i-diritti-connessi":
    "/artisti/quando-gli-artisti-maturano-il-compenso",
  "/quali-artisti-possono-dare-il-mandato": "/artisti/quali-artisti-possono-dare-il-mandato",
  "/cosa-fa-rete-artisti-spettacolo-per-gli-artisti-che-le-hanno-dato-il-mandato":
    "/artisti/cosa-fa-rete-artisti-spettacolo",
  "/regolamento-conferimento-mandato": "/artisti/regolamento-conferimento-mandato",
  "/regolamento-ripartizione-mandato-artisti": "/artisti/regolamento-ripartizione-musica",
  "/regolamento-ripartizione-artisti-video": "/artisti/regolamento-ripartizione-video",
  "/servizi-agli-artisti": "/servizi",
  "/servizi-artistici": "/servizi/servizi-artistici",
  "/servizi-burocratici": "/servizi/servizi-burocratici",
  "/servizi-per-gli-artisti": "/servizi",
  "/lista-accordi": "/accordi",
  "/codice-civile": "/norme/codice-civile",
  "/decreto-mibac-5-9-2018": "/norme/decreto-mibac-5-9-2018",
  "/decreto-mibac-26-2-2019": "/norme/decreto-mibac-26-2-2019",
  "/dpcm-del-15-07-1976": "/norme/dpcm-del-15-07-1976",
  "/dpcm-del-19-12-2012-requisiti-collecting": "/norme/dpcm-del-19-12-2012-requisiti-collecting",
  "/dl-64-del-30-04-2010-art-7": "/norme/dl-64-del-30-04-2010-art-7",
  "/legge-633-del-1941": "/norme/legge-633-del-1941",
  "/legge-93-del-05-02-1992": "/norme/legge-93-del-05-02-1992",
  "/dl-1-del-24-01-2012-art-39-liberalizzazione": "/norme/dl-1-del-24-01-2012-art-39-liberalizzazione",
  "/dl-22-del-21-02-2014": "/norme/dl-22-del-21-02-2014",
  "/dl-163-del-10-11-2014": "/norme/dl-163-del-10-11-2014",
  "/dpcm-del-02-02-2015": "/norme/dpcm-del-02-02-2015",
  "/dm-mibac-del-20-06-2014-compenso-copia-privata": "/norme/dm-mibac-del-20-06-2014-compenso-copia-privata",
  "/dpcm-del-17-01-2014": "/norme/dpcm-del-17-01-2014",
  "/dpcm-del-01-09-1975": "/norme/dpcm-del-01-09-1975",
  "/d-lgs-15-3-2017-in-attuazione-direttiva-2014-26-ue":
    "/norme/d-lgs-15-3-2017-in-attuazione-direttiva-2014-26-ue",
  "/direttiva-eu-mercato-unico-digitale": "/norme/direttiva-eu-mercato-unico-digitale",
  "/covid-19-sostegno-artisti-e-lavoratori-dello-spettacolo": "/norme/covid-19-sostegno-artisti",
  "/covid-19-sostegno-artisti-e-lavoratori-dello-spettacolo-2": "/norme/covid-19-sostegno-artisti",
  "/tariffe-diritti-connessi-video": "/utilizzatori/tariffe-diritti-connessi-video",
  "/elenco-opere-video-interpretate-da-artisti-rasi": "/utilizzatori/elenco-opere-video-interpretate",
  "/contratto-tipo-canale-tv-nazionale": "/utilizzatori/contratto-tipo-canale-tv-nazionale",
  "/contratto-tipo-piattaforme-tv-nazionali": "/utilizzatori/contratto-tipo-piattaforme-tv-nazionali",
  "/tariffe-diritti-connessi-musica": "/utilizzatori/tariffe-diritti-connessi-musica",
  "/elenco-opere-musicali-interpretate-da-artisti-rasi": "/utilizzatori/elenco-opere-musicali-interpretate",
  "/regolamento-attivita-di-promozione-e-patrocinio": "/promozione/regolamento-attivita-di-promozione",
  "/promozione": "/news",
  "/tp-artisti-in-azione": "/artisti-in-azione",
  "/tptyc": "/artisti-in-azione",
  "/mandato-artista-alla-rasi": "/mandato/artista",
  "/mandato-artista-minorenne-alla-rasi": "/mandato/minorenne",
  "/mandato-erede-artista-alla-r-a-s-i": "/mandato/erede",
  "/mandato-erede-minorenne-artista-alla-r-a-s-i": "/mandato/erede",
  "/scheda-repertorio": "/mandato/repertorio",
};

export function normalizeLegacyPath(pathname: string): string {
  let path = pathname.split("?")[0] || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/it") return "/";
  if (path.startsWith("/it/")) {
    path = path.slice(3) || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  }
  return path || "/";
}

export function resolveWpRedirect(pathname: string): string | null {
  const path = normalizeLegacyPath(pathname);
  if (AUTH_SOURCES.includes(path)) return "/auth";
  const mapped = FLAT_TO_NESTED[path];
  if (mapped) return mapped;
  return null;
}

export function nextRedirects(): Array<{
  source: string;
  destination: string;
  permanent: boolean;
}> {
  const rows: Array<{ source: string; destination: string; permanent: boolean }> = [];
  const seen = new Set<string>();

  const add = (source: string, destination: string) => {
    if (source === destination) return;
    if (seen.has(source)) return;
    seen.add(source);
    rows.push({ source, destination, permanent: true });
  };

  for (const source of AUTH_SOURCES) {
    add(source, "/auth");
    add(`/it${source}`, "/auth");
  }

  for (const [source, destination] of Object.entries(FLAT_TO_NESTED)) {
    add(source, destination);
    add(`/it${source}`, destination);
  }

  add("/it", "/");

  return rows;
}
