import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { motion } from "motion/react";

import { GlassIconButton, StatusDot } from "@/components/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP } from "@/config/app";
import { NAV_SECTIONS } from "@/config/navigation";
import { useAva } from "@/state/ava-provider";
import { SessionsList } from "./sessions-list";

export function AppDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { auth, status, signOut } = useAva();
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <GlassIconButton label="Open navigation" className="shrink-0">
          <Menu />
        </GlassIconButton>
      </SheetTrigger>
      <SheetContent side="left" className="glass m-2 flex h-[calc(100%-1rem)] w-[88vw] max-w-[22rem] flex-col gap-0 rounded-3xl p-0 [&>button]:right-3 [&>button]:top-3">
        <SheetHeader className="border-b border-sidebar-border px-4 py-3 pr-12 text-left">
          <div className="flex items-center gap-2.5">
            <div>
              <SheetTitle className="text-sm font-semibold">{APP.name}</SheetTitle>
              <SheetDescription className="text-xs">{APP.tagline} · v{APP.version}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="sessions" className="flex min-h-0 flex-1 flex-col">
          <div className="px-3 pt-3">
            <TabsList className="grid h-10 w-full grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
              {(
                [
                  { value: "menu", label: "Menu" },
                  { value: "sessions", label: "Sessions" },
                ] as const
              ).map(({ value, label }) => (
                <DrawerTabTrigger key={value} value={value} label={label} />
              ))}
            </TabsList>
          </div>

          <TabsContent value="menu" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {NAV_SECTIONS.map((section) => (
              <nav key={section.title} className="mb-5" aria-label={section.title}>
                <p className="px-3 pb-1.5 text-xs font-medium uppercase text-muted-foreground">{section.title}</p>
                {section.items.map((item) =>
                  item.to ? (
                    <Button key={item.label} asChild variant="ghost" className="h-10 w-full justify-start gap-3 rounded-xl px-3">
                      <Link to={item.to} onClick={close} activeProps={{ className: "bg-sidebar-accent" }}>
                        <item.icon /> {item.label}
                      </Link>
                    </Button>
                  ) : (
                    <Button key={item.label} variant="ghost" disabled className="h-10 w-full justify-start gap-3 rounded-xl px-3">
                      <item.icon /> {item.label}
                      <Badge variant="secondary" className="ml-auto text-[10px]">Soon</Badge>
                    </Button>
                  ),
                )}
              </nav>
            ))}
          </TabsContent>

          <TabsContent value="sessions" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <SessionsList onPick={close} />
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 border-t border-sidebar-border p-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold uppercase text-primary-foreground">
            {auth?.username.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{auth?.username}</span>
            <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <StatusDot status={status} /> {auth?.serverUrl.replace(/^https?:\/\//, "")}
            </span>
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Sign out" onClick={signOut}>
            <LogOut />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Animated sliding pill matching the composer's model/effort tab switcher. */
function DrawerTabTrigger({ value, label }: { value: "menu" | "sessions"; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="relative z-10 rounded-xl data-[state=active]:text-primary-foreground"
    >
      <DrawerTabPill tabValue={value} />
      {label}
    </TabsTrigger>
  );
}

function DrawerTabPill({ tabValue }: { tabValue: "menu" | "sessions" }) {
  // Radix exposes active state via data-state on the parent trigger; re-render
  // on click is ensured because Tabs value changes re-render children.
  const [active, setActive] = useState(false);
  useEffect(() => {
    const check = () => {
      const el = document.querySelector(`[role="tab"][data-state="active"]`) as HTMLElement | null;
      setActive(!!el && !!el.closest("[data-slot='tabs']") && el.getAttribute("aria-selected") === "true" && el.textContent?.trim() === LABELS[tabValue]);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-state", "aria-selected"] });
    return () => observer.disconnect();
  }, [tabValue]);
  if (!active) return null;
  return (
    <motion.span
      layoutId="drawer-tab-pill"
      className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm"
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
    />
  );
}

const LABELS: Record<string, string> = { menu: "Menu", sessions: "Sessions" };
