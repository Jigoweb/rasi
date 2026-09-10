export type NavLink = {
  label: string;
  href: string;
};

export type NavItem = NavLink & {
  children?: NavGroup[];
};

export type NavGroup = {
  label?: string;
  href?: string;
  items: NavLink[];
};

export const publicNav: NavItem[] = [
  {
    label: "RASI",
    href: "/",
    children: [
      {
        items: [
          { label: "Chi siamo", href: "/chi-siamo" },
          { label: "Inizio attività", href: "/chi-siamo/inizio-attivita" },
          { label: "Statuto", href: "/chi-siamo/statuto" },
          { label: "Privacy Policy", href: "/chi-siamo/privacy-policy" },
          { label: "Personal Data Policy", href: "/chi-siamo/personal-data-policy" },
          { label: "Procedure di trattamento dei reclami", href: "/chi-siamo/procedure-di-trattamento-dei-reclami" },
          { label: "Organi sociali", href: "/chi-siamo/organi-sociali" },
          { label: "Regolamento adesione", href: "/chi-siamo/regolamento-adesione" },
          { label: "Relazione di trasparenza", href: "/chi-siamo/relazione-di-trasparenza" },
          { label: "Linee di condotta", href: "/chi-siamo/linee-di-condotta" },
        ],
      },
    ],
  },
  {
    label: "Artisti",
    href: "/artisti",
    children: [
      {
        items: [
          { label: "Quando maturano i compensi?", href: "/artisti/quando-gli-artisti-maturano-il-compenso" },
          { label: "Quali artisti possono dare il mandato?", href: "/artisti/quali-artisti-possono-dare-il-mandato" },
          { label: "Cosa fa R.A.S.I. per i mandanti?", href: "/artisti/cosa-fa-rete-artisti-spettacolo" },
          { label: "Regolamento conferimento mandato", href: "/artisti/regolamento-conferimento-mandato" },
          { label: "Regolamento ripartizione (musica)", href: "/artisti/regolamento-ripartizione-musica" },
          { label: "Regolamento ripartizione (video)", href: "/artisti/regolamento-ripartizione-video" },
        ],
      },
    ],
  },
  {
    label: "Servizi",
    href: "/servizi",
    children: [
      {
        items: [
          { label: "Servizi artistici", href: "/servizi/servizi-artistici" },
          { label: "Servizi burocratici", href: "/servizi/servizi-burocratici" },
          { label: "Artisti in azione", href: "/artisti-in-azione" },
        ],
      },
    ],
  },
  {
    label: "Accordi",
    href: "/accordi",
  },
  {
    label: "Norme",
    href: "/norme",
    children: [
      {
        label: "Nazionali",
        items: [
          { label: "Codice Civile", href: "/norme/codice-civile" },
          { label: "Decreto Mibac 5/9/2018", href: "/norme/decreto-mibac-5-9-2018" },
          { label: "Decreto Mibac 26/2/2019", href: "/norme/decreto-mibac-26-2-2019" },
          { label: "DPCM 15/07/1976", href: "/norme/dpcm-del-15-07-1976" },
          { label: "DPCM 19/12/2012 Requisiti Collecting", href: "/norme/dpcm-del-19-12-2012-requisiti-collecting" },
          { label: "DL 64/2010 Art.7", href: "/norme/dl-64-del-30-04-2010-art-7" },
          { label: "Legge 633/1941", href: "/norme/legge-633-del-1941" },
          { label: "Legge 93/1992", href: "/norme/legge-93-del-05-02-1992" },
          { label: "DL 1/2012 Art.39", href: "/norme/dl-1-del-24-01-2012-art-39-liberalizzazione" },
          { label: "DL 22/2014", href: "/norme/dl-22-del-21-02-2014" },
          { label: "DL 163/2014", href: "/norme/dl-163-del-10-11-2014" },
          { label: "DPCM 02/02/2015", href: "/norme/dpcm-del-02-02-2015" },
          { label: "DM Mibac 20/06/2014 Copia privata", href: "/norme/dm-mibac-del-20-06-2014-compenso-copia-privata" },
          { label: "DPCM 17/01/2014", href: "/norme/dpcm-del-17-01-2014" },
          { label: "DPCM 01/09/1975", href: "/norme/dpcm-del-01-09-1975" },
        ],
      },
      {
        label: "Internazionali",
        items: [
          { label: "D.Lgs. 15/3/2017 (dir. 2014/26/UE)", href: "/norme/d-lgs-15-3-2017-in-attuazione-direttiva-2014-26-ue" },
          { label: "Direttiva EU Mercato Unico Digitale", href: "/norme/direttiva-eu-mercato-unico-digitale" },
        ],
      },
      {
        label: "Giurisprudenza",
        items: [
          { label: "Covid 19 – Sostegno artisti", href: "/norme/covid-19-sostegno-artisti" },
        ],
      },
    ],
  },
  {
    label: "Utilizzatori",
    href: "/utilizzatori",
    children: [
      {
        label: "Video",
        items: [
          { label: "Tariffe diritti connessi video", href: "/utilizzatori/tariffe-diritti-connessi-video" },
          { label: "Elenco opere video", href: "/utilizzatori/elenco-opere-video-interpretate" },
          { label: "Contratto tipo Canale TV", href: "/utilizzatori/contratto-tipo-canale-tv-nazionale" },
          { label: "Contratto tipo Piattaforme TV", href: "/utilizzatori/contratto-tipo-piattaforme-tv-nazionali" },
        ],
      },
      {
        label: "Musica",
        items: [
          { label: "Tariffe diritti connessi musica", href: "/utilizzatori/tariffe-diritti-connessi-musica" },
          { label: "Elenco opere musicali", href: "/utilizzatori/elenco-opere-musicali-interpretate" },
        ],
      },
    ],
  },
  {
    label: "Promozione",
    href: "/news",
    children: [
      {
        items: [
          { label: "News e bandi", href: "/news" },
          { label: "Regolamento attività di promozione", href: "/promozione/regolamento-attivita-di-promozione" },
          { label: "Bando “Sotto lo stesso tetto”", href: "/news/bando-sotto-lo-stesso-tetto" },
          { label: "Artisti in azione", href: "/artisti-in-azione" },
        ],
      },
    ],
  },
  {
    label: "Modulistica",
    href: "/modulistica",
  },
  {
    label: "Contatti",
    href: "/contatti",
  },
];

export const footerNav = {
  istituzionale: [
    { label: "Chi siamo", href: "/chi-siamo" },
    { label: "Statuto", href: "/chi-siamo/statuto" },
    { label: "Privacy Policy", href: "/chi-siamo/privacy-policy" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Trasparenza", href: "/chi-siamo/relazione-di-trasparenza" },
  ],
  servizi: [
    { label: "Servizi agli artisti", href: "/servizi" },
    { label: "Modulistica", href: "/modulistica" },
    { label: "News e bandi", href: "/news" },
    { label: "Dai il mandato", href: "/mandato/artista" },
  ],
};
