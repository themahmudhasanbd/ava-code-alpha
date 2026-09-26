import { Link } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";

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
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-sidebar-accent/70 p-1">
              <TabsTrigger value="menu" className="rounded-lg">Menu</TabsTrigger>
              <TabsTrigger value="sessions" className="rounded-lg">Sessions</TabsTrigger>
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
