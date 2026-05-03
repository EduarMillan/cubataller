"use client";

import { useEffect, useRef } from "react";
import { recordPageView } from "@/app/(public)/_actions";

export function TrackView({
  storeId,
  pageType,
  partId,
}: {
  storeId: string;
  pageType: "store" | "part";
  partId?: string;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    recordPageView(storeId, pageType, partId);
  }, [storeId, pageType, partId]);

  return null;
}
