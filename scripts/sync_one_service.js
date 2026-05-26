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

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  const res = await fetch(url, {
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "user-agent": "rasi-migration-bot/1.0",
      "accept-language": "it-IT,it;q=0.9,en;q=0.8",
    },
  });
  clearTimeout(t);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return await res.text();
}

function extractTitle(html) {
  const m1 = html.match(/<h1[^>]*class=\"[^\"]*entry-title[^\"]*\"[^>]*>([\s\S]*?)<\/h1>/i);
  if (m1 && m1[1]) return m1[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const m2 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m2 && m2[1]) return m2[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const url = "https://www.reteartistispettacolo.it/it/servizi-artistici/";
  console.log("fetch", url);
  const html = await fetchHtml(url);
  const title = extractTitle(html) || "Servizi artistici";
  const content = extractMainHtml(html);
  console.log("content_len", content.length);

  const { error } = await supabase
    .from("pages")
    .update({ title, content, updated_at: new Date().toISOString() }, { returning: "minimal" })
    .eq("category", "servizi")
    .eq("slug", "servizi-artistici");
  if (error) throw new Error(error.message);
  console.log("ok");
}

main().catch((e) => {
  console.error("fatal", e.message);
  process.exit(1);
});
