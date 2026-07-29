const WP = "https://www.reteartistispettacolo.it/wp-content/uploads";

export type LegacyDocument = {
  title: string;
  url: string;
};

/** PDF e link esterni noti dal vecchio sito WordPress, per slug CMS. */
export const LEGACY_PAGE_DOCUMENTS: Record<string, Record<string, LegacyDocument[]>> = {
  "chi-siamo": {
    statuto: [{ title: "Statuto RASI", url: `${WP}/Statuto_Rasi.pdf` }],
    "regolamento-adesione": [{ title: "Regolamento di adesione", url: `${WP}/Regolamento-Adesione.pdf` }],
    "relazione-di-trasparenza": [
      { title: "Relazione di trasparenza 2024", url: `${WP}/2024-Relazione-di-Trasparenza-RASI.pdf` },
      { title: "Relazione di trasparenza 2023", url: `${WP}/2023_Relazione_di_Trasparenza.pdf` },
      { title: "Relazione di trasparenza 2022", url: `${WP}/2022_Relazione_di_Trasparenza.pdf` },
      { title: "Relazione di trasparenza 2021", url: `${WP}/2021_Relazione_di_trasparenza.pdf` },
      { title: "Relazione di trasparenza 2020", url: `${WP}/2020_Relazione_di_trasparenza.pdf` },
      { title: "Relazione di trasparenza 2019", url: `${WP}/2019_Relazione_di_trasparenza.pdf` },
    ],
  },
  norme: {
    "d-lgs-15-3-2017-in-attuazione-direttiva-2014-26-ue": [
      { title: "D.Lgs. 15 marzo 2017", url: `${WP}/dl15032017.pdf` },
    ],
    "decreto-mibac-26-2-2019": [
      { title: "Decreto MIBAC 26 febbraio 2019", url: `${WP}/Decreto_Mibac_26022019.pdf` },
    ],
    "decreto-mibac-5-9-2018": [
      { title: "Decreto MIBAC 5 settembre 2018", url: `${WP}/dmibac05092018.pdf` },
    ],
    "direttiva-eu-mercato-unico-digitale": [
      { title: "Direttiva UE Mercato Unico Digitale", url: `${WP}/direttivaeu_mercato_unico_digitale.pdf` },
    ],
    "dl-1-del-24-01-2012-art-39-liberalizzazione": [
      { title: "DL 1 del 24 gennaio 2012 – Art. 39", url: `${WP}/DL-1-del-24-gen-2012-Art-39-Liberalizzazione.pdf` },
    ],
    "dl-163-del-10-11-2014": [
      { title: "DL 163 del 10 novembre 2014", url: `${WP}/DL-163-del-10-nov-2014.pdf` },
    ],
    "dl-22-del-21-02-2014": [
      { title: "DL 22 del 21 febbraio 2014", url: `${WP}/DL-22-del-2-febbraio-2014.pdf` },
    ],
    "dl-64-del-30-04-2010-art-7": [
      { title: "DL 64 del 30 aprile 2010 – Art. 7", url: `${WP}/DL-64-del-30-aprile-2014-ART-7.pdf` },
    ],
    "dm-mibac-del-20-06-2014-compenso-copia-privata": [
      { title: "DM MIBAC 20 giugno 2014 – Compenso copia privata", url: `${WP}/Mibac-DM-20-giugno-2014-Compenso-Copia-Privata.pdf` },
    ],
    "dpcm-del-01-09-1975": [
      { title: "DPCM 1 settembre 1975", url: `${WP}/DPCM-1-settembre-1975.pdf` },
    ],
    "dpcm-del-02-02-2015": [
      { title: "DPCM 2 febbraio 2015", url: `${WP}/DPCM-2-febbraio-2015.pdf` },
    ],
    "dpcm-del-15-07-1976": [
      { title: "DPCM 15 luglio 1976", url: `${WP}/DPCM-15-luglio-1976.pdf` },
    ],
    "dpcm-del-17-01-2014": [
      { title: "DPCM 17 gennaio 2014", url: `${WP}/DPCM-17-gennaio-2014.pdf` },
    ],
    "dpcm-del-19-12-2012-requisiti-collecting": [
      { title: "DPCM 19 dicembre 2012 – Requisiti collecting", url: `${WP}/DPCM-19-DIC-2012-Requisiti-Collecting.pdf` },
    ],
    "legge-93-del-05-02-1992": [
      { title: "Legge 93 del 5 febbraio 1992", url: `${WP}/Legge-93-del-5-febbraio-1992.pdf` },
    ],
    "legge-633-del-1941": [
      {
        title: "Legge 22 aprile 1941, n. 633 (testo vigente su Normattiva)",
        url: "https://www.normattiva.it/do/atto/vediPermalink?atto.dataPubblicazioneGazzetta=1941-04-27&atto.codiceRedazionale=041U0633",
      },
    ],
    "codice-civile": [
      {
        title: "Codice civile (testo vigente su Normattiva)",
        url: "https://www.normattiva.it/do/atto/vediPermalink?atto.dataPubblicazioneGazzetta=1942-04-04&atto.codiceRedazionale=042U0262",
      },
    ],
    "covid-19-sostegno-artisti": [
      { title: "Avviso pubblico fondo emergenza Covid spettacolo", url: `${WP}/avviso_pubblico_fondo_emergenza_covid_spettacolo.pdf` },
      { title: "Art. 185 Decreto Rilancio", url: `${WP}/Art.185_Decreto_Rilancio.pdf` },
      { title: "Decreto Rilancio – quadro sintesi Cultura e Spettacolo", url: `${WP}/Decreto_Rilancio_quadro_sintesi_Cultura_Spettacolo.pdf` },
      { title: "Misura 2", url: `${WP}/misura_2_.pdf` },
      { title: "Misura 5", url: `${WP}/misura_5_.pdf` },
      { title: "Interventi per lo Spettacolo – Camera dei Deputati (aprile 2020)", url: `${WP}/IT_Camera_dei_deputati_Interventi_per_lo_Spettacolo_Aprile_2020.pdf` },
    ],
  },
};

export function getLegacyDocuments(category: string, slug: string): LegacyDocument[] {
  return LEGACY_PAGE_DOCUMENTS[category]?.[slug] ?? [];
}
