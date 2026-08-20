import { createFileRoute } from "@tanstack/react-router";
import { PublicProfilePage } from "@/pages/PublicProfilePage";

const title = "الملف الشخصي | ديوان";
const description = "عرض الملف الشخصي لعضو في ديوان.";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PublicProfilePage,
});
