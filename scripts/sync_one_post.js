async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  const res = await fetch(url, {
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "accept-language": "it-IT,it;q=0.9,en;q=0.8",
    },
  });
  clearTimeout(t);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return await res.text();
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
  const url = "https://www.reteartistispettacolo.it/it/10-buoni-motivi-per-firmare-il-mandato-r-a-s-i/";
  console.log("fetch", url);
  const html = await fetchHtml(url);
  console.log("html_len", html.length);
  const content = extractMainHtml(html);
  console.log("content_len", content.length);
}

main().catch((e) => {
  console.error("fatal", e.message);
  process.exit(1);
});
