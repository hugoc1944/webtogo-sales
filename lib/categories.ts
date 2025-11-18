// lib/categories.ts
export type SegmentKey =
  | "A_CONSTRUCAO_SERVICOS_LAR"
  | "B_RESTAURACAO_CAFES_PASTELARIAS"
  | "C_CABELEIREIROS_BARBEARIAS_ESTETICA"
  | "D_OFICINAS_AUTO_PNEUS_SERVICOS_AUTO"
  | "E_MERCEARIAS_MERCADOS_PADARIAS"
  | "F_LOJAS_ROUPA_CALCADO_DECORACAO"
  | "G_CLINICAS_SAUDE_WELLNESS"
  | "H_ALOJAMENTO_LOCAL_HOTEIS"
  | "I_ESCOLAS_CURSOS_CENTROS_ESTUDO"
  | "J_PROFISSIONAIS_LIBERAIS_SERVICOS";

export type WindowId = "W1" | "W2" | "W3" | "W4" | "W5";

export const SEGMENT_META: Record<
  SegmentKey,
  { short: string; label: string }
> = {
  A_CONSTRUCAO_SERVICOS_LAR: {
    short: "A",
    label: "Construção & serviços técnicos para o lar",
  },
  B_RESTAURACAO_CAFES_PASTELARIAS: {
    short: "B",
    label: "Restauração, cafés & pastelarias",
  },
  C_CABELEIREIROS_BARBEARIAS_ESTETICA: {
    short: "C",
    label: "Cabeleireiros, barbearias & estética",
  },
  D_OFICINAS_AUTO_PNEUS_SERVICOS_AUTO: {
    short: "D",
    label: "Oficinas, pneus & serviços auto",
  },
  E_MERCEARIAS_MERCADOS_PADARIAS: {
    short: "E",
    label: "Mercearias, mercados, talhos, padarias",
  },
  F_LOJAS_ROUPA_CALCADO_DECORACAO: {
    short: "F",
    label: "Lojas de roupa, calçado, decoração, mobiliário",
  },
  G_CLINICAS_SAUDE_WELLNESS: {
    short: "G",
    label: "Clínicas de saúde & wellness",
  },
  H_ALOJAMENTO_LOCAL_HOTEIS: {
    short: "H",
    label: "Alojamento local & hotéis pequenos",
  },
  I_ESCOLAS_CURSOS_CENTROS_ESTUDO: {
    short: "I",
    label: "Escolas, cursos & centros de estudo",
  },
  J_PROFISSIONAIS_LIBERAIS_SERVICOS: {
    short: "J",
    label: "Profissionais liberais & serviços",
  },
};

// ⭐ Fill these according to your star-matrix in New_implementations.txt.
// 3 = muito bom, 2 = bom, 1 = aceitável, 0 = evitar.
export const SEGMENT_WINDOW_WEIGHTS: Record<
  SegmentKey,
  Record<WindowId, number>
> = {
  A_CONSTRUCAO_SERVICOS_LAR: { W1: 2, W2: 3, W3: 2, W4: 1, W5: 0 },
  B_RESTAURACAO_CAFES_PASTELARIAS: { W1: 3, W2: 0, W3: 3, W4: 1, W5: 0 },
  C_CABELEIREIROS_BARBEARIAS_ESTETICA: { W1: 2, W2: 2, W3: 2, W4: 2, W5: 0 },
  D_OFICINAS_AUTO_PNEUS_SERVICOS_AUTO: { W1: 2, W2: 2, W3: 3, W4: 2, W5: 1 },
  E_MERCEARIAS_MERCADOS_PADARIAS: { W1: 2, W2: 3, W3: 2, W4: 2, W5: 0 },
  F_LOJAS_ROUPA_CALCADO_DECORACAO: { W1: 2, W2: 3, W3: 3, W4: 2, W5: 1 },
  G_CLINICAS_SAUDE_WELLNESS: { W1: 2, W2: 3, W3: 2, W4: 1, W5: 0 },
  H_ALOJAMENTO_LOCAL_HOTEIS: { W1: 1, W2: 2, W3: 3, W4: 2, W5: 1 },
  I_ESCOLAS_CURSOS_CENTROS_ESTUDO: { W1: 2, W2: 1, W3: 1, W4: 3, W5: 2 },
  J_PROFISSIONAIS_LIBERAIS_SERVICOS: { W1: 3, W2: 2, W3: 2, W4: 3, W5: 1 },
};

export function getLisbonNow(): Date {
  const now = new Date();
  const s = now.toLocaleString("en-US", { timeZone: "Europe/Lisbon" });
  return new Date(s);
}

// Usa as janelas que definiste (ajusta minutos se quiseres afinar)
export function getWindowId(d: Date): WindowId | null {
  const minutes = d.getHours() * 60 + d.getMinutes();

  if (minutes >= 10 * 60 && minutes < 11 * 60 + 45) return "W1"; // 10:00–11:45
  if (minutes >= 11 * 60 + 45 && minutes < 14 * 60 + 30) return "W2"; // 11:45–14:30
  if (minutes >= 14 * 60 + 30 && minutes < 16 * 60) return "W3"; // 14:30–16:00
  if (minutes >= 16 * 60 && minutes < 17 * 60 + 30) return "W4"; // 16:00–17:30
  if (minutes >= 17 * 60 + 30 && minutes < 19 * 60 + 15) return "W5"; // 17:30–19:15

  return null;
}

export function pickSegmentForNow(now: Date): SegmentKey | null {
  const w = getWindowId(now);
  if (!w) return null;

  const weighted: SegmentKey[] = [];

  (Object.keys(SEGMENT_WINDOW_WEIGHTS) as SegmentKey[]).forEach((seg) => {
    const stars = SEGMENT_WINDOW_WEIGHTS[seg][w];
    for (let i = 0; i < stars; i++) weighted.push(seg);
  });

  if (!weighted.length) return null;
  const idx = Math.floor(Math.random() * weighted.length);
  return weighted[idx];
}
