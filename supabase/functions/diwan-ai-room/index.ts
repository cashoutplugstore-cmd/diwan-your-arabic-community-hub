import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const { roomId, roomName, message, language = "ar", recentMessages = [], persona = "friendly" } = await req.json();
    if (!roomId || !message) return new Response(JSON.stringify({ error: "roomId and message are required" }), { status: 400, headers: corsHeaders });

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), { status: 503, headers: corsHeaders });

    const context = Array.isArray(recentMessages)
      ? recentMessages.slice(-12).map((m: { author?: string; content?: string }) => `${m.author ?? "عضو"}: ${(m.content ?? "").slice(0, 500)}`).join("\n")
      : "";

    const personaPrompt = {
      friendly: "شخصية اجتماعية وخفيفة، تحب فتح السوالف وتسأل سؤالاً بسيطاً عند مناسبة ذلك.",
      funny: "شخصية مرحة، تستخدم مزحة خفيفة أحياناً بدون مبالغة أو إزعاج.",
      curious: "شخصية فضولية، تهتم بتفاصيل كلام الأعضاء وتسأل أسئلة متابعة قصيرة.",
      calm: "شخصية هادئة وودودة، تعطي ردوداً مختصرة وتدخل في النقاش عندما يكون عندها شيء مفيد.",
    }[persona as string] ?? "شخصية اجتماعية وخفيفة.";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [
          { role: "system", content: [{ type: "input_text", text: `أنت "ديوان AI"، شخصية افتراضية معلنة داخل مجتمع ديوان. لا تنتحل شخصية إنسان ولا تدّعي أنك مستخدم بشري. الغرفة: ${roomName ?? roomId}. ${personaPrompt} تحدث باللهجة العراقية الخفيفة وبأسلوب محادثة طبيعي: غالباً جملة أو جملتان، وتجنب الإجابات الرسمية الطويلة. لا تكرر نفس الفكرة أو الصياغة. لا توافق دائماً؛ شارك رأياً بسيطاً عندما يناسب السياق. تابع تفاصيل آخر الرسائل، وأحياناً ارجع لنقطة سابقة حتى يبدو الحوار متماسكاً. إذا انتهى الموضوع، افتح سؤالاً خفيفاً أو موضوعاً قريباً، لكن لا تسأل في كل رد. لا ترسل أكثر من سؤال واحد في الرد. لا تستخدم محتوى جنسي أو عنيف أو خطير. اللغة: ${language}. السياق الأخير:\n${context}` }] },
          { role: "user", content: [{ type: "input_text", text: message.slice(0, 2000) }] },
        ],
        max_output_tokens: 180,
        temperature: 0.9,
      }),
    });

    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: data?.error?.message ?? "OpenAI request failed" }), { status: 502, headers: corsHeaders });

    const text = data?.output_text?.trim();
    if (!text) return new Response(JSON.stringify({ error: "empty_ai_response" }), { status: 502, headers: corsHeaders });
    return new Response(JSON.stringify({ text, label: "ديوان AI" }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }), { status: 500, headers: corsHeaders });
  }
});
