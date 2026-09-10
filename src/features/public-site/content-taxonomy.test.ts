import { classifyLegacySlug } from "./content-taxonomy";

describe("classifyLegacySlug", () => {
  it("sends norme texts to pages, not news", () => {
    expect(classifyLegacySlug("legge-633-del-1941")).toEqual({
      table: "pages",
      category: "norme",
      slug: "legge-633-del-1941",
    });
  });

  it("sends utilizzatori documents to pages", () => {
    expect(classifyLegacySlug("contratto-tipo-canale-tv-nazionale")).toEqual({
      table: "pages",
      category: "utilizzatori",
      slug: "contratto-tipo-canale-tv-nazionale",
    });
  });

  it("ignores mandato form permalinks", () => {
    expect(classifyLegacySlug("mandato-artista-alla-rasi")).toEqual({ table: "ignore" });
  });

  it("keeps current-affairs posts as news", () => {
    expect(classifyLegacySlug("bando-rasi-2026")).toEqual({
      table: "bandi_news",
      slug: "bando-rasi-2026",
    });
  });
});
