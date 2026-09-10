import { cn } from "@/lib/utils";
import type { ApplicationSource } from "@/types/application";

/** Sources pour lesquelles un logo est disponible — les autres restent en texte seul. */
const SOURCE_LOGO_SRC: Partial<Record<ApplicationSource, string>> = {
  france_travail: "/img/France-Travail-logo.jpg",
  adzuna: "/img/adzuna-logo.svg",
  linkedin: "/img/linkedin-logo-png.png",
  indeed: "/img/Indeed-logo.png",
  welcome_to_the_jungle: "/img/welcome-to-the-jungle-logo.png",
};

export function hasSourceLogo(source?: string): boolean {
  return !!source && source in SOURCE_LOGO_SRC;
}

export function SourceLogo({
  source,
  size = 16,
  className,
  title,
}: {
  source?: string;
  size?: number;
  className?: string;
  title?: string | undefined;
}) {
  if (!source || !(source in SOURCE_LOGO_SRC)) return null;
  const src = SOURCE_LOGO_SRC[source as ApplicationSource];
  return (
    <img
      src={src}
      alt={title ?? ""}
      aria-hidden={!title}
      title={title}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
