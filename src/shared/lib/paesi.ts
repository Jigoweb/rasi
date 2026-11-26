/**
 * Codici paese degli artisti (colonna artisti.codice_paese, valori separati da «/»).
 * La lista ufficiale è ISO 3166-1 alpha-3 (public/codici-paesi-iso3166-alpha3.json);
 * alcuni import anagrafici hanno salvato codici alpha-2 (JP, ES, RO) che
 * comparivano come doppioni (JP e JPN) e non erano eliminabili dalla maschera.
 */

export type Continente = 'Europa' | 'Asia' | 'Americhe' | 'Africa' | 'Oceania'

export const CONTINENTI: Continente[] = ['Europa', 'Asia', 'Americhe', 'Africa', 'Oceania']

const CODICI_PER_CONTINENTE: Record<Continente, string[]> = {
  Europa: [
    'ITA', 'FRA', 'DEU', 'GBR', 'ESP', 'BEL', 'NLD', 'CHE', 'AUT', 'SWE', 'NOR', 'DNK', 'FIN', 'POL',
    'PRT', 'GRC', 'IRL', 'CZE', 'HUN', 'ROU', 'BGR', 'HRV', 'ALB', 'SVK', 'SVN', 'EST', 'LVA', 'LTU',
    'RUS', 'UKR', 'BLR', 'MDA', 'LUX', 'MLT', 'CYP', 'ISL', 'LIE', 'MCO', 'SMR', 'VAT', 'AND',
  ],
  Asia: [
    'JPN', 'CHN', 'KOR', 'IND', 'TUR', 'ISR', 'ARE', 'SAU', 'SGP', 'MYS', 'THA', 'IDN', 'PHL', 'VNM',
    'GEO', 'ARM', 'AZE', 'KAZ', 'UZB', 'PAK', 'BGD', 'LKA', 'MMR', 'KHM', 'LAO', 'MNG', 'NPL', 'BTN',
    'AFG', 'IRN', 'IRQ', 'JOR', 'LBN', 'SYR', 'YEM', 'OMN', 'KWT', 'QAT', 'BHR',
  ],
  Americhe: [
    'USA', 'CAN', 'BRA', 'ARG', 'MEX', 'CHL', 'COL', 'PER', 'VEN', 'ECU', 'BOL', 'PRY', 'URY', 'CRI',
    'PAN', 'GTM', 'HND', 'NIC', 'SLV', 'CUB', 'DOM', 'JAM', 'HTI', 'TTO',
  ],
  Africa: [
    'ZAF', 'EGY', 'MAR', 'TUN', 'DZA', 'LBY', 'SDN', 'ETH', 'KEN', 'TZA', 'UGA', 'GHA', 'NGA', 'SEN',
    'CIV', 'CMR', 'AGO', 'MOZ', 'MDG', 'MUS', 'SYC',
  ],
  Oceania: ['AUS', 'NZL'],
}

const CONTINENTE_BY_CODICE = new Map<string, Continente>(
  CONTINENTI.flatMap(continente => CODICI_PER_CONTINENTE[continente].map(codice => [codice, continente] as const))
)

export function getContinente(codice: string): Continente | null {
  return CONTINENTE_BY_CODICE.get(codice.toUpperCase()) ?? null
}

export function getCodiciContinente(continente: Continente): string[] {
  return CODICI_PER_CONTINENTE[continente]
}

/** alpha-2 -> alpha-3 per i paesi della lista ufficiale. */
export const ALPHA2_TO_ALPHA3: Record<string, string> = {
  IT: 'ITA', FR: 'FRA', DE: 'DEU', GB: 'GBR', UK: 'GBR', ES: 'ESP', US: 'USA', CA: 'CAN', AU: 'AUS',
  BE: 'BEL', NL: 'NLD', CH: 'CHE', AT: 'AUT', SE: 'SWE', NO: 'NOR', DK: 'DNK', FI: 'FIN', PL: 'POL',
  PT: 'PRT', GR: 'GRC', IE: 'IRL', CZ: 'CZE', HU: 'HUN', RO: 'ROU', BG: 'BGR', HR: 'HRV', AL: 'ALB',
  SK: 'SVK', SI: 'SVN', EE: 'EST', LV: 'LVA', LT: 'LTU', JP: 'JPN', CN: 'CHN', KR: 'KOR', IN: 'IND',
  BR: 'BRA', AR: 'ARG', MX: 'MEX', RU: 'RUS', TR: 'TUR', ZA: 'ZAF', EG: 'EGY', IL: 'ISR', AE: 'ARE',
  SA: 'SAU', NZ: 'NZL', SG: 'SGP', MY: 'MYS', TH: 'THA', ID: 'IDN', PH: 'PHL', VN: 'VNM', UA: 'UKR',
  BY: 'BLR', MD: 'MDA', GE: 'GEO', AM: 'ARM', AZ: 'AZE', KZ: 'KAZ', UZ: 'UZB', CL: 'CHL', CO: 'COL',
  PE: 'PER', VE: 'VEN', EC: 'ECU', BO: 'BOL', PY: 'PRY', UY: 'URY', CR: 'CRI', PA: 'PAN', GT: 'GTM',
  HN: 'HND', NI: 'NIC', SV: 'SLV', CU: 'CUB', DO: 'DOM', JM: 'JAM', HT: 'HTI', TT: 'TTO', MA: 'MAR',
  TN: 'TUN', DZ: 'DZA', LY: 'LBY', SD: 'SDN', ET: 'ETH', KE: 'KEN', TZ: 'TZA', UG: 'UGA', GH: 'GHA',
  NG: 'NGA', SN: 'SEN', CI: 'CIV', CM: 'CMR', AO: 'AGO', MZ: 'MOZ', MG: 'MDG', MU: 'MUS', SC: 'SYC',
  PK: 'PAK', BD: 'BGD', LK: 'LKA', MM: 'MMR', KH: 'KHM', LA: 'LAO', MN: 'MNG', NP: 'NPL', BT: 'BTN',
  AF: 'AFG', IR: 'IRN', IQ: 'IRQ', JO: 'JOR', LB: 'LBN', SY: 'SYR', YE: 'YEM', OM: 'OMN', KW: 'KWT',
  QA: 'QAT', BH: 'BHR', LU: 'LUX', MT: 'MLT', CY: 'CYP', IS: 'ISL', LI: 'LIE', MC: 'MCO', SM: 'SMR',
  VA: 'VAT', AD: 'AND',
}

/** Un codice: maiuscolo, alpha-2 convertito in alpha-3 quando noto. */
export function normalizeCodicePaese(codice: string): string {
  const upper = codice.trim().toUpperCase()
  return ALPHA2_TO_ALPHA3[upper] ?? upper
}

/** Elenco di codici: normalizzati, senza vuoti e senza doppioni (ordine preservato). */
export function normalizeCodiciPaese(codici: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of codici) {
    const codice = normalizeCodicePaese(raw)
    if (!codice || seen.has(codice)) continue
    seen.add(codice)
    result.push(codice)
  }
  return result
}

/** Valore della colonna («JP/GBR») -> elenco normalizzato (["JPN", "GBR"]). */
export function parseCodicePaeseColumn(value: string | null | undefined): string[] {
  if (!value) return []
  return normalizeCodiciPaese(value.split('/'))
}
