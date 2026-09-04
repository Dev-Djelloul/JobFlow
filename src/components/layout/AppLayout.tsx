import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Briefcase,
  Building2,
  LayoutDashboard,
  KanbanSquare,
  ListTodo,
  Settings,
  Sparkles,
  Users,
  Mail,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidatures", label: "Candidatures", icon: Briefcase },
  { to: "/actions", label: "Actions", icon: ListTodo },
  { to: "/intelligence", label: "À votre attention", icon: Sparkles },
  { to: "/entreprises", label: "Entreprises", icon: Building2 },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/emails", label: "Emails", icon: Mail },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/kanban", label: "Vue Kanban", icon: KanbanSquare },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;


function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary/12 text-sidebar-primary"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Briefcase className="size-4" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-sm font-bold">JobFlow</p>
        <p className="text-[11px] text-muted-foreground">Suivi de candidatures</p>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { settings, updateSettings } = useSettings();
  const dark = settings.theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function AppLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Brand />
        <div className="mt-6 flex-1">
          <NavLinks />
        </div>
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3">
          <p className="truncate text-sm font-medium">{settings.name || "Utilisateur"}</p>
          <p className="truncate text-xs text-muted-foreground">{settings.email}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-4">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <div className="mt-6">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
              {description ? (
                <p className="hidden truncate text-sm text-muted-foreground sm:block">{description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {actions}
            </div>
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-7xl px-4 sm:px-6",
            settings.density === "compact" ? "py-4" : "py-6 sm:py-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
