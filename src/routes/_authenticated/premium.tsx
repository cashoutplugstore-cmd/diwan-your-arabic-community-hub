import { createFileRoute } from "@tanstack/react-router";
import { PremiumPage } from "@/pages/PremiumPage";

export const Route = createFileRoute("/_authenticated/premium")({
  component: PremiumPage,
});
