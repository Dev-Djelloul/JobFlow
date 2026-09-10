import { Download, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadDataUrl } from "@/lib/files";
import type { CvFile } from "@/types/cv";

/** Aperçu inline (à la Gamma) du CV PDF importé — les navigateurs modernes rendent nativement
 * un PDF dans un <iframe>, donc pas besoin de bibliothèque de rendu supplémentaire. */
export function CvFilePreview({
  file,
  onDelete,
  height = 420,
}: {
  file: CvFile;
  onDelete?: () => void;
  height?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="truncate text-sm text-muted-foreground">{file.fileName}</p>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(file.dataUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-3.5" /> Nouvel onglet
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadDataUrl(file.dataUrl, file.fileName)}
          >
            <Download className="size-3.5" /> Télécharger
          </Button>
          {onDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onDelete();
                toast.success("CV importé supprimé");
              }}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          ) : null}
        </div>
      </div>
      <iframe
        src={file.dataUrl}
        title={file.fileName}
        className="w-full rounded-lg border border-border"
        style={{ height }}
      />
    </div>
  );
}
