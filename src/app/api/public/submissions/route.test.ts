import { parseSubmission } from "@/features/public-site/forms/submission-schema";

describe("public submissions contract", () => {
  it("accepts a mandato payload used by the API", () => {
    const parsed = parseSubmission({
      kind: "mandato",
      payload: {
        tipo: "artista",
        nome: "Luca",
        cognome: "Bianchi",
        email: "luca@example.com",
        codice_fiscale: "BNCLCU80A01H501X",
      },
    });
    expect(parsed.ok && !parsed.honeypot && parsed.kind === "mandato").toBe(true);
  });

  it("does not persist honeypot traffic", () => {
    const parsed = parseSubmission({
      kind: "promozione",
      website: "bot",
      payload: {
        nome: "Bot",
        email: "bot@example.com",
        titolo_opera: "Spam",
      },
    });
    expect(parsed).toEqual({ ok: true, honeypot: true });
  });
});
