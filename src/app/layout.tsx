import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cubagarage.cu";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cuba Garage — Repuestos y servicios automotrices en Cuba",
    template: "%s | Cuba Garage",
  },
  description:
    "Encuentra repuestos automotrices y servicios (mecánicos, torneros, electricistas) cerca de ti en Cuba. Busca por marca, modelo y año. Contacta directo por WhatsApp.",
  keywords: [
    "repuestos automotrices",
    "repuestos Cuba",
    "piezas de auto",
    "autopartes",
    "repuestos usados",
    "repuestos nuevos",
    "tienda repuestos",
    "mecánico automotriz",
    "tornero",
    "electricista automotriz",
    "servicios automotrices Cuba",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CU",
    siteName: "Cuba Garage",
    url: siteUrl,
    title: "Cuba Garage — Repuestos y servicios automotrices en Cuba",
    description:
      "Encuentra repuestos automotrices y servicios cerca de ti en Cuba. Busca por marca, modelo y año. Contacta directo por WhatsApp.",
    images: [
      {
        url: "/cubagarage.png",
        width: 1200,
        height: 630,
        alt: "Cuba Garage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cuba Garage — Repuestos y servicios automotrices en Cuba",
    description:
      "Encuentra repuestos automotrices y servicios cerca de ti en Cuba.",
    images: ["/cubagarage.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  category: "automotive",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Cuba Garage",
  url: siteUrl,
  logo: `${siteUrl}/cubagarage.png`,
  description:
    "Plataforma cubana para encontrar repuestos automotrices y servicios (mecánicos, torneros, electricistas) cerca de ti.",
  areaServed: { "@type": "Country", name: "Cuba" },
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Cuba Garage",
  url: siteUrl,
  inLanguage: "es-CU",
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/buscar?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
