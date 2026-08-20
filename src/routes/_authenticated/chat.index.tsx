import { createFileRoute } from "@tanstack/react-router";
import { PrivateChatsPage } from "@/pages/PrivateChatsPage";

const title = "المحادثات الخاصة | ديوان";
const description = "محادثاتك الخاصة فقط مع الأعضاء.";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PrivateChatsPage,
});
