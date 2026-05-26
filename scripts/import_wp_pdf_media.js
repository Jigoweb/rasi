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
  const args = { dryRun: false, limit: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") args.dryRun = true;
    if (argv[i] === "--limit") args.limit = Number(argv[i + 1]);
  }
  return args;
}

async function fetchJson(url) {
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
  return await res.json();
}

function normalizePathFromUrl(u) {
  try {
    const url = new URL(u);
    let p = url.pathname || "/";
    if (p.endsWith("/")) p = p.slice(0, -1) || "/";
    if (p.startsWith("/it/")) p = p.slice(3);
    if (p === "/it") p = "/";
    return p;
  } catch {
    return null;
  }
}

function guessCategoryFromParentPath(parentPath, fileUrl) {
  const p = parentPath || "";
  const f = fileUrl || "";
  if (p.includes("/accordi")) return "contratti";
  if (p.includes("/norme")) return "norme";
  if (p.includes("/modulistica")) return "modulistica";
  if (/\/bando/i.test(p) || /bando/i.test(f)) return "allegati_bando";
  return "modulistica";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const logPath = path.resolve(__dirname, "../data/import_wp_pdf_media.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logPath, line);
    console.log(msg);
  };
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: pages } = await supabase.from("pages").select("id,category,slug");
  const getPageId = (category, slug) => (pages || []).find((p) => p.category === category && p.slug === slug)?.id || null;

  const pageIdAccordi = getPageId("accordi", "lista-accordi");
  const pageIdNorme = getPageId("norme", "lista-norme");

  const { data: existingDocs } = await supabase.from("documents").select("file_url");
  const existing = new Set((existingDocs || []).map((d) => d.file_url));

  const wpApiBase = "https://www.reteartistispettacolo.it/wp-json/wp/v2";
  const perPage = 100;
  let page = 1;
  let totalInserted = 0;

  while (true) {
    const url = `${wpApiBase}/media?per_page=${perPage}&page=${page}&mime_type=application/pdf`;
    log(`fetch ${url}`);
    let items;
    try {
      items = await fetchJson(url);
    } catch (e) {
      const msg = String(e?.message || "");
      log(`fetch_error ${msg}`);
      if (msg.includes("Fetch failed 400") || msg.includes("Fetch failed 404")) break;
      throw e;
    }
    if (!Array.isArray(items) || items.length === 0) break;

    const toInsert = [];
    for (const m of items) {
      const fileUrl = m?.source_url;
      if (!fileUrl || existing.has(fileUrl)) continue;

      let parentPath = null;
      if (m?.post) {
        try {
          const parent = await fetchJson(`${wpApiBase}/pages/${m.post}`);
          parentPath = normalizePathFromUrl(parent?.link);
        } catch {
          try {
            const parent = await fetchJson(`${wpApiBase}/posts/${m.post}`);
            parentPath = normalizePathFromUrl(parent?.link);
          } catch {}
        }
      }

      const category = guessCategoryFromParentPath(parentPath, fileUrl);
      const page_id = category === "contratti" ? pageIdAccordi : category === "norme" ? pageIdNorme : null;

      toInsert.push({
        title: (m?.title?.rendered || m?.slug || "Documento").replace(/\s+/g, " ").trim(),
        file_url: fileUrl,
        category,
        page_id,
      });
      existing.add(fileUrl);

      if (Number.isFinite(args.limit) && args.limit > 0 && totalInserted + toInsert.length >= args.limit) break;
    }

    if (toInsert.length) {
      if (args.dryRun) {
        log(`dry_insert ${toInsert.length} page ${page}`);
      } else {
        const { error } = await supabase.from("documents").insert(toInsert, { returning: "minimal" });
        if (error) throw new Error(error.message);
        totalInserted += toInsert.length;
        log(`inserted ${totalInserted}`);
      }
    }

    if (Number.isFinite(args.limit) && args.limit > 0 && totalInserted >= args.limit) break;
    page += 1;
  }

  log("done");
}

main().catch((e) => {
  try {
    const logPath = path.resolve(__dirname, "../data/import_wp_pdf_media.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR ${String(e.message || "")}\n`);
  } catch {}
  console.error(e.message);
  process.exit(1);
});
