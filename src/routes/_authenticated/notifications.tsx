import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/pages/NotificationsPage";

const title = "الإشعارات | ديوان";
const description = "تابع إشعارات الغرف وطلبات الصداقة والتحديثات المهمة.";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: NotificationsPage,
});
