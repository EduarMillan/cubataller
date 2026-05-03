import type { MetadataRoute } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cubagarage.cu";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/buscar`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/servicios`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const supabase = createSupabaseAdminClient();

    const [storesResult, partsResult, servicesResult] = await Promise.all([
      supabase
        .from("stores")
        .select("slug, updated_at")
        .eq("is_active", true)
        .limit(5000),
      supabase
        .from("parts")
        .select("id, updated_at")
        .eq("is_active", true)
        .eq("is_public", true)
        .gt("quantity_on_hand", 0)
        .limit(40000),
      supabase
        .from("service_providers")
        .select("slug, updated_at")
        .eq("is_active", true)
        .limit(5000),
    ]);

    const storeEntries: MetadataRoute.Sitemap = (storesResult.data ?? [])
      .filter((s): s is { slug: string; updated_at: string | null } => Boolean(s.slug))
      .map((store) => ({
        url: `${siteUrl}/tienda/${store.slug}`,
        lastModified: store.updated_at ? new Date(store.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    const partEntries: MetadataRoute.Sitemap = (partsResult.data ?? []).map((part) => ({
      url: `${siteUrl}/pieza/${part.id}`,
      lastModified: part.updated_at ? new Date(part.updated_at as string) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    const serviceEntries: MetadataRoute.Sitemap = (servicesResult.data ?? [])
      .filter((s): s is { slug: string; updated_at: string | null } => Boolean(s.slug))
      .map((service) => ({
        url: `${siteUrl}/servicios/${service.slug}`,
        lastModified: service.updated_at ? new Date(service.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    return [...staticEntries, ...storeEntries, ...serviceEntries, ...partEntries];
  } catch {
    return staticEntries;
  }
}
