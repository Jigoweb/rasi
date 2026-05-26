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
  const args = { limit: null, dryRun: false, only: null, publish: false, skip: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    if (a === "--only") args.only = argv[i + 1];
    if (a === "--limit") args.limit = Number(argv[i + 1]);
    if (a === "--publish") args.publish = true;
    if (a === "--skip") args.skip = Number(argv[i + 1]);
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
  } catch (e) {
    clearTimeout(t);
    throw new Error(`Fetch error ${url}`);
  }
  clearTimeout(t);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return await res.text();
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      if (!Number.isFinite(n)) return _;
      try {
        return String.fromCodePoint(n);
      } catch {
        return _;
      }
    });
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function extractTitle(html) {
  const m1 = html.match(/<h1[^>]*class=\"[^\"]*entry-title[^\"]*\"[^>]*>([\s\S]*?)<\/h1>/i);
  if (m1 && m1[1]) return stripTags(m1[1]);
  const m2 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m2 && m2[1]) return stripTags(m2[1]);
  return null;
}

function extractMainHtml(html) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const scope = main && main[1] ? main[1] : html;

  const entry = scope.match(/<div[^>]*class=\"[^\"]*entry-content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i);
  const body = entry && entry[1] ? entry[1] : scope;

  return body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeMessage(s) {
  return String(s || "").replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ").slice(0, 500);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const logPath = path.resolve(__dirname, "../data/sync_legacy_content.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logPath, line);
    console.log(msg);
  };

  const routesPath = path.resolve(__dirname, "../data/legacy_routes.json");
  const legacy = JSON.parse(fs.readFileSync(routesPath, "utf-8"));
  const routes = Array.isArray(legacy.routes) ? legacy.routes : [];

  const env = loadEnv();
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase env vars");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const candidates = routes.filter((r) => {
    if (args.only && r.target_table !== args.only) return false;
    if (r.target_table === "pages") return r.status === "update_content" || r.status === "new";
    if (r.target_table === "bandi_news") return r.status === "update_content" || r.status === "new";
    return false;
  });

  const skip = Number.isFinite(args.skip) && args.skip > 0 ? args.skip : 0;
  const limit = Number.isFinite(args.limit) && args.limit > 0 ? args.limit : candidates.length;
  const selected = candidates.slice(skip, skip + limit);

  log(`Selezionati ${selected.length}/${candidates.length} record (dryRun=${args.dryRun})`);
  await sleep(1);

  for (let i = 0; i < selected.length; i++) {
    const r = selected[i];
    log(`Processo ${i + 1}/${selected.length}: ${r.target_table} ${r.path}`);
    await sleep(1);
    const html = await fetchHtml(r.url);
    log(`html_len=${html.length}`);
    const title = extractTitle(html);
    const contentHtml = extractMainHtml(html);

    if (r.target_table === "pages") {
      const payload = {
        title: title || undefined,
        content:
          r.template_type === "faq"
            ? JSON.stringify([{ question: title || `${r.category}/${r.slug}`, answer: contentHtml }])
            : contentHtml,
        updated_at: new Date().toISOString(),
      };

      if (args.dryRun) {
        log(`[DRY] pages ${r.category}/${r.slug} title="${safeMessage(title || "")}" content_len=${payload.content.length}`);
      } else {
        const { error } = await supabase
          .from("pages")
          .update(payload, { returning: "minimal" })
          .eq("category", r.category)
          .eq("slug", r.slug);
        if (error) throw new Error(`DB update pages ${r.category}/${r.slug}: ${safeMessage(error.message)}`);
        log(`OK pages ${r.category}/${r.slug}`);
      }
    }

    if (r.target_table === "bandi_news") {
      const publishNow = args.publish;
      const payload = {
        title: title || undefined,
        content: contentHtml,
        published_at: publishNow ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      };

      if (args.dryRun) {
        log(`[DRY] bandi_news ${r.slug} title="${safeMessage(title || "")}" content_len=${payload.content.length}`);
      } else {
        const { data: existing } = await supabase
          .from("bandi_news")
          .select("id,slug,published_at,status")
          .eq("slug", r.slug)
          .maybeSingle();
        if (existing && existing.id) {
          const updatePayload = { ...payload };
          if (!publishNow) delete updatePayload.published_at;
          const { error } = await supabase
            .from("bandi_news")
            .update(updatePayload, { returning: "minimal" })
            .eq("id", existing.id);
          if (error) throw new Error(`DB update bandi_news ${r.slug}: ${safeMessage(error.message)}`);
        } else {
          const status = /^bando/i.test(r.slug) ? "closed" : "active";
          const insertPayload = { slug: r.slug, status, ...payload };
          if (!publishNow) delete insertPayload.published_at;
          const { error } = await supabase.from("bandi_news").insert([insertPayload], { returning: "minimal" });
          if (error) throw new Error(`DB insert bandi_news ${r.slug}: ${safeMessage(error.message)}`);
        }
        log(`OK bandi_news ${r.slug}`);
      }
    }

    await sleep(250);
  }
}

main().catch((e) => {
  try {
    const logPath = path.resolve(__dirname, "../data/sync_legacy_content.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR ${safeMessage(e.message)}\n`);
  } catch {}
  console.error(safeMessage(e.message));
  process.exit(1);
});
