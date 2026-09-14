import { extractTocAndInjectIds } from "./html-toc";

describe("extractTocAndInjectIds", () => {
  it("builds a toc from h2/h3 and injects ids", () => {
    const { html, toc } = extractTocAndInjectIds(
      "<h2>Articolo 1</h2><p>testo</p><h3>Sede</h3>"
    );
    expect(toc.map((t) => t.text)).toEqual(["Articolo 1", "Sede"]);
    expect(html).toContain('id="articolo-1-0"');
    expect(html).toContain('id="sede-1"');
  });
});
