"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function recordPageView(
  storeId: string,
  pageType: "store" | "part",
  partId?: string,
) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("page_views").insert({
    store_id: storeId,
    page_type: pageType,
    part_id: partId ?? null,
  });
}
