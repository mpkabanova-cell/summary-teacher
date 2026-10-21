import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendFeedback } from "@/lib/edgeInvoke";
import { trackEvent } from "@/lib/analytics";
import {
  markFeedbackSent,
  wasFeedbackSent,
} from "@/hooks/useSummarize";
import { toast } from "sonner";

interface FeedbackWidgetProps {
  visible: boolean;
}

export function FeedbackWidget({ visible }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(wasFeedbackSent());
  const [sending, setSending] = useState(false);

  if (!visible || sent) return null;

  const submit = async () => {
    setSending(true);
    try {
      await sendFeedback({ rating, message });
      trackEvent("ai_conspect_feedback_submit", {
        rating,
        message_present: Boolean(message.trim()),
        message_length: message.trim().length,
      });
      markFeedbackSent();
      setSent(true);
      setOpen(false);
      toast.success("Спасибо за отзыв!");
    } catch {
      toast.error("Не удалось отправить отзыв");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-80 rounded-xl border bg-card shadow-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-medium">Обратная связь</h3>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Оцените приложение (1–5)</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`h-9 w-9 rounded-lg border text-sm transition-colors ${
                  rating >= n
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Комментарий (необязательно)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <Button className="w-full" onClick={() => void submit()} disabled={sending}>
            Отправить
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="rounded-full shadow-lg h-auto px-5 py-3 gap-2"
          onClick={() => setOpen(true)}
        >
          <Star className="h-5 w-5 fill-current" />
          Оставить отзыв
        </Button>
      )}
    </div>
  );
}
