import { createFileRoute } from "@tanstack/react-router";
import { PrivateChatsPage } from "@/pages/PrivateChatsPage";

const title = "المحادثات | ديوان";
const description = "محادثاتك الخاصة فقط.";

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
