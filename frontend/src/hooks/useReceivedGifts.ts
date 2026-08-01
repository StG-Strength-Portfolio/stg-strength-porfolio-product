import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReceivedGift {
  id: string;
  strength_id: string;
  message: string | null;
  created_at: string;
  teacher_name: string | null;
}

/**
 * Strength candies a student has received from teachers, including the
 * teacher's display name (via a security-definer RPC). Read-only.
 */
export function useReceivedGifts() {
  const [gifts, setGifts] = useState<ReceivedGift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_my_received_strengths" as never);
        if (error) throw error;
        if (!cancelled) setGifts((data ?? []) as unknown as ReceivedGift[]);
      } catch (err) {
        console.error("[received-gifts]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { gifts, loading };
}
