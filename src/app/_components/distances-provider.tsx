"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Coords = { lat: number; lng: number };
type Status = "idle" | "loading" | "ok" | "denied";

type DistancesContextValue = {
  coords: Coords | null;
  status: Status;
  request: () => void;
  clear: () => void;
};

const DistancesContext = createContext<DistancesContextValue>({
  coords: null,
  status: "idle",
  request: () => {},
  clear: () => {},
});

const STORAGE_KEY = "user_coords_v1";

export function DistancesProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Coords;
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          setCoords(parsed);
          setStatus("ok");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("denied");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setStatus("ok");
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      },
      () => setStatus("denied"),
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus("idle");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <DistancesContext.Provider value={{ coords, status, request, clear }}>
      {children}
    </DistancesContext.Provider>
  );
}

export function useDistances() {
  return useContext(DistancesContext);
}
