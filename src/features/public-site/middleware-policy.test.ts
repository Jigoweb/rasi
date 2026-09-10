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
  });

  it("does not intercept other public routes", () => {
    expect(resolveMiddlewareRedirect("/contatti", null)).toBeNull();
    expect(resolveMiddlewareRedirect("/news/bando-rasi-2026", null)).toBeNull();
  });
});
