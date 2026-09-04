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
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/profile/UserAvatar";
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


function NavLinks({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <TooltipProvider delayDuration={150}>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const link = (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              aria-label={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "px-3",
                active
                  ? "bg-sidebar-primary/12 text-sidebar-primary"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {collapsed ? null : label}
            </Link>
          );
          if (!collapsed) return link;
          return (
            <Tooltip key={to}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 px-1", collapsed && "justify-center px-0")}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Briefcase className="size-4" />
      </div>
      <div className={cn("leading-tight", collapsed && "hidden")}>
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
  const { settings, updateSettings } = useSettings();
  const collapsed = settings.sidebarCollapsed;

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden flex-col border-r border-sidebar-border bg-sidebar p-4 transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <Brand collapsed={collapsed} />
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavLinks collapsed={collapsed} />
        </div>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn("mb-2", collapsed ? "self-center" : "justify-start gap-2")}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {collapsed ? null : "Replier le menu"}
        </Button>
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3",
            collapsed && "justify-center border-0 bg-transparent p-0",
          )}
        >
          <UserAvatar
            name={settings.name}
            avatar={settings.avatar}
            preset={settings.avatarPreset}
          />
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="truncate text-sm font-medium">{settings.name || "Utilisateur"}</p>
            <p className="truncate text-xs text-muted-foreground">{settings.email}</p>
          </div>
        </div>
      </aside>

      <div className={cn(collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-4">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <div className="mt-6">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
                <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3">
                  <UserAvatar
                    name={settings.name}
                    avatar={settings.avatar}
                    preset={settings.avatarPreset}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{settings.name || "Utilisateur"}</p>
                    <p className="truncate text-xs text-muted-foreground">{settings.email}</p>
                  </div>
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
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
                onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
              >
                {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </Button>
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
