const HTML_ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#8217;": "'",
  "&#8216;": "'",
  "&#8220;": '"',
  "&#8221;": '"',
  "&#8211;": "-",
  "&#8212;": "-",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
};

function decodeEntities(text: string) {
  return text.replace(/&[a-z#0-9]+;/gi, (match) => HTML_ENTITY_MAP[match] ?? match);
}

/**
 * The bandi_news.content field stores full scraped WordPress pages (head, nested
 * sticky header, sidebar widgets, footer), not just the article body. Rendering it
 * raw via dangerouslySetInnerHTML embeds an entire nested page inside ours. This
 * trims the obvious header/footer wrapper and returns plain-text paragraphs instead
 * of re-rendering the original markup.
 */
export function extractArticleParagraphs(html: string): string[] {
  if (!html) return [];

  let body = html;
  const lastHeaderClose = body.toLowerCase().lastIndexOf("</header>");
  if (lastHeaderClose !== -1) {
    body = body.slice(lastHeaderClose + "</header>".length);
  }
  const footerOpen = body.toLowerCase().indexOf("<footer");
  if (footerOpen !== -1) {
    body = body.slice(0, footerOpen);
  }

  const withBreaks = body
    .replace(/<(p|div|li|br|h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n");

  const plain = decodeEntities(withBreaks.replace(/<[^>]*>/g, " "));

  return plain
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 3);
}
