import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataBackupSection } from "@/components/settings/DataBackupSection";
import { useSettings } from "@/hooks/useSettings";
import { useApplications } from "@/hooks/useApplications";
import type { UserSettings } from "@/types/application";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — JobFlow" },
      {
        name: "description",
        content:
          "Modifiez votre nom, votre email, vos préférences d'affichage et basculez entre le mode clair et sombre.",
      },
      { property: "og:title", content: "Paramètres — JobFlow" },
      {
        property: "og:description",
        content: "Profil, préférences d'affichage et thème clair/sombre de JobFlow.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, hydrated } = useSettings();
  const { resetDemoData } = useApplications();
  const [name, setName] = useState(settings.name);
  const [email, setEmail] = useState(settings.email);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated) {
      setName(settings.name);
      setEmail(settings.email);
    }
  }, [hydrated, settings.name, settings.email]);

  const saveProfile = () => {
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Adresse email invalide.");
      return;
    }
    setError(null);
    updateSettings({ name: name.trim(), email: email.trim() });
    toast.success("Profil enregistré");
  };

  return (
    <AppLayout title="Paramètres" description="Profil et préférences d'affichage">
      <div className="grid max-w-3xl gap-4">
        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Profil</CardTitle>
            <CardDescription>Ces informations s'affichent dans la barre latérale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button onClick={saveProfile}>Enregistrer</Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Préférences d'affichage</CardTitle>
            <CardDescription>Adaptez l'interface à votre façon de travailler.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Mode sombre</p>
                <p className="text-sm text-muted-foreground">Basculer entre thème clair et sombre.</p>
              </div>
              <Switch
                checked={settings.theme === "dark"}
                onCheckedChange={(checked) => updateSettings({ theme: checked ? "dark" : "light" })}
                aria-label="Mode sombre"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Densité</p>
                <p className="text-sm text-muted-foreground">Espacement général des pages.</p>
              </div>
              <Select
                value={settings.density}
                onValueChange={(v) => updateSettings({ density: v as UserSettings["density"] })}
              >
                <SelectTrigger className="w-44" aria-label="Densité">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Confortable</SelectItem>
                  <SelectItem value="compact">Compacte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Vue préférée</p>
                <p className="text-sm text-muted-foreground">Affichage privilégié des candidatures.</p>
              </div>
              <Select
                value={settings.defaultView}
                onValueChange={(v) => updateSettings({ defaultView: v as UserSettings["defaultView"] })}
              >
                <SelectTrigger className="w-44" aria-label="Vue préférée">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Tableau</SelectItem>
                  <SelectItem value="kanban">Kanban</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Sauvegarde et données</CardTitle>
            <CardDescription>
              Les candidatures sont enregistrées localement dans votre navigateur. Exportez-les pour
              les conserver ou les réimporter ailleurs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <DataBackupSection />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Réinitialiser les données de démonstration</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Réinitialiser les données ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Toutes vos candidatures actuelles seront remplacées par le jeu de données de
                    démonstration.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetDemoData();
                      toast.success("Données réinitialisées");
                    }}
                  >
                    Réinitialiser
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
