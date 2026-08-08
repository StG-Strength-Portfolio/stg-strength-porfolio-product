/**
 * @lovable-new 2026-08-04
 * Loads the Teaching Materials tree (categories → sub-categories → articles).
 * Reads go straight through RLS: published rows for every signed-in user,
 * everything for super admins.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  TeachingArticle,
  TeachingCategory,
  TeachingSubcategory,
} from "@/lib/teaching.functions";

export interface TeachingTree {
  categories: TeachingCategory[];
  subcategories: TeachingSubcategory[];
  articles: TeachingArticle[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useTeachingMaterials(): TeachingTree {
  const [categories, setCategories] = useState<TeachingCategory[]>([]);
  const [subcategories, setSubcategories] = useState<TeachingSubcategory[]>([]);
  const [articles, setArticles] = useState<TeachingArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s, a] = await Promise.all([
        supabase.from("teaching_categories" as never).select("*").order("sort_order"),
        supabase.from("teaching_subcategories" as never).select("*").order("sort_order"),
        supabase.from("teaching_articles" as never).select("*").order("sort_order"),
      ]);
      setCategories((c.data ?? []) as unknown as TeachingCategory[]);
      setSubcategories((s.data ?? []) as unknown as TeachingSubcategory[]);
      setArticles((a.data ?? []) as unknown as TeachingArticle[]);
    } catch (e) {
      console.error("[teaching-materials]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { categories, subcategories, articles, loading, refresh };
}

/** Picks the field for the active language with a Finnish fallback. */
export function pickLang<T extends Record<string, unknown>>(
  row: T,
  base: string,
  lang: "fi" | "en" | "sv",
): string {
  const v = row[`${base}_${lang}`] as string | null | undefined;
  return (v && String(v).trim()) || String(row[`${base}_fi`] ?? "");
}
