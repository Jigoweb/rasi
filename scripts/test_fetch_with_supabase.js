const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
const envVars = {};
fs.readFileSync(envPath, "utf-8")
  .split("\n")
  .forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1]] = match[2];
  });

createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  let res;
  try {
    res = await fetch(url, {
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
    console.log("fetch_error", e && e.name, e && e.message);
    throw e;
  }
  clearTimeout(t);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}

async function main() {
  const url = "https://www.reteartistispettacolo.it/it/10-buoni-motivi-per-firmare-il-mandato-r-a-s-i/";
  console.log("fetch", url);
  const html = await fetchHtml(url);
  console.log("html_len", html.length);
}

main().catch((e) => {
  console.error("fatal", e.message);
  process.exit(1);
});
