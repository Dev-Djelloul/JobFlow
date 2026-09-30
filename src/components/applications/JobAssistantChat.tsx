import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownLite } from "@/components/common/MarkdownLite";
import { askJobAssistant } from "@/lib/openrouter";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import type { Application } from "@/types/application";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Quelles compétences de l'offre dois-je le plus mettre en avant ?",
  "Quelles questions poser en entretien pour cette offre ?",
  "Quels écarts entre mon profil et cette offre ?",
];

interface Props {
  application: Application;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobAssistantChat({ application, open, onOpenChange }: Props) {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) return;
    // Repart d'une conversation vide à chaque réouverture : le contexte (offre + profil) est
    // toujours réinjecté par le serveur, une conversation qui traîne d'une candidature à l'autre
    // n'apporterait rien.
    setMessages([]);
    setInput("");
    setError(null);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (content: string) => {
    const text = content.trim();
    if (!text || loading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const result = await askJobAssistant({
        data: {
          position: application.position,
          company: application.company,
          jobContext: application.notes || undefined,
          cvSummary: settings.cvSummary || undefined,
          messages: nextMessages,
        },
      });
      if (!result.ok || !result.text) {
        setError(result.error ?? "La réponse a échoué.");
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: result.text }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            Assistant IA — {application.position}
          </DialogTitle>
          <DialogDescription>
            Posez vos questions sur cette offre (compétences à valoriser, questions à poser en
            entretien, points à clarifier…), à partir de l'offre et de votre profil (Paramètres).
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="min-h-[240px] flex-1 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3"
        >
          {messages.length === 0 ? (
            <div className="space-y-3 py-4">
              <p className="text-center text-sm text-muted-foreground">
                Pas encore de question — essayez par exemple :
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex items-start gap-2", m.role === "user" && "flex-row-reverse")}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                </span>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    m.role === "user"
                      ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                      : "border bg-background",
                  )}
                >
                  {m.role === "assistant" ? <MarkdownLite text={m.content} /> : m.content}
                </div>
              </div>
            ))
          )}
          {loading ? (
            <div className="flex items-start gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="size-3.5" />
              </span>
              <p className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
                Réflexion…
              </p>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Posez votre question sur cette offre…"
            rows={2}
            className="flex-1 resize-none"
          />
          <Button onClick={() => void send(input)} disabled={loading || !input.trim()}>
            <Send className="size-4" /> Envoyer
          </Button>
        </DialogFooter>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3" /> Réponses générées par IA à vérifier avant utilisation.
        </p>
      </DialogContent>
    </Dialog>
  );
}
