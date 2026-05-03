export type ServiceCategory = {
  code: string;
  label: string;
  emoji: string;
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { code: "mecanica_general", label: "Mecánica general", emoji: "🔧" },
  { code: "mecanica_especializada", label: "Mecánica especializada", emoji: "⚙️" },
  { code: "electricidad_automotriz", label: "Electricidad automotriz", emoji: "⚡" },
  { code: "torneria", label: "Tornería / rectificación", emoji: "🛠️" },
  { code: "desabolladura_pintura", label: "Desabolladura y pintura", emoji: "🎨" },
  { code: "gomeria", label: "Gomería / vulcanización", emoji: "🛞" },
  { code: "alineacion_balanceo", label: "Alineación y balanceo", emoji: "🎯" },
  { code: "aire_acondicionado", label: "Aire acondicionado", emoji: "❄️" },
  { code: "frenos_embragues", label: "Frenos y embragues", emoji: "🛑" },
  { code: "escape", label: "Escape / tubos", emoji: "💨" },
  { code: "lavado_detailing", label: "Lavado y detailing", emoji: "🧽" },
  { code: "tapiceria", label: "Tapicería automotriz", emoji: "🪑" },
  { code: "polarizado_accesorios", label: "Polarizado y accesorios", emoji: "🌑" },
  { code: "gruas_auxilio", label: "Grúas y auxilio mecánico", emoji: "🚛" },
  { code: "lubricentro", label: "Lubricentro", emoji: "🛢️" },
  { code: "scanner_diagnostico", label: "Scanner / diagnóstico electrónico", emoji: "💻" },
];

export const SERVICE_CATEGORY_MAP = new Map(
  SERVICE_CATEGORIES.map((c) => [c.code, c]),
);

export function getServiceCategory(code: string | null | undefined): ServiceCategory | null {
  if (!code) return null;
  return SERVICE_CATEGORY_MAP.get(code) ?? null;
}

export type WeeklyHours = {
  mon?: string | null;
  tue?: string | null;
  wed?: string | null;
  thu?: string | null;
  fri?: string | null;
  sat?: string | null;
  sun?: string | null;
};

export const DAYS_OF_WEEK: { key: keyof WeeklyHours; label: string; short: string }[] = [
  { key: "mon", label: "Lunes", short: "Lun" },
  { key: "tue", label: "Martes", short: "Mar" },
  { key: "wed", label: "Miércoles", short: "Mié" },
  { key: "thu", label: "Jueves", short: "Jue" },
  { key: "fri", label: "Viernes", short: "Vie" },
  { key: "sat", label: "Sábado", short: "Sáb" },
  { key: "sun", label: "Domingo", short: "Dom" },
];
