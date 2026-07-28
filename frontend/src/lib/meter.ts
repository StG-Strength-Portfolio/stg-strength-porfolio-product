// Scoring + aggregation for Vahvuusmittari.
import { METER_STRENGTHS, VIRTUES, fieldKeyFor, type Virtue } from "./meter-data";
import { loadResponse } from "@/hooks/use-autosave";

export interface StrengthScore {
  id: string;
  name: string;
  virtue: Virtue;
  s1: number | null;
  s2: number | null;
  total: number; // 0 if either is null
  complete: boolean;
}

export async function loadAllMeterScores(): Promise<StrengthScore[]> {
  const out: StrengthScore[] = [];
  for (const s of METER_STRENGTHS) {
    const s1 = await loadResponse<number>(fieldKeyFor(s.id, 0));
    const s2 = await loadResponse<number>(fieldKeyFor(s.id, 1));
    const v1 = typeof s1 === "number" ? s1 : null;
    const v2 = typeof s2 === "number" ? s2 : null;
    out.push({
      id: s.id, name: s.name, virtue: s.virtue,
      s1: v1, s2: v2,
      total: (v1 ?? 0) + (v2 ?? 0),
      complete: v1 !== null && v2 !== null,
    });
  }
  return out;
}

export interface VirtueSubtotal {
  virtue: Virtue;
  total: number;
  max: number;
  strengths: StrengthScore[];
}

export function computeVirtueSubtotals(scores: StrengthScore[]): VirtueSubtotal[] {
  return VIRTUES.map((v) => {
    const strengths = scores.filter((s) => s.virtue === v);
    return {
      virtue: v,
      total: strengths.reduce((acc, s) => acc + s.total, 0),
      max: strengths.length * 10,
      strengths,
    };
  });
}

export function computeTop5(scores: StrengthScore[]): StrengthScore[] {
  return [...scores].sort((a, b) => b.total - a.total).slice(0, 5);
}

export function computeBottom3(scores: StrengthScore[]): StrengthScore[] {
  // Only count strengths that have been answered; if not enough answered, fall back to all
  const answered = scores.filter((s) => s.complete);
  const pool = answered.length >= 3 ? answered : scores;
  return [...pool].sort((a, b) => a.total - b.total).slice(0, 3);
}
