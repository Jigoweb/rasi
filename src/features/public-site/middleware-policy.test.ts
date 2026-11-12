import { resolveMiddlewareRedirect } from "./middleware-policy";

describe("resolveMiddlewareRedirect", () => {
  it("keeps the public home visible for anonymous and logged-in visitors", () => {
    expect(resolveMiddlewareRedirect("/", null)).toBeNull();
    expect(resolveMiddlewareRedirect("/", { ruolo: "admin" })).toBeNull();
  });

  it("sends anonymous visitors away from the dashboard", () => {
    expect(resolveMiddlewareRedirect("/dashboard", null)).toBe("/auth");
    expect(resolveMiddlewareRedirect("/dashboard/cms", null)).toBe("/auth");
  });

  it("leaves /auth open unless the user is already signed in", () => {
    expect(resolveMiddlewareRedirect("/auth", null)).toBeNull();
    expect(resolveMiddlewareRedirect("/auth", { ruolo: "admin" })).toBe("/dashboard");
    expect(resolveMiddlewareRedirect("/auth/callback", { ruolo: "admin" })).toBeNull();
  });

  it("applies role walls inside the dashboard", () => {
    expect(resolveMiddlewareRedirect("/dashboard/cms", { ruolo: "operatore" })).toBe("/dashboard");
    expect(resolveMiddlewareRedirect("/dashboard/cms", { ruolo: "admin" })).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/opere", { ruolo: "artista" })).toBe(
      "/dashboard/profilo"
    );
    expect(
      resolveMiddlewareRedirect("/dashboard/opere", {
        ruolo: "artista",
        artistaId: null,
      })
    ).toBe("/dashboard/profilo");
    expect(
      resolveMiddlewareRedirect("/dashboard/profilo", {
        ruolo: "artista",
        artistaId: "11111111-1111-4111-8111-111111111111",
      })
    ).toBeNull();
  });

  it("keeps the tirocinante inside the Opere section", () => {
    const tirocinante = { ruolo: "tirocinante" };
    expect(resolveMiddlewareRedirect("/dashboard/opere", tirocinante)).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/opere/abc", tirocinante)).toBeNull();
    for (const path of [
      "/dashboard",
      "/dashboard/artisti",
      "/dashboard/artisti/abc",
      "/dashboard/programmazioni",
      "/dashboard/individuazioni",
      "/dashboard/ripartizioni",
      "/dashboard/utenti",
      "/dashboard/cms/pages",
      "/dashboard/opere-altro",
    ]) {
      expect(resolveMiddlewareRedirect(path, tirocinante)).toBe("/dashboard/opere");
    }
  });

  it("lets the operatore base read the database but not manage users or the CMS", () => {
    const base = { ruolo: "operatore_base" };
    expect(resolveMiddlewareRedirect("/dashboard", base)).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/artisti", base)).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/programmazioni", base)).toBeNull();
    expect(resolveMiddlewareRedirect("/dashboard/utenti", base)).toBe("/dashboard");
    expect(resolveMiddlewareRedirect("/dashboard/cms/pages", base)).toBe("/dashboard");
  });

  it("does not intercept other public routes", () => {
    expect(resolveMiddlewareRedirect("/contatti", null)).toBeNull();
    expect(resolveMiddlewareRedirect("/news/bando-rasi-2026", null)).toBeNull();
  });
});
