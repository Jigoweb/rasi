const nativeFetch = globalThis.fetch;
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

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") args.dryRun = true;
  }
  return args;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  let res;
  try {
    res = await nativeFetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "accept-language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });
  } catch {
    clearTimeout(t);
    throw new Error(`Fetch error ${url}`);
  }
  clearTimeout(t);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return await res.text();
}

function stripTags(s) {
  return String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractFileLinks(html, baseUrl) {
  const links = [];
  const re = /<a[^>]+href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const label = stripTags(m[2]);
    const abs = toAbsoluteUrl(href, baseUrl);
    if (!abs) continue;
    if (!/\.(pdf|doc|docx|xls|xlsx|zip)(\?|#|$)/i.test(abs)) continue;
    links.push({ file_url: abs, title: label || path.basename(new URL(abs).pathname) });
  }
  return links;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: pages } = await supabase.from("pages").select("id,category,slug");
  const findPageId = (category, slug) => (pages || []).find((p) => p.category === category && p.slug === slug)?.id || null;

  const targets = [
    {
      url: "https://www.reteartistispettacolo.it/it/accordi/",
      category: "contratti",
      page_id: findPageId("accordi", "lista-accordi"),
    },
    {
      url: "https://www.reteartistispettacolo.it/it/norme/",
      category: "norme",
      page_id: findPageId("norme", "lista-norme"),
    },
    {
      url: "https://www.reteartistispettacolo.it/it/modulistica/",
      category: "modulistica",
      page_id: null,
    },
  ];

  const { data: existingDocs } = await supabase.from("documents").select("file_url");
  const existing = new Set((existingDocs || []).map((d) => d.file_url));

  const toInsert = [];

  for (const t of targets) {
    console.log("scan", t.url);
    const html = await fetchHtml(t.url);
    const links = extractFileLinks(html, t.url);
    for (const link of links) {
      if (existing.has(link.file_url)) continue;
      existing.add(link.file_url);
      toInsert.push({
        title: link.title,
        file_url: link.file_url,
        category: t.category,
        page_id: t.page_id,
      });
    }
  }

  console.log("trovati", toInsert.length, "nuovi documenti");

  if (args.dryRun) return;

  const chunkSize = 50;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from("documents").insert(chunk, { returning: "minimal" });
    if (error) throw new Error(error.message);
    console.log("insert", i + chunk.length, "/", toInsert.length);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

