import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createOpenAIResponse } from "@/integrations/supabase/client.server";

const aiRequestSchema = z.object({
  message: z.string().trim().min(1, "اكتب رسالة أولاً").max(4000, "الرسالة طويلة جداً"),
});

/**
 * Server-only AI endpoint for Diwan.
 * The OpenAI key never reaches the browser.
 */
export const askDiwanAI = createServerFn({ method: "POST" })
  .inputValidator(aiRequestSchema)
  .handler(async ({ data }) => {
    return createOpenAIResponse({
      userText: data.message,
      systemText:
        "أنت مساعد ديوان AI. أجب بالعربية بشكل واضح ومختصر وودود. ساعد المستخدم في استخدام منصة ديوان، واقترح خطوات عملية. إذا لم تعرف معلومة، قل ذلك بوضوح ولا تخترعها.",
    });
  });
