import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { REPORT_REASONS, submitReport, type ReportReason } from "@/services/moderation.service";

export function ReportDialog({
  trigger,
  targetUserId,
  messageId,
  roomId,
}: {
  trigger: ReactNode;
  targetUserId?: string | null;
  messageId?: string | null;
  roomId?: string | null;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");

  const labels: Record<ReportReason, string> = {
    spam: t.moderation.reasonSpam,
    abuse: t.moderation.reasonAbuse,
    hate: t.moderation.reasonHate,
    sexual: t.moderation.reasonSexual,
    other: t.moderation.reasonOther,
  };

  const send = useMutation({
    mutationFn: () =>
      submitReport({
        reporterId: user!.id,
        targetUserId: targetUserId ?? null,
        messageId: messageId ?? null,
        roomId: roomId ?? null,
        reason,
        details,
      }),
    onSuccess: () => {
      toast.success(t.moderation.reported);
      setOpen(false);
      setDetails("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.moderation.reportTitle}</DialogTitle>
          <DialogDescription>{t.moderation.reportDesc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t.moderation.reason}</legend>
            <RadioGroup value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
              {REPORT_REASONS.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <RadioGroupItem value={item} id={`reason-${item}`} />
                  <Label htmlFor={`reason-${item}`} className="font-normal">
                    {labels[item]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="report-details">{t.moderation.details}</Label>
            <Textarea
              id="report-details"
              value={details}
              maxLength={1000}
              onChange={(event) => setDetails(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={() => send.mutate()} disabled={send.isPending || !user}>
            {send.isPending ? t.common.loading : t.moderation.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
