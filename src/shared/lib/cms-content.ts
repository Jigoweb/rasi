import sanitizeHtml from "sanitize-html";
import { getLegacyDocuments, type LegacyDocument } from "@/shared/data/legacy-document-urls";

const MIGRATION_PLACEHOLDER =
  /Contenuto in fase di migrazione dal vecchio sito/i;

export type PublicDocument = {
  title: string;
  url: string;
};

export function isMigrationPlaceholder(html: string): boolean {
  return MIGRATION_PLACEHOLDER.test(html);
}

/** Estrae URL di PDF da HTML Elementor (href normali e JSON escaped). */
export function extractPdfUrlsFromHtml(html: string): string[] {
  if (!html) return [];

  const urls = new Set<string>();
  const patterns = [
    /https?:\/\/[^"'\\\s<>]+\.pdf/gi,
    /https?:\\\/\\\/[^"'\\\s<>]+\.pdf/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      urls.add(match[0].replace(/\\/g, ""));
    }
  }

  return [...urls];
}

function titleFromPdfUrl(url: string): string {
  const filename = decodeURIComponent(url.split("/").pop() ?? "Documento")
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return filename || "Documento";
}

function rewriteLegacyHref(href: string): string {
  if (!href) return href;

  try {
    const parsed = new URL(href, "https://www.reteartistispettacolo.it");
    if (!parsed.hostname.includes("reteartistispettacolo.it")) return href;

    const path = parsed.pathname.replace(/^\/it\//, "/").replace(/\/$/, "");
    if (path === "/contatti") return "/contatti";
    if (path.startsWith("/chi-siamo/") || path.startsWith("/norme/") || path.startsWith("/modulistica")) {
      return path;
    }
    if (parsed.pathname.includes("/wp-content/uploads/")) return href;
  } catch {
    return href;
  }

  return href;
}

/**
 * Converte HTML Elementor scrapato in contenuto leggibile per pagine istituzionali.
 */
export function extractInstitutionalHtml(html: string): string {
  if (!html || isMigrationPlaceholder(html)) return "";

  let body = html;
  body = body.replace(/<div[^>]*class="[^"]*df-lite[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  body = body.replace(/<div[^>]*class="[^"]*pdf_viewer_container[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "");
  body = body.replace(/<div class="page-header">[\s\S]*?<\/div>\s*/i, "");

  const cleaned = sanitizeHtml(body, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "strong", "b", "em", "i", "u",
      "a", "ul", "ol", "li", "blockquote",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (_tag, attribs) => {
        const href = rewriteLegacyHref(attribs.href ?? "");
        const isExternal = href.startsWith("http");
        return {
          tagName: "a",
          attribs: {
            href,
            ...(isExternal ? { rel: "noopener noreferrer", target: "_blank" } : {}),
          },
        };
      },
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === "p" && !frame.text.trim()) return true;
      if (frame.tag === "h1" && /^(statuto|privacy policy|personal data policy)$/i.test(frame.text.trim())) {
        return true;
      }
      return false;
    },
  }).trim();

  const textOnly = sanitizeHtml(cleaned, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
  return textOnly.length > 80 ? cleaned : "";
}

export function resolvePublicDocuments(input: {
  category: string;
  slug: string;
  content: string | null;
  linkedDocuments?: { title: string; file_url: string }[];
}): PublicDocument[] {
  const seen = new Set<string>();
  const result: PublicDocument[] = [];

  const add = (title: string, url: string) => {
    const key = url.toLowerCase();
    if (!url || seen.has(key)) return;
    seen.add(key);
    result.push({ title, url });
  };

  for (const url of extractPdfUrlsFromHtml(input.content ?? "")) {
    add(titleFromPdfUrl(url), url);
  }

  for (const doc of getLegacyDocuments(input.category, input.slug)) {
    add(doc.title, doc.url);
  }

  for (const doc of input.linkedDocuments ?? []) {
    add(doc.title, doc.file_url);
  }

  return result;
}
