import Link from "next/link";

export type PublicSection = "repuestos" | "servicios";

/**
 * The two public destinations of the site. They used to live inline in each
 * navbar, hidden below md, so on a phone there was no way to reach them from
 * the home page at all. Kept here so every public page offers the same pair:
 * an animated row on desktop (PublicNavLinks) and an always-visible strip of
 * buttons on mobile (PublicNavTabs).
 *
 * Colors follow the rest of the site: orange for parts, emerald for services.
 */
const LINKS = [
  {
    key: "repuestos" as const,
    href: "/buscar",
    label: "Repuestos",
    desktopIdle:
      "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-lg hover:shadow-orange-500/20",
    desktopActive: "border-orange-500/60 bg-orange-500/15 text-orange-300",
    bar: "bg-orange-500",
    glow: "group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.75)]",
    tabIdle:
      "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-orange-500/50 hover:text-orange-300",
    tabActive: "border-orange-500/60 bg-orange-500/15 text-orange-300",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
      />
    ),
  },
  {
    key: "servicios" as const,
    href: "/servicios",
    label: "Servicios",
    desktopIdle:
      "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20",
    desktopActive: "border-emerald-500/60 bg-emerald-500/15 text-emerald-300",
    bar: "bg-emerald-500",
    glow: "group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.75)]",
    tabIdle:
      "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-300",
    tabActive: "border-emerald-500/60 bg-emerald-500/15 text-emerald-300",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"
      />
    ),
  },
];

/**
 * Desktop row: pills that lift, tint and glow in their section color on hover,
 * with the icon nudging up and a bar sweeping in from the left underneath.
 */
export function PublicNavLinks({ active }: { active?: PublicSection } = {}) {
  return (
    <div className="hidden items-center gap-3 md:flex [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
      {LINKS.map((link) => {
        const isActive = active === link.key;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`group relative overflow-hidden rounded-xl border px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5 ${
              isActive ? link.desktopActive : link.desktopIdle
            }`}
          >
            <span className="flex items-center gap-2">
              <svg
                className={`h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 ${link.glow}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                {link.icon}
              </svg>
              {link.label}
            </span>
            <span
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full transition-transform duration-300 ease-out ${link.bar} ${
                isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            />
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Mobile strip: a second row under the logo, so both destinations are one tap
 * away as soon as the page opens.
 */
export function PublicNavTabs({ active }: { active?: PublicSection } = {}) {
  return (
    <div className="flex gap-2 border-t border-zinc-800/70 px-4 py-2.5 md:hidden">
      {LINKS.map((link) => {
        const isActive = active === link.key;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.97] [font-family:var(--font-space-grotesk),system-ui,sans-serif] ${
              isActive ? link.tabActive : link.tabIdle
            }`}
          >
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              aria-hidden="true"
            >
              {link.icon}
            </svg>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
