export const SITE_NAME = "R.A.S.I.";
export const SITE_LEGAL_NAME = "Rete Artisti Spettacolo per l'Innovazione";
export const SITE_TAGLINE =
  "Organismo di gestione collettiva dei diritti connessi al diritto d'autore. Soc.Coop. a.r.l. senza scopo di lucro.";

export const SITE_CONTACTS = {
  address: "Via Po 43, 00198 Roma",
  addressShort: "Via Po n.43 - 00198 Roma",
  phone: "+39 06 94364413",
  phoneHref: "tel:+390694364413",
  phoneAlt: "+39 06 94359833",
  phoneAltHref: "tel:+390694359833",
  mobile: "+39 331 3656274",
  mobileHref: "tel:+393313656274",
  whatsappHref: "https://wa.me/393313656274",
  email: "info@reteartistispettacolo.it",
  emailHref: "mailto:info@reteartistispettacolo.it",
  pec: "rasi@pec.reteartistispettacolo.it",
  pecHref: "mailto:rasi@pec.reteartistispettacolo.it",
  pecUtilizzatori: "reteartistispettacolo@pec.it",
  pecUtilizzatoriHref: "mailto:reteartistispettacolo@pec.it",
  hours: "Lun - Ven 09:00 - 18:00",
} as const;

export const SITE_LEGAL = {
  codiceFiscale: "97690690587",
  partitaIva: "IT13451801008",
  codiceUnivoco: "KRRH6B9",
  rea: "RM 1523103",
  alboCoop: "C123721",
} as const;

export const SITE_SOCIAL = {
  facebook: "https://www.facebook.com/RASInnovazione/",
  twitter: "https://twitter.com/RASInnovazione",
  instagram: "https://www.instagram.com/rasi.official/",
  youtube: "https://www.youtube.com/channel/UC7cE0v-hb-IcPWavi5CPDYg",
} as const;

export const AWARD_SYSTEM_URL = "https://award.reteartistispettacolo.com/it/";

export const HOME_KPI = {
  artisti: { value: "2542", label: "Artisti mandanti" },
  opere: { value: "41592", label: "Opere interpretate" },
  diritti: { value: "€491.626", label: "Diritti gestiti nell'anno precedente" },
  azioni: { value: "1384", label: "Azioni a tutela degli artisti" },
} as const;
