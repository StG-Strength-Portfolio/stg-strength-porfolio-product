/**
 * @lovable-new 2026-08-04
 * Teaching Materials data layer.
 *
 * Reads run in the browser through RLS (published rows for everyone signed in,
 * everything for super admins). Writes are super-admin only and go through
 * server functions that verify the role before using the privileged client.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TeachingCategory {
  id: string;
  strength_id: string;
  sort_order: number;
  is_published: boolean;
  thumbnail_url_fi: string | null;
  thumbnail_url_en: string | null;
  thumbnail_url_sv: string | null;
}

export interface TeachingSubcategory {
  id: string;
  category_id: string;
  name_fi: string;
  name_en: string;
  name_sv: string;
  sort_order: number;
  is_published: boolean;
}

export interface TeachingArticle {
  id: string;
  /** @lovable-new 2026-08-05 articles now hang directly off a strength category. */
  category_id: string | null;
  subcategory_id: string | null;
  title_fi: string;
  title_en: string;
  title_sv: string;
  description_fi: string | null;
  description_en: string | null;
  description_sv: string | null;
  google_slides_url_fi: string | null;
  google_slides_url_en: string | null;
  google_slides_url_sv: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_published: boolean;
  /** @lovable-new 2026-08-05 how many slides the deck has (browse preview). */
  slide_count: number | null;
}

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const createTeachingCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { strengthId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: row, error } = await db
      .from("teaching_categories")
      .insert({ strength_id: data.strengthId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteTeachingCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("teaching_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Show / hide a whole strength category (hides its descendants too). */
export const setTeachingCategoryPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; isPublished: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db
      .from("teaching_categories")
      .update({ is_published: data.isPublished })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveTeachingCategoryThumbnails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      thumbnailFi?: string;
      thumbnailEn?: string;
      thumbnailSv?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db
      .from("teaching_categories")
      .update({
        thumbnail_url_fi: data.thumbnailFi?.trim() || null,
        thumbnail_url_en: data.thumbnailEn?.trim() || null,
        thumbnail_url_sv: data.thumbnailSv?.trim() || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Show / hide a sub-category (folder) and, implicitly, its articles. */
export const setTeachingSubcategoryPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; isPublished: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db
      .from("teaching_subcategories")
      .update({ is_published: data.isPublished })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createTeachingSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      categoryId: string;
      nameFi: string;
      nameEn: string;
      nameSv: string;
      sortOrder?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("teaching_subcategories").insert({
      category_id: data.categoryId,
      name_fi: data.nameFi,
      name_en: data.nameEn,
      name_sv: data.nameSv,
      sort_order: data.sortOrder ?? 99,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeachingSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("teaching_subcategories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface ArticleInput {
  id?: string;
  /** @lovable-new 2026-08-05 */
  categoryId: string;
  titleFi: string;
  titleEn: string;
  titleSv: string;
  descriptionFi?: string;
  descriptionEn?: string;
  descriptionSv?: string;
  slidesFi?: string;
  slidesEn?: string;
  slidesSv?: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  sortOrder?: number;
  /** @lovable-new 2026-08-05 */
  slideCount?: number;
}

export const saveTeachingArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ArticleInput) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const row = {
      category_id: data.categoryId,
      title_fi: data.titleFi,
      title_en: data.titleEn,
      title_sv: data.titleSv,
      description_fi: data.descriptionFi || null,
      description_en: data.descriptionEn || null,
      description_sv: data.descriptionSv || null,
      google_slides_url_fi: data.slidesFi || null,
      google_slides_url_en: data.slidesEn || null,
      google_slides_url_sv: data.slidesSv || null,
      thumbnail_url: data.thumbnailUrl || null,
      is_published: data.isPublished,
      slide_count: Math.max(1, Math.min(200, Number(data.slideCount) || 10)),
      sort_order: data.sortOrder ?? 0,
    };
    const q = data.id
      ? db.from("teaching_articles").update(row).eq("id", data.id)
      : db.from("teaching_articles").insert({ ...row, created_by: context.userId });
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeachingArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("teaching_articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
