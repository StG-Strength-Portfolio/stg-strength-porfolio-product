import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReceivedGift {
  id: string;
  strength_id: string;
  message: string | null;
  created_at: string;
  teacher_name: string | null;
}

/** Strength candies a student has received from teachers. */
export function useReceivedGifts() {
  const [gifts, setGifts] = useState<ReceivedGift[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_my_received_strengths" as never);
      if (error) throw error;
      setGifts((data ?? []) as unknown as ReceivedGift[]);
    } catch (err) {
      console.error("[received-gifts]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      await refresh();
      if (cancelled) return;
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || cancelled) return;

      channel = supabase
        .channel(`received-strengths:${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teacher_assigned_strengths",
            filter: `student_id=eq.${uid}`,
          },
          () => void refresh(),
        )
        .subscribe();
    })();

    const onManualRefresh = () => void refresh();
    window.addEventListener("strength-gifts:refresh", onManualRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("strength-gifts:refresh", onManualRefresh);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { gifts, loading, refresh };
}
