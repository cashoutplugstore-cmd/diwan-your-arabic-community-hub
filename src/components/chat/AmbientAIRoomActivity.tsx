import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const AMBIENT_TICK_MS = 15000;

export function AmbientAIRoomActivity({ roomId, enabled = true }: { roomId?: string; enabled?: boolean }) {
  useEffect(() => {
    if (!roomId || !enabled) return;
    let active = true;
    let running = false;

    const tick = async () => {
      if (!active || running || document.visibilityState !== "visible") return;
      running = true;
      try {
        await supabase.functions.invoke("diwan-ai-ambient", { body: { roomId } });
      } finally {
        running = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), AMBIENT_TICK_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [roomId, enabled]);

  return null;
}
