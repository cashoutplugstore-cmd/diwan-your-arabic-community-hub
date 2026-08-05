import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/AuthPage";

const title = "إنشاء حساب | ديوان";
const description = "أنشئ حسابك في ديوان وانضم إلى الغرف والمجتمعات العربية في دقيقة.";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: () => <AuthPage mode="register" />,
});