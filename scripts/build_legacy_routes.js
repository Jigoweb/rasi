const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  const envContent = fs.readFileSync(envPath, "utf-8");
  const envVars = {};
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1]] = match[2];
  });
  return envVars;
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return await res.text();
}

function extractLocsFromSitemap(xml) {
  const locs = [];
  const re = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[1]) locs.push(m[1].trim());
  }
  return locs;
}

async function fetchAllSitemapUrls(entryUrl) {
  const indexHtml = await fetchText(entryUrl);
  const sitemapUrls = extractLocsFromSitemap(indexHtml).filter((u) => u.endsWith(".xml"));

  const rows = [];
  for (const sitemapUrl of sitemapUrls) {
    const xml = await fetchText(sitemapUrl);
    const locs = extractLocsFromSitemap(xml);
    let source = "unknown";
    if (sitemapUrl.includes("post-sitemap")) source = "post";
    if (sitemapUrl.includes("page-sitemap")) source = "page";
    if (sitemapUrl.includes("category-sitemap")) source = "category";
    for (const loc of locs) rows.push({ loc, source, sitemap: sitemapUrl });
  }

  return rows;
}

function normalizeLegacyUrlToPath(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("reteartistispettacolo.it")) return null;
    let p = u.pathname || "/";
    if (p.endsWith("/")) p = p.slice(0, -1) || "/";
    if (p.startsWith("/it/")) p = p.slice(3);
    if (p === "/it") p = "/";
    return p;
  } catch {
    return null;
  }
}

function categorizePath(p) {
  const segments = p.split("/").filter(Boolean);
  if (segments.length === 0) return { kind: "home" };
  if (segments[0] === "news" && segments.length === 2) {
    return { kind: "news_detail", slug: segments[1] };
  }
  if (segments.length === 1) return { kind: "category_index", category: segments[0] };
  if (segments.length === 2) return { kind: "page", category: segments[0], slug: segments[1] };
  return { kind: "unknown", segments };
}

function guessTemplateType({ category, slug }) {
  if (category === "servizi") return "service";
  if (category === "accordi") return "document_list";
  if (category === "utilizzatori") return "document_list";
  if (category === "artisti") {
    if (/^(quando|quali|cosa|come|perche|perché)-/i.test(slug)) return "faq";
    return "institutional";
  }
  if (/^(modulistica|contratti|norme|allegati_bando)$/i.test(category)) return "document_list";
  return "institutional";
}

function contentLooksPlaceholder(content) {
  if (!content) return true;
  if (content.includes("Contenuto in fase di migrazione")) return true;
  if (content.includes("Pagina in allestimento")) return true;
  return false;
}

async function main() {
  const env = loadEnv();
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase env vars");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const sitemapEntry = "https://www.reteartistispettacolo.it/it/sitemap_index.xml";
  const legacyRows = await fetchAllSitemapUrls(sitemapEntry);

  const normalizedRows = legacyRows
    .map((r) => ({ ...r, path: normalizeLegacyUrlToPath(r.loc) }))
    .filter((r) => !!r.path)
    .map((r) => ({ ...r, path: r.path }))
    .filter(Boolean)
    .filter((r) => !r.path.includes("/wp-content/"))
    .filter((r) => !r.path.includes("/wp-json/"));

  const { data: pages } = await supabase.from("pages").select("id,category,slug,template_type,content");
  const { data: news } = await supabase.from("bandi_news").select("id,slug,content");

  const pagesByKey = new Map();
  (pages || []).forEach((p) => pagesByKey.set(`${p.category}/${p.slug}`, p));

  const pagesBySlug = new Map();
  (pages || []).forEach((p) => {
    const arr = pagesBySlug.get(p.slug) || [];
    arr.push(p);
    pagesBySlug.set(p.slug, arr);
  });

  const newsBySlug = new Map();
  (news || []).forEach((n) => newsBySlug.set(n.slug, n));

  const categoriesWithPages = new Set((pages || []).map((p) => p.category));

  const routes = [];

  for (const row of normalizedRows) {
    const p = row.path;
    const cat = categorizePath(p);

    if (row.source === "category") {
      routes.push({
        url: row.loc,
        path: p,
        source: row.source,
        target_table: "taxonomy",
        status: "ignore",
      });
      continue;
    }

    if (row.source === "post") {
      const slug = p.split("/").filter(Boolean).slice(-1)[0];
      const existing = newsBySlug.get(slug);
      const status = !existing ? "new" : contentLooksPlaceholder(existing.content) ? "update_content" : "done";
      routes.push({
        url: row.loc,
        path: p,
        source: row.source,
        target_table: "bandi_news",
        slug,
        status,
      });
      continue;
    }
    if (cat.kind === "page") {
      const key = `${cat.category}/${cat.slug}`;
      const existing = pagesByKey.get(key);
      const status = !existing ? "new" : contentLooksPlaceholder(existing.content) ? "update_content" : "done";
      const template_type = existing?.template_type || guessTemplateType(cat);
      routes.push({
        url: `https://www.reteartistispettacolo.it${p}`,
        url: row.loc,
        target_table: "pages",
        source: row.source,
        category: cat.category,
        slug: cat.slug,
        template_type,
        status,
      });
      continue;
    }

    if (cat.kind === "news_detail") {
      const existing = newsBySlug.get(cat.slug);
      const status = !existing ? "new" : contentLooksPlaceholder(existing.content) ? "update_content" : "done";
      routes.push({
        url: row.loc,
        path: p,
        target_table: "bandi_news",
        source: row.source,
        slug: cat.slug,
        status,
      });
      continue;
    }

    if (cat.kind === "category_index") {
      if (categoriesWithPages.has(cat.category)) {
        routes.push({
          url: row.loc,
          path: p,
          source: row.source,
          target_table: "category_index",
          category: cat.category,
          status: "handled",
        });
        continue;
      }

      if (newsBySlug.has(cat.category) || /^bando/i.test(cat.category)) {
        const existing = newsBySlug.get(cat.category);
        const status = !existing ? "new" : contentLooksPlaceholder(existing.content) ? "update_content" : "done";
        routes.push({
          url: row.loc,
          path: p,
          source: row.source,
          target_table: "bandi_news",
          slug: cat.category,
          status,
        });
        continue;
      }

      const slugMatches = pagesBySlug.get(cat.category) || [];
      if (slugMatches.length === 1) {
        const m = slugMatches[0];
        const status = contentLooksPlaceholder(m.content) ? "update_content" : "done";
        routes.push({
          url: row.loc,
          path: p,
          source: row.source,
          target_table: "pages",
          category: m.category,
          slug: m.slug,
          template_type: m.template_type || guessTemplateType({ category: m.category, slug: m.slug }),
          status,
          legacy_slug: cat.category,
        });
        continue;
      }
    }

    routes.push({
      url: row.loc,
      path: p,
      target_table: "unknown",
      source: row.source,
      status: "needs_review",
    });
  }


  routes.sort((a, b) => a.path.localeCompare(b.path));

  const outDir = path.resolve(__dirname, "../data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "legacy_routes.json");
  fs.writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), routes }, null, 2));

  const counts = routes.reduce((acc, r) => {
    const k = `${r.target_table}:${r.status}`;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  console.log("legacy_routes.json scritto:", outPath);
  console.log("Conteggi:", counts);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
