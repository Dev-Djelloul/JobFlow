import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/hooks/useSettings";
import { extractPdfText } from "@/lib/pdf-extract";

export function CvImportSection() {
  const { settings, updateSettings } = useSettings();
  const [text, setText] = useState(settings.cvImportedText);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dirty = text !== settings.cvImportedText;

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont pris en charge pour l'import.");
      return;
    }
    setExtracting(true);
    try {
      const extracted = await extractPdfText(file);
      if (!extracted) {
        toast.error(
          "Aucun texte n'a pu être extrait (PDF scanné en image ?). Collez le contenu manuellement ci-dessous.",
        );
        return;
      }
      setText(extracted);
      toast.info(
        "Texte extrait — relisez-le avant d'enregistrer, l'extraction automatique n'est jamais garantie parfaite.",
      );
    } catch {
      toast.error("Échec de l'extraction du PDF. Collez le contenu manuellement ci-dessous.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = () => {
    updateSettings({ cvImportedText: text });
    toast.success("CV importé enregistré");
  };

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader>
        <CardTitle className="text-base">CV existant (import)</CardTitle>
        <CardDescription>
          Importez votre CV actuel en PDF pour que l'IA s'en serve comme base lors de la génération
          d'un CV optimisé ATS. L'extraction automatique du texte n'est jamais parfaite : relisez et
          corrigez avant d'enregistrer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
          >
            <FileUp className="size-4" />
            {extracting ? "Extraction en cours…" : "Importer un CV PDF"}
          </Button>
          {dirty ? (
            <Button type="button" size="sm" onClick={handleSave}>
              <Save className="size-4" /> Enregistrer
            </Button>
          ) : null}
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Le texte extrait de votre CV apparaîtra ici — vous pouvez aussi le coller ou le corriger directement."
          className="font-mono text-sm"
        />
      </CardContent>
    </Card>
  );
}
