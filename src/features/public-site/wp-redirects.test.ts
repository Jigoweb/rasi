import { nextRedirects, normalizeLegacyPath, resolveWpRedirect } from "./wp-redirects";

describe("normalizeLegacyPath", () => {
  it("strips trailing slash and /it prefix", () => {
    expect(normalizeLegacyPath("/it/statuto/")).toBe("/statuto");
    expect(normalizeLegacyPath("/it")).toBe("/");
    expect(normalizeLegacyPath("/statuto?x=1")).toBe("/statuto");
  });
});

describe("resolveWpRedirect", () => {
  it("maps flat institutional permalinks to nested routes", () => {
    expect(resolveWpRedirect("/statuto")).toBe("/chi-siamo/statuto");
    expect(resolveWpRedirect("/it/statuto/")).toBe("/chi-siamo/statuto");
    expect(resolveWpRedirect("/legge-633-del-1941")).toBe("/norme/legge-633-del-1941");
  });

  it("sends WordPress auth routes to /auth", () => {
    expect(resolveWpRedirect("/login")).toBe("/auth");
    expect(resolveWpRedirect("/it/register")).toBe("/auth");
    expect(resolveWpRedirect("/members")).toBe("/auth");
  });

  it("maps mandato permalinks", () => {
    expect(resolveWpRedirect("/mandato-artista-alla-rasi")).toBe("/mandato/artista");
  });

  it("returns null when the path is already canonical", () => {
    expect(resolveWpRedirect("/chi-siamo/statuto")).toBeNull();
    expect(resolveWpRedirect("/contatti")).toBeNull();
  });
});

describe("nextRedirects", () => {
  it("emits permanent redirects for /it and flat slugs", () => {
    const rows = nextRedirects();
    expect(rows.find((r) => r.source === "/statuto")?.destination).toBe("/chi-siamo/statuto");
    expect(rows.find((r) => r.source === "/it/statuto")?.destination).toBe("/chi-siamo/statuto");
    expect(rows.find((r) => r.source === "/it")?.destination).toBe("/");
    expect(rows.every((r) => r.permanent)).toBe(true);
  });
});
