import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { PencilBadge } from "@/components/PencilBadge";
import { ScreenChrome } from "@/components/ScreenChrome";
import { StickyNote } from "@/components/StickyNote";
import { WorldIcon } from "@/components/icons/AppIcons";
import { Screen10Strengths } from "@/components/screens/Screen10Strengths";
// @lovable-new 2026-08-08 — sequential locking (also blocks direct URL access)
import { useProgression } from "@/lib/progression";
import { toast } from "sonner";

import type { SaveState } from "@/hooks/use-autosave";

import { supabase } from "@/integrations/supabase/client";

import { TranslateFi, useT, useTr } from "@/lib/i18n";
import { REQUIREMENTS, useNavGate } from "@/lib/screen-completion";
import { ScreenContent, hasContent } from "@/lib/screen-content";
import { TOTAL_SCREENS, worldForScreen } from "@/lib/screens";

export const Route = createFileRoute("/_authenticated/seikkailu/$screen")({
  component: ScreenView,
});

function ScreenView() {
  const { screen } = Route.useParams();
  const navigate = useNavigate();
  const n = Math.max(1, Math.min(TOTAL_SCREENS, Number(screen) || 1));

  const world = worldForScreen(n);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [userId, setUserId] = useState<string | null>(null);

  const { setScreen, isComplete } = useNavGate();

  const t = useT();
  const tr = useTr();
  const hint = t("nav.finishFirst");

  const progression = useProgression();
  const stats = progression.byWorld?.[world.id];
  const pct = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const allowed = progression.canAccessScreen(n);

  /* @lovable-new 2026-08-08 — enforced in route logic, not only visually:
     typing a locked screen URL bounces back to the first incomplete screen. */
  useEffect(() => {
    if (!progression.ready || allowed) return;
    toast(t("nav.previousScreensFirst"));
    navigate({
      to: "/seikkailu/$screen",
      params: { screen: String(progression.nextAvailable) },
      replace: true,
    });
  }, [progression.ready, progression.nextAvailable, allowed, navigate, t]);

  /*
   * Lấy người dùng hiện tại.
   * Đồng thời cập nhật current_screen trong Supabase.
   * Chỉ chạy khi màn hình này thực sự được phép truy cập, tránh ghi dữ liệu
   * khi học sinh sắp bị redirect ngược lại (xem effect ở trên).
   */
  useEffect(() => {
    if (!allowed) return;

    let cancelled = false;

    async function loadCurrentUserAndSync() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (cancelled || userError || !userData.user) {
        return;
      }

      const currentUserId = userData.user.id;
      setUserId(currentUserId);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles" as never)
        .select("current_screen")
        .eq("id", currentUserId)
        .maybeSingle();

      if (cancelled || profileError) {
        return;
      }

      const profile = profileData as {
        current_screen?: number;
      } | null;

      const currentScreen = profile?.current_screen ?? 1;

      /*
       * Chỉ cập nhật khi học sinh đi tới màn hình cao hơn.
       * (DB trigger enforce_monotonic_current_screen cũng chặn việc lùi/nhảy
       * cóc quá 1 màn ở phía server, đây chỉ là tối ưu tránh ghi thừa.)
       */
      if (n <= currentScreen) {
        return;
      }

      await supabase
        .from("profiles" as never)
        .update({
          current_screen: n,
        } as never)
        .eq("id", currentUserId);
    }

    void loadCurrentUserAndSync();

    return () => {
      cancelled = true;
    };
  }, [n, allowed]);

  /*
   * Đăng ký những field bắt buộc của màn hình hiện tại.
   * Phần này quyết định nút Next có được mở hay không.
   */
  useEffect(() => {
    setScreen(n, REQUIREMENTS[n] ?? []);

    return () => {
      setScreen(null, []);
    };
  }, [n, setScreen]);

  const built = hasContent(n);
  // Super admins never see the completion lock on "Next".
  const nextBlocked = !progression.bypass && !isComplete;

  if (!progression.ready || !allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center opacity-80">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div
      className="
        journey-bg
        relative
        flex
        h-[calc(100dvh-3.5rem)]
        min-h-0
        min-w-0
        w-full
        flex-col
        overflow-hidden
      "
    >
      {/* =====================================================
          THANH SCREEN / SAVE STATUS
      ====================================================== */}
      <div className="relative z-30 shrink-0">
        <ScreenChrome n={n} saveState={saveState} />
      </div>

      {/* =====================================================
          KHOẢNG CÁCH AN TOÀN DƯỚI SCREEN CHROME
      ====================================================== */}
      <div aria-hidden="true" className="h-3 w-full shrink-0" />

      {/* =====================================================
          NỘI DUNG CHÍNH
      ====================================================== */}
      <main
        className="
    relative
    z-10
    flex
    min-h-0
    min-w-0
    w-full
    max-w-none
    flex-1
    flex-col
    overflow-hidden
    px-5
    pb-10
    pt-0
  "
      >
        {/* =====================================================
            PROLOGUE + WELCOME + PROGRESS
        ====================================================== */}
        <div
          className="
            relative
            z-20
            mb-2
            flex
            min-h-[40px]
            min-w-0
            w-full
            shrink-0
            items-center
            justify-between
            gap-8
          "
        >
          {/* BÊN TRÁI */}
          <div
            className="
              flex
              min-w-0
              shrink-0
              items-center
              gap-2
            "
          >
            <PencilBadge icon={<WorldIcon id={world.id} size={14} />}>
              {tr(world.title)}
            </PencilBadge>

            <span
              className="
                min-w-0
                whitespace-nowrap
                text-sm
                opacity-80
              "
            >
              {tr(world.subtitle)}
            </span>
          </div>

          {/* BÊN PHẢI: THANH TIẾN ĐỘ */}
          <div
            className="
              ml-auto
              flex
              min-w-[360px]
              max-w-[700px]
              flex-1
              items-center
              justify-center
            "
          >
            <div
              className="
                flex
                w-full
                max-w-[620px]
                items-center
                justify-center
                gap-3
              "
            >
              {/* NỀN THANH TIẾN ĐỘ */}
              <div
                className="
                  h-[7px]
                  min-w-0
                  flex-1
                  overflow-hidden
                  rounded-full
                  bg-black/20
                "
                role="progressbar"
                aria-label={tr("valmis")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                {/* PHẦN ĐÃ HOÀN THÀNH MÀU VÀNG */}
                <div
                  className="
                    h-full
                    rounded-full
                    bg-[#ffd12f]
                    transition-[width]
                    duration-500
                    ease-out
                  "
                  style={{
                    width: `${pct}%`,
                  }}
                />
              </div>

              {/* PHẦN TRĂM HOÀN THÀNH */}
              <span
                className="
                  min-w-[96px]
                  shrink-0
                  whitespace-nowrap
                  text-right
                  text-sm
                  font-medium
                  tabular-nums
                  text-white/90
                "
              >
                {pct}% {tr("valmis")}
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================
            NỘI DUNG CỦA SCREEN
        ====================================================== */}
        <div
          className="
            relative
            z-10
            min-h-0
            min-w-0
            w-full
            max-w-none
            flex-1
            overflow-hidden
          "
        >
          {built ? (
            <div
              className="
                h-full
                min-h-0
                min-w-0
                w-full
                max-w-none
                overflow-hidden
              "
            >
              <TranslateFi>
                {n === 10 ? (
                  <Screen10Strengths onSaveStateChange={setSaveState} />
                ) : (
                  <ScreenContent n={n} onSaveStateChange={setSaveState} />
                )}
              </TranslateFi>
            </div>
          ) : (
            <div
              className="
                h-full
                min-h-0
                min-w-0
                w-full
                max-w-none
                overflow-x-hidden
                overflow-y-auto
              "
            >
              <StickyNote seed={`s${n}`}>
                <h1 className="mb-3 text-3xl">
                  {t("app.screenOfTotal", {
                    n,
                    total: TOTAL_SCREENS,
                  })}
                </h1>
              </StickyNote>
            </div>
          )}
        </div>
      </main>

      {/* =====================================================
          PREVIOUS / NEXT
          Cố định sát đáy container
      ====================================================== */}
      <div
        className="
    fixed
    bottom-0
    right-0
    left-[289px]
    z-[100]
    m-0
    w-auto
    translate-y-4
    p-0
  "
      >
        <BottomNav
          n={n}
          saveState={saveState}
          showProgress={false}
          nextDisabled={nextBlocked}
          nextHint={nextBlocked ? hint : undefined}
        />
      </div>
    </div>
  );
}
