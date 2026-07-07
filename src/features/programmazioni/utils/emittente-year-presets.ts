import type { YearFieldsPolicy } from './year-policy'

const RILASCIO = (sources: string[]): YearFieldsPolicy => ({
  rilascio: { sources },
})

const RILASCIO_PRODUZIONE = (rilascio: string[], produzione: string[]): YearFieldsPolicy => ({
  rilascio: { sources: rilascio },
  produzione: { sources: produzione },
})

/**
 * Policy anno predefinite per emittente (nome esatto tabella emittenti).
 * rilascio = messa in onda storica; produzione = fine produzione (TIM).
 */
export const EMITTENTE_YEAR_PRESETS: Record<string, YearFieldsPolicy> = {
  NETFLIX: RILASCIO(['release_year']),
  'TIM VISION SVOD': RILASCIO_PRODUZIONE(
    ['ANNO_RILASCIO_ITALIA', 'ANNO_RILASCIO'],
    ['ANNO_DI_RIFERIMENTO'],
  ),
  'TIM VISION TVOD': RILASCIO_PRODUZIONE(
    ['ANNO_RILASCIO_ITALIA', 'ANNO_RILASCIO'],
    ['ANNO_DI_RIFERIMENTO'],
  ),
  'DISNEY PLUS': RILASCIO(['PRODUCTION_YEAR']),
  'RAKUTEN TVOD': RILASCIO(['CONTENT_YEAR']),
  'RAKUTEN AVOD': RILASCIO(['CONTENT_YEAR']),
  RAI: RILASCIO(['Anno', 'ANNO PROD', 'Anno produzione', 'Anno di produzione']),
  'RAI GENERALISTE': RILASCIO(['Anno', 'ANNO PROD', 'Anno produzione']),
  'RAI TEMATICHE': RILASCIO(['Anno', 'ANNO PROD', 'Anno produzione']),
  SKY: RILASCIO(['ANNO PROD', 'Anno produzione', 'Anno di produzione']),
  'RTI GENERALISTE': RILASCIO(['Anno', 'ANNO DI PRODUZIONE']),
  'RTI LINEARI': RILASCIO(['Anno', 'ANNO DI PRODUZIONE']),
  'RTI NON LINEARI': RILASCIO(['Anno', 'ANNO DI PRODUZIONE']),
  'RTI ALTRI CANALI': RILASCIO(['Anno', 'ANNO DI PRODUZIONE']),
  'AMAZON SVOD': RILASCIO(['production_year']),
  'AMAZON SVOD STANDALONE': RILASCIO(['production_year']),
  'AMAZON CHANNELS': RILASCIO(['production_year']),
  'AMAZON TVOD': RILASCIO(['production_year']),
  'APPLE TV SVOD': RILASCIO(['Year Of Production', 'Year of Production']),
  'APPLE TV TVOD': RILASCIO(['Year Of Production', 'Year of Production']),
  'CHILI AVOD': RILASCIO(['Year of Production']),
  'CHILI TVOD': RILASCIO(['Year Of Production']),
  'PARAMOUNT PLUS': RILASCIO(['Year', 'PRODUCTION_YEAR']),
  'PLUTO TV': RILASCIO(['Year', 'Anno']),
  DISCOVERY: RILASCIO(['Anno produzione', 'ANNO DI PRODUZIONE']),
  VIACOM: RILASCIO(['Anno', 'ANNO DI PRODUZIONE']),
  'LA7-LA7D': RILASCIO(['Anno di produzione', 'Anno']),
  TV2000: RILASCIO(['Anno di produzione']),
  'TV LOCALI': RILASCIO(['Anno di produzione', 'Anno']),
  'ITALO LIVE': RILASCIO(['ANNO', 'Anno']),
}

export function getYearPolicyForEmittente(emittenteName?: string | null): YearFieldsPolicy | null {
  if (!emittenteName) return null
  return EMITTENTE_YEAR_PRESETS[emittenteName] ?? null
}

/** Inferisce policy dal mapping 1:1 quando manca preset esplicito. */
export function inferYearPolicyFromMapping(
  mapping: Record<string, string>,
  emittenteName?: string | null,
): YearFieldsPolicy | null {
  const preset = getYearPolicyForEmittente(emittenteName)
  if (preset) return preset

  const annoSource = Object.entries(mapping).find(([, target]) => target === 'anno')?.[0]
  if (!annoSource) return null
  return { rilascio: { sources: [annoSource] } }
}
