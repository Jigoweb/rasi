import type { MetadataRoute } from "next";
import { supabaseServer } from "@/shared/lib/supabase-server";

function siteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.reteartistispettacolo.it";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin().replace(/\/$/, "");
  const staticRoutes = [
    "",
    "/contatti",
    "/cookie-policy",
    "/news",
    "/artisti-in-azione",
    "/modulistica",
    "/chi-siamo",
    "/artisti",
    "/servizi",
    "/accordi",
    "/norme",
    "/utilizzatori",
    "/mandato/artista",
  ];

  const { data: pages } = await supabaseServer
    .from("pages")
    .select("category,slug,updated_at")
    .eq("is_published", true);

  const { data: news } = await supabaseServer
    .from("bandi_news")
    .select("slug,updated_at,published_at")
    .not("published_at", "is", null);

  return [
    ...staticRoutes.map((path) => ({
      url: `${origin}${path || "/"}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    })),
    ...(pages || []).map((page) => ({
      url: `${origin}/${page.category}/${page.slug}`,
      lastModified: page.updated_at ? new Date(page.updated_at) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...(news || []).map((item) => ({
      url: `${origin}/news/${item.slug}`,
      lastModified: item.updated_at || item.published_at
        ? new Date(item.updated_at || item.published_at || "")
        : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
