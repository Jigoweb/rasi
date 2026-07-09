import sanitizeHtml from "sanitize-html";

function trimHeaderFooterWrapper(html: string): string {
  let body = html;
  const lastHeaderClose = body.toLowerCase().lastIndexOf("</header>");
  if (lastHeaderClose !== -1) {
    body = body.slice(lastHeaderClose + "</header>".length);
  }
  const footerOpen = body.toLowerCase().indexOf("<footer");
  if (footerOpen !== -1) {
    body = body.slice(0, footerOpen);
  }
  return body;
}

/**
 * The bandi_news.content field stores full scraped WordPress pages (head, nested
 * sticky header, sidebar widgets, footer, inline Elementor markup), not just the
 * article body. Rendering it raw via dangerouslySetInnerHTML embedded an entire
 * nested page inside ours (WP header/nav colors bleeding through).
 *
 * This trims the known header/footer wrapper, then sanitizes what's left down to a
 * small allowlist of formatting tags (bold, italic, links, lists, headings) so real
 * article formatting survives while structural/styling markup (div, class, style,
 * script, nav, aside, images with WP-relative paths) is stripped.
 */
export function extractArticleHtml(html: string): string {
  if (!html) return "";

  const body = trimHeaderFooterWrapper(html);

  return sanitizeHtml(body, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote"],
    allowedAttributes: {
      a: ["href"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
    exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim(),
  }).trim();
}

/** Plain-text excerpt for listing cards, derived from the same sanitized body. */
export function extractArticleExcerpt(html: string, maxLength = 140): string {
  const clean = extractArticleHtml(html);
  const text = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
