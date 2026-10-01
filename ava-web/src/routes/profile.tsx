import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { PageIntro, StatusDot, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AvA Code" },
      { name: "description", content: "Your AvA Code account, server and session summary." },
      { property: "og:title", content: "Profile — AvA Code" },
      { property: "og:description", content: "Your AvA Code account, server and session summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { auth, status, signOut } = useAva();
  const navigate = useNavigate();
  const sessions = useSessions();

  const projects = new Set((sessions.data ?? []).map((s) => s.directory)).size;

  return (
    <AppShell title="Profile">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <PageIntro title="Profile" />

        <Surface className="flex items-center gap-3 px-4 py-4">
          <img src={APP.logo} alt="" className="size-12 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{auth?.username ?? "—"}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <StatusDot status={status} /> {auth?.serverUrl}
            </p>
          </div>
        </Surface>

        <div className="grid grid-cols-2 gap-3">
          <Surface className="px-3 py-3">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="mt-1 text-lg font-semibold">{sessions.data?.length ?? "—"}</p>
          </Surface>
          <Surface className="px-3 py-3">
            <p className="text-xs text-muted-foreground">Projects</p>
            <p className="mt-1 text-lg font-semibold">{sessions.data ? projects : "—"}</p>
          </Surface>
        </div>

        <Button
          variant="secondary"
          className="glass h-11 w-full rounded-xl"
          onClick={() => {
            signOut();
            navigate({ to: "/login" });
          }}
        >
          <LogOut /> Sign out
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {APP.name} v{APP.version} · {APP.tagline}
        </p>
      </div>
    </AppShell>
  );
}
