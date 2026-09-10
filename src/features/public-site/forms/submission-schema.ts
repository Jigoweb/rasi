import { z } from "zod";

export const MANDATO_TIPI = [
  "artista",
  "minorenne",
  "rappresentante",
  "produttore",
  "erede",
  "internazionale",
  "repertorio",
] as const;

export type MandatoTipo = (typeof MANDATO_TIPI)[number];

export const contactPayloadSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio").max(200),
  email: z.string().trim().email("Email non valida"),
  telefono: z.string().trim().max(40).optional().or(z.literal("")),
  messaggio: z.string().trim().min(10, "Messaggio troppo breve").max(4000),
});

export const mandatoPayloadSchema = z.object({
  tipo: z.enum(MANDATO_TIPI),
  nome: z.string().trim().min(1).max(200),
  cognome: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  telefono: z.string().trim().max(40).optional().or(z.literal("")),
  codice_fiscale: z.string().trim().max(16).optional().or(z.literal("")),
  note: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const promozionePayloadSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  titolo_opera: z.string().trim().min(1).max(300),
  descrizione: z.string().trim().max(4000).optional().or(z.literal("")),
  file_url: z.string().url().optional().or(z.literal("")),
});

export const submissionRequestSchema = z.object({
  kind: z.enum(["contatti", "mandato", "promozione"]),
  website: z.string().optional(),
  payload: z.unknown(),
});

export function parseSubmission(body: unknown):
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; kind: "contatti" | "mandato" | "promozione"; payload: Record<string, unknown> }
  | { ok: false; error: string } {
  const parsed = submissionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "Richiesta non valida" };
  }
  if (parsed.data.website && String(parsed.data.website).trim()) {
    return { ok: true, honeypot: true };
  }

  if (parsed.data.kind === "contatti") {
    const payload = contactPayloadSchema.safeParse(parsed.data.payload);
    if (!payload.success) return { ok: false, error: payload.error.issues[0]?.message || "Dati contatto non validi" };
    return { ok: true, honeypot: false, kind: "contatti", payload: payload.data };
  }
  if (parsed.data.kind === "mandato") {
    const payload = mandatoPayloadSchema.safeParse(parsed.data.payload);
    if (!payload.success) return { ok: false, error: payload.error.issues[0]?.message || "Dati mandato non validi" };
    return { ok: true, honeypot: false, kind: "mandato", payload: payload.data };
  }
  const payload = promozionePayloadSchema.safeParse(parsed.data.payload);
  if (!payload.success) return { ok: false, error: payload.error.issues[0]?.message || "Dati promozione non validi" };
  return { ok: true, honeypot: false, kind: "promozione", payload: payload.data };
}

const rateBuckets = new Map<string, number[]>();

export function allowRequest(ip: string, now = Date.now(), windowMs = 10 * 60 * 1000, max = 5): boolean {
  const recent = (rateBuckets.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    rateBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return true;
}

export const MANDATO_LABELS: Record<MandatoTipo, string> = {
  artista: "Mandato artista",
  minorenne: "Mandato artista minorenne",
  rappresentante: "Mandato per rappresentante",
  produttore: "Mandato produttore",
  erede: "Mandato erede",
  internazionale: "Mandato artista internazionale",
  repertorio: "Schede repertorio",
};
