export type ArtistaNameParts = {
  nome?: string | null
  cognome?: string | null
  nome_arte?: string | null
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Nome artista uniforme per le individuazioni: «Cognome, Nome - Pseudonimo».
 * - senza pseudonimo: «Cognome, Nome»
 * - senza nome/cognome: solo «Pseudonimo»
 * - pseudonimo identico a nome e cognome: non viene ripetuto
 */
export function formatArtistaIndividuazione(
  artista: ArtistaNameParts | null | undefined,
  fallback = '-'
): string {
  if (!artista) return fallback

  const nome = clean(artista.nome)
  const cognome = clean(artista.cognome)
  const pseudonimo = clean(artista.nome_arte)

  const anagrafica = cognome && nome ? `${cognome}, ${nome}` : cognome || nome

  if (!pseudonimo) return anagrafica || fallback
  if (!anagrafica) return pseudonimo

  const pseudoKey = normalizeForCompare(pseudonimo)
  const isSameAsName =
    pseudoKey === normalizeForCompare(`${nome} ${cognome}`) ||
    pseudoKey === normalizeForCompare(`${cognome} ${nome}`)

  return isSameAsName ? anagrafica : `${anagrafica} - ${pseudonimo}`
}
