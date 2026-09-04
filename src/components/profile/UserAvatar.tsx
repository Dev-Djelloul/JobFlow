import { cn } from "@/lib/utils";
import { initialsFromName, presetClassName } from "@/lib/avatars";

/** Avatar de l'utilisateur : photo importée si présente, sinon avatar prédéfini + initiales. */
export function UserAvatar({
  name,
  avatar,
  preset,
  className,
}: {
  name?: string;
  avatar?: string;
  preset?: string;
  className?: string;
}) {
  const initials = initialsFromName(name);
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`Photo de profil de ${name || "l'utilisateur"}`}
        className={cn("size-9 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        presetClassName(preset),
        className,
      )}
    >
      {initials}
    </span>
  );
}
