import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Coins, Scale, Users } from "lucide-react";

export type SettoreBenefit = {
  icon: LucideIcon;
  title: string;
  body: string;
  color: string;
};

export type SettoreFaq = {
  q: string;
  a: string;
};

export type SettoreDocumentLink = {
  label: string;
  href: string;
};

export type SettoreArtistiContent = {
  heroTitle: string;
  heroSubtitle: string;
  benefits: SettoreBenefit[];
  faq: SettoreFaq[];
  documents: SettoreDocumentLink[];
};

const DOCUMENTI_COMUNI: SettoreDocumentLink[] = [
  {
    label: "Regolamento conferimento mandato produttori",
    href: "/modulistica",
  },
  {
    label: "Informativa trattamento dati personali",
    href: "/modulistica",
  },
  {
    label: "Schede repertorio",
    href: "/modulistica",
  },
];

const FAQ_QUANDO_VIDEO: SettoreFaq = {
  q: "Quando matura il compenso?",
  a: "Hai diritto a un compenso per i diritti connessi — distinti dal diritto d'autore — quando un'opera audiovisiva in cui hai interpretato, anche in un ruolo non primario, viene trasmessa in televisione, via cavo o satellite, diffusa in luoghi pubblici o utilizzata in altro modo pubblicamente. Rientrano film, telefilm, serie TV, soap opera, documentari, cortometraggi e opere d'animazione già registrate su supporto videografico. Gli artisti hanno inoltre diritto al compenso per copia privata, dovuto da chi fabbrica o importa supporti vergini e dispositivi di registrazione: le tariffe e i tipi di supporti sono stabiliti per decreto.",
};

const FAQ_QUANDO_MUSICA: SettoreFaq = {
  q: "Quando matura il compenso?",
  a: "Hai diritto a un compenso per i diritti connessi — distinti dal diritto d'autore — quando un brano già registrato su supporto fonografico (CD, file digitale, streaming, mobile) in cui compare la tua interpretazione o esecuzione, anche come artista non primario, viene trasmesso da un'emittente radiofonica o televisiva, diffuso in luoghi pubblici o utilizzato in altro modo pubblicamente. Gli artisti hanno inoltre diritto al compenso per copia privata, dovuto da chi fabbrica o importa supporti vergini e dispositivi di registrazione: le tariffe e i tipi di supporti sono stabiliti per decreto.",
};

const FAQ_CHI_PUO: SettoreFaq = {
  q: "Chi può dare il mandato?",
  a: "Possono aderire artisti primari e comprimari: cantanti, attori, attrici, doppiatori, interpreti ed esecutori musicali e audiovisivi, direttori d'orchestra e di coro, musicisti e orchestrali. Dare mandato a RASI non costa nulla.",
};

const FAQ_COSA_FA: SettoreFaq = {
  q: "Cosa fa RASI per chi ha dato il mandato?",
  a: "RASI è iscritta all'elenco AGCOM degli organismi autorizzati a incassare e ripartire i diritti connessi degli artisti, ai sensi della legge 633/1941. Su mandato firmato, negozia accordi con gli utilizzatori, incassa i compensi riferiti alle opere trasmesse in Italia e all'estero, li ripartisce tra gli artisti aventi diritto e conserva il repertorio di ciascun mandante in un archivio online accessibile con credenziali personali. Tratteniamo una commissione del 10% solo sui diritti effettivamente incassati.",
};

const VANTAGGI_COMUNI: Pick<SettoreBenefit, "icon" | "title" | "color">[] = [
  {
    icon: Scale,
    title: "RASI interviene al tuo posto",
    color: "text-rasi-logo-indigo",
  },
  {
    icon: BadgeCheck,
    title: "Riconosciuta e autorizzata dalla legge",
    color: "text-rasi-logo-cyan",
  },
  {
    icon: Users,
    title: "L'incasso collettivo conviene",
    color: "text-rasi-logo-magenta",
  },
];

export const SETTORE_VIDEO: SettoreArtistiContent = {
  heroTitle: "Lavori nel settore video?",
  heroSubtitle:
    "Se hai interpretato un ruolo in un'opera cinematografica o televisiva trasmessa in Italia o all'estero, RASI gestisce i tuoi diritti connessi.",
  benefits: [
    {
      icon: Coins,
      title: "Ti spetta un compenso",
      body: "Ogni volta che film, telefilm, serie TV, soap opera, documentari, cortometraggi o opere d'animazione in cui hai interpretato — anche in un ruolo non primario — vengono trasmessi da un'emittente o diffusi pubblicamente, ti spetta un compenso dovuto dagli utilizzatori.",
      color: "text-rasi-ember",
    },
    {
      ...VANTAGGI_COMUNI[0],
      body: "Su mandato firmato, RASI ricerca, richiede, incassa e liquida i compensi al posto tuo, così non devi occupartene da solo.",
    },
    {
      ...VANTAGGI_COMUNI[1],
      body: "RASI è inserita nell'elenco AGCOM delle imprese abilitate all'intermediazione e all'amministrazione dei diritti connessi al diritto d'autore.",
    },
    {
      ...VANTAGGI_COMUNI[2],
      body: "I compensi vengono incassati collettivamente: se ogni artista agisse da solo, i costi supererebbero spesso l'importo dovuto.",
    },
  ],
  faq: [FAQ_QUANDO_VIDEO, FAQ_CHI_PUO, FAQ_COSA_FA],
  documents: [
    {
      label: "Regolamento ripartizione artisti (Audiovisivo)",
      href: "/modulistica",
    },
    ...DOCUMENTI_COMUNI,
  ],
};

export const SETTORE_MUSICA: SettoreArtistiContent = {
  heroTitle: "Lavori nel settore musica?",
  heroSubtitle:
    "Se sei cantante, musicista, orchestrale, corista, direttore o strumentista — anche in un gruppo — e la tua interpretazione è stata trasmessa, RASI gestisce i tuoi diritti connessi.",
  benefits: [
    {
      icon: Coins,
      title: "Ti spetta un compenso",
      body: "Ogni volta che un brano già registrato su supporto fonografico in cui compare la tua interpretazione o esecuzione — anche come artista non primario — viene trasmesso da un'emittente o diffuso pubblicamente, ti spetta un compenso dovuto dagli utilizzatori.",
      color: "text-rasi-ember",
    },
    {
      ...VANTAGGI_COMUNI[0],
      body: "Su mandato firmato, RASI ricerca, richiede, incassa e liquida i compensi al posto tuo, così non devi occupartene da solo.",
    },
    {
      ...VANTAGGI_COMUNI[1],
      body: "RASI è inserita nell'elenco AGCOM delle imprese abilitate all'intermediazione e all'amministrazione dei diritti connessi al diritto d'autore.",
    },
    {
      ...VANTAGGI_COMUNI[2],
      body: "I compensi vengono incassati collettivamente: se ogni artista agisse da solo, i costi supererebbero spesso l'importo dovuto.",
    },
  ],
  faq: [FAQ_QUANDO_MUSICA, FAQ_CHI_PUO, FAQ_COSA_FA],
  documents: [
    {
      label: "Regolamento ripartizione artisti (Musica)",
      href: "/modulistica",
    },
    {
      label: "Regolamento ripartizione artisti (Audiovisivo)",
      href: "/modulistica",
    },
    ...DOCUMENTI_COMUNI,
  ],
};
