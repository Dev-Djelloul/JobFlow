import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApplications } from "@/hooks/useApplications";
import {
  applyImport,
  autoMapping,
  FIELD_LABELS,
  IGNORE,
  IMPORT_FIELDS,
  parseCsv,
  prepareRows,
  type DuplicateStrategy,
  type ImportField,
  type ImportReport,
  type Mapping,
} from "@/lib/csv-import";

const STRATEGY_LABELS: Record<DuplicateStrategy, string> = {
  skip: "Ignorer les doublons",
  update: "Mettre à jour les doublons",
  create: "Créer quand même",
};

export function CsvImportSection() {
  const { applications, replaceAllApplications } = useApplications();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>([]);
  const [strategy, setStrategy] = useState<DuplicateStrategy>("skip");
  const [report, setReport] = useState<ImportReport | null>(null);

  const prepared = useMemo(
    () => (rows.length > 0 ? prepareRows(rows, mapping, applications) : []),
    [rows, mapping, applications],
  );

  const stats = useMemo(() => {
    const errors = prepared.filter((r) => r.errors.length > 0).length;
    const duplicates = prepared.filter((r) => r.errors.length === 0 && r.duplicateOfId).length;
    return {
      total: prepared.length,
      errors,
      duplicates,
      creatable: prepared.length - errors - (strategy === "skip" ? duplicates : 0),
      warnings: prepared.filter((r) => r.warnings.length > 0).length,
    };
  }, [prepared, strategy]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast.error("Fichier CSV vide ou sans ligne de données.");
      return;
    }
    const [head, ...body] = parsed;
    setFileName(file.name);
    setHeaders(head!);
    setRows(body);
    setMapping(autoMapping(head!));
    setReport(null);
    setOpen(true);
  };

  const setColumn = (index: number, value: string) => {
    setMapping((prev) => {
      const next = [...prev];
      // Un champ ne peut être mappé qu'une seule fois.
      if (value !== IGNORE) {
        for (let i = 0; i < next.length; i++) if (next[i] === value) next[i] = IGNORE;
      }
      next[index] = value as ImportField | typeof IGNORE;
      return next;
    });
  };

  const confirmImport = () => {
    const { applications: result, report: r } = applyImport(applications, prepared, strategy);
    replaceAllApplications(result);
    setReport(r);
    toast.success(
      `${r.created} créée(s), ${r.updated} mise(s) à jour, ${r.skipped} ignorée(s), ${r.errors} en erreur.`,
    );
  };

  const close = () => {
    setOpen(false);
    setRows([]);
    setHeaders([]);
    setReport(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const mappedFields = new Set(mapping.filter((m) => m !== IGNORE));
  const missingRequired = ["company", "position"].filter(
    (f) => !mappedFields.has(f as ImportField),
  ) as ImportField[];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Importer un CSV</p>
        <p className="text-sm text-muted-foreground">
          Importez un export LinkedIn, Indeed ou un tableur personnel. Les colonnes sont détectées
          automatiquement et restent modifiables avant validation. Le fichier est lu localement.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <FileSpreadsheet className="size-4" /> Choisir un fichier CSV
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importer « {fileName} »</DialogTitle>
            <DialogDescription>
              {rows.length} ligne(s) détectée(s). Vérifiez la correspondance des colonnes puis
              l'aperçu avant de valider.
            </DialogDescription>
          </DialogHeader>

          {report ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" /> Import terminé
              </div>
              <ul className="space-y-1 text-sm">
                <li>{report.created} candidature(s) créée(s)</li>
                <li>{report.updated} candidature(s) mise(s) à jour</li>
                <li>{report.skipped} doublon(s) ignoré(s)</li>
                <li>{report.errors} ligne(s) en erreur</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Correspondance des colonnes</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {headers.map((header, index) => (
                    <div key={`${header}-${index}`} className="grid gap-1">
                      <span className="truncate text-xs text-muted-foreground">
                        {header || `Colonne ${index + 1}`}
                      </span>
                      <Select
                        value={mapping[index] ?? IGNORE}
                        onValueChange={(v) => setColumn(index, v)}
                      >
                        <SelectTrigger aria-label={`Colonne ${header}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORE}>Ne pas importer</SelectItem>
                          {IMPORT_FIELDS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {FIELD_LABELS[f]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                {missingRequired.length > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Colonnes obligatoires non mappées :{" "}
                    {missingRequired.map((f) => FIELD_LABELS[f]).join(", ")}.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Doublons détectés (même entreprise et même poste)</Label>
                <Select value={strategy} onValueChange={(v) => setStrategy(v as DuplicateStrategy)}>
                  <SelectTrigger aria-label="Stratégie doublons">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STRATEGY_LABELS) as DuplicateStrategy[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STRATEGY_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  La mise à jour ne remplace que les champs renseignés dans le CSV : aucune donnée
                  existante n'est effacée.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{stats.total} lignes</Badge>
                <Badge variant="outline">{stats.duplicates} doublons</Badge>
                <Badge variant="outline">{stats.warnings} avertissements</Badge>
                <Badge variant="outline">{stats.errors} erreurs</Badge>
              </div>

              <div className="space-y-2">
                <Label>Aperçu (10 premières lignes)</Label>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="p-2 font-medium">Entreprise</th>
                        <th className="p-2 font-medium">Poste</th>
                        <th className="p-2 font-medium">Date</th>
                        <th className="p-2 font-medium">Statut</th>
                        <th className="p-2 font-medium">État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prepared.slice(0, 10).map((row) => (
                        <tr key={row.index} className="border-t align-top">
                          <td className="p-2">{row.values.company || "—"}</td>
                          <td className="p-2">{row.values.position || "—"}</td>
                          <td className="p-2">{row.values.application_date || "—"}</td>
                          <td className="p-2">{row.values.status}</td>
                          <td className="p-2">
                            {row.errors.length > 0 ? (
                              <span className="text-destructive">{row.errors.join(", ")}</span>
                            ) : row.duplicateOfId ? (
                              <span className="text-warning">Doublon : {row.duplicateLabel}</span>
                            ) : row.warnings.length > 0 ? (
                              <span className="text-muted-foreground">
                                {row.warnings.join(", ")}
                              </span>
                            ) : (
                              <span className="text-success">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {report ? "Fermer" : "Annuler"}
            </Button>
            {!report && (
              <Button
                onClick={confirmImport}
                disabled={missingRequired.length > 0 || stats.total === stats.errors}
              >
                <Upload className="size-4" /> Importer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
