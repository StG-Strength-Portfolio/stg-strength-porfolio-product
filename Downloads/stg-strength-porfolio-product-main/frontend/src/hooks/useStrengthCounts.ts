/**
 * @lovable-new 2026-08-05
 * One shared source of truth for "how many of each strength has this student
 * collected": candy-shop picks (S12), jar discoveries anywhere in the
 * adventure, and every teacher / peer gift. Used by the sidebar growth bar
 * and the "My Strengths" page so the two can never disagree.
 */
import { useMemo } from "react";
import { useStrengthJar } from "@/hooks/useStrengthJar";
import { useReceivedGifts } from "@/hooks/useReceivedGifts";
import { ALL_STRENGTHS } from "@/lib/strength-jar-data";

export interface StrengthCount {
  id: number;
  count: number;
}

export function useStrengthCounts() {
  const { selected, collected, loading: jarLoading } = useStrengthJar();
  const { gifts, loading: giftsLoading } = useReceivedGifts();

  return useMemo(() => {
    const counts = new Map<number, number>();
    const bump = (id: number) => {
      if (!Number.isFinite(id) || id < 1) return;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    };
    selected.forEach(bump);
    collected.forEach(bump);
    gifts.forEach((g) => bump(Number(g.strength_id)));

    const ranked: StrengthCount[] = ALL_STRENGTHS.map((s) => ({
      id: s.id,
      count: counts.get(s.id) ?? 0,
    }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count || a.id - b.id);

    const total = ranked.reduce((sum, s) => sum + s.count, 0);

    return {
      counts,
      ranked,
      top5: ranked.slice(0, 5),
      total,
      uniqueCount: ranked.length,
      loading: jarLoading || giftsLoading,
    };
  }, [selected, collected, gifts, jarLoading, giftsLoading]);
}
