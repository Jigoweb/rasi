import { allowRequest, parseSubmission } from "./submission-schema";

describe("parseSubmission", () => {
  it("accepts a valid contact payload", () => {
    const result = parseSubmission({
      kind: "contatti",
      payload: {
        nome: "Anna",
        email: "anna@example.com",
        messaggio: "Vorrei informazioni sul mandato.",
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok && !result.honeypot) expect(result.kind).toBe("contatti");
  });

  it("swallows honeypot submissions", () => {
    const result = parseSubmission({
      kind: "contatti",
      website: "http://spam.test",
      payload: { nome: "x", email: "a@b.it", messaggio: "xxxxxxxxxx" },
    });
    expect(result).toEqual({ ok: true, honeypot: true });
  });

  it("rejects invalid email", () => {
    const result = parseSubmission({
      kind: "mandato",
      payload: { tipo: "artista", nome: "A", cognome: "B", email: "nope" },
    });
    expect(result.ok).toBe(false);
  });
});

describe("allowRequest", () => {
  it("rate-limits the same IP", () => {
    const ip = `test-${Math.random()}`;
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(allowRequest(ip, now + i)).toBe(true);
    }
    expect(allowRequest(ip, now + 10)).toBe(false);
    expect(allowRequest(ip, now + 11 * 60 * 1000)).toBe(true);
  });
});
