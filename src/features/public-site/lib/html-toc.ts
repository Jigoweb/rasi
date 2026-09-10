export type TocItem = { id: string; text: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function extractTocAndInjectIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  let index = 0;
  const nextHtml = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_all, level, attrs, inner) => {
    const text = String(inner).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return _all;
    const existing = String(attrs).match(/id=["']([^"']+)["']/);
    const id = existing?.[1] || `${slugify(text) || "sezione"}-${index++}`;
    toc.push({ id, text });
    if (existing) return `<h${level}${attrs}>${inner}</h${level}>`;
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
  return { html: nextHtml, toc };
}
