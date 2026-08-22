import { useEffect } from "react";

/**
 * Keeps the existing mobile MembersPanel trigger in sync with the compact
 * members button in ChatRoomPage. The chat header dispatches this event so
 * the member drawer opens without taking layout space from the conversation.
 */
export function MobileMembersBridge() {
  useEffect(() => {
    const openMembers = () => {
      const button = Array.from(document.querySelectorAll("button")).find((node) => node.textContent?.trim() === "الأعضاء") as HTMLButtonElement | undefined;
      button?.click();
    };
    window.addEventListener("diwan:open-members", openMembers);
    return () => window.removeEventListener("diwan:open-members", openMembers);
  }, []);

  return null;
}
