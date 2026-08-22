import { useEffect } from "react";

/**
 * Restores the original room-name interaction: clicking the room identity
 * opens MembersPanel without requiring a separate Members button.
 */
export function MobileMembersBridge() {
  useEffect(() => {
    const onRoomNameClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const heading = target?.closest("header h1");
      if (!heading) return;
      window.dispatchEvent(new CustomEvent("diwan:open-members"));
    };
    document.addEventListener("click", onRoomNameClick);
    return () => document.removeEventListener("click", onRoomNameClick);
  }, []);

  return null;
}
