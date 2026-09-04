import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useSettings } from "@/hooks/useSettings";
import { AVATAR_PRESETS, fileToAvatarDataUrl, presetClassName, initialsFromName } from "@/lib/avatars";
import { cn } from "@/lib/utils";

/** Choix d'une photo de profil (import local) ou d'un avatar prédéfini. */
export function AvatarSection() {
  const { settings, updateSettings } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      updateSettings({ avatar: dataUrl });
      toast.success("Photo de profil mise à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar
          name={settings.name}
          avatar={settings.avatar}
          preset={settings.avatarPreset}
          className="size-16 text-base"
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Import…" : settings.avatar ? "Changer la photo" : "Importer une photo"}
          </Button>
          {settings.avatar ? (
            <Button variant="ghost" onClick={() => updateSettings({ avatar: "" })}>
              Retirer la photo
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Avatar prédéfini</p>
        <p className="text-sm text-muted-foreground">
          Utilisé quand aucune photo n'est importée.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AVATAR_PRESETS.map((preset) => {
            const active = settings.avatarPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-label={preset.label}
                aria-pressed={active}
                onClick={() => updateSettings({ avatarPreset: preset.id })}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full text-xs font-semibold ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  presetClassName(preset.id),
                  active ? "ring-2 ring-ring ring-offset-2" : "opacity-80 hover:opacity-100",
                )}
              >
                {initialsFromName(settings.name)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
