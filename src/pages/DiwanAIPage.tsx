import { useState } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { askDiwanAI } from "@/server/openai.server";

export function DiwanAIPage() {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk() {
    const value = message.trim();
    if (!value || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const result = await askDiwanAI({ data: { message: value } });
      setAnswer(result || "ما حصلت على جواب حالياً. حاول مرة ثانية.");
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بمساعد ديوان حالياً. تأكد من إعدادات الخادم وحاول مرة ثانية.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8" dir="rtl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ديوان AI</h1>
          <p className="text-sm text-muted-foreground">مساعد عربي داخل منصة ديوان</p>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            اسأل ديوان
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                void handleAsk();
              }
            }}
            placeholder="اكتب سؤالك هنا..."
            className="min-h-32 resize-y"
            maxLength={4000}
            disabled={loading}
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Ctrl + Enter للإرسال</span>
            <Button onClick={() => void handleAsk()} disabled={!message.trim() || loading}>
              {loading ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <Send className="ms-2 h-4 w-4" />}
              {loading ? "جاري التفكير..." : "إرسال"}
            </Button>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {answer && (
            <div className="rounded-2xl border bg-muted/40 p-5 leading-8 whitespace-pre-wrap">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Bot className="h-4 w-4 text-primary" />
                ديوان AI
              </div>
              {answer}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
