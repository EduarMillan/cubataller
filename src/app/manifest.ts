import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cuba Mecánica — Repuestos y servicios automotrices en Cuba",
    short_name: "Cuba Mecánica",
    description:
      "Encuentra repuestos automotrices y servicios cerca de ti en Cuba. Busca por marca, modelo y año.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    lang: "es-CU",
    icons: [
      {
        src: "/cubamecanica.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
