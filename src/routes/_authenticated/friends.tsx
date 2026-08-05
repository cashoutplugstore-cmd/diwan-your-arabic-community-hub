import { createFileRoute } from "@tanstack/react-router";
import { FriendsPage } from "@/pages/FriendsPage";

const title = "الأصدقاء | ديوان";
const description = "أدر طلبات الصداقة وقائمة أصدقائك في ديوان.";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: FriendsPage,
});