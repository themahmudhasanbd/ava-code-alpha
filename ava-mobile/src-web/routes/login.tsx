import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Surface } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP } from "@/config/app";
import { verifyLogin } from "@/core/auth";
import { useAva } from "@/state/ava-provider";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — AvA Code" },
      { name: "description", content: "Sign in to your AvA Code server." },
      { property: "og:title", content: "Sign in — AvA Code" },
      { property: "og:description", content: "Sign in to your AvA Code server." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAva();
  const navigate = useNavigate();
  const [server, setServer] = useState<string>(APP.defaultServerUrl);
  const [username, setUsername] = useState<string>(APP.defaultUsername);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      signIn(await verifyLogin(server, username, password));
      navigate({ to: "/" });
    } catch (err) {
      setError((err as Error).message === "Failed to fetch" ? "Could not reach the server" : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background app-glow px-4">
      <Surface className="w-full max-w-sm p-6">
        <img src={APP.logo} alt={APP.name} className="size-12 rounded-xl object-cover" />
        <h1 className="mt-4 text-xl font-semibold">Sign in to {APP.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use your server login.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="server">Server</Label>
            <Input id="server" value={server} onChange={(e) => setServer(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user">Username</Label>
            <Input id="user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pass">Password</Label>
            <Input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="rounded-xl" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="h-10 w-full rounded-xl">
            {busy && <Loader2 className="animate-spin" />} Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">v{APP.version}</p>
      </Surface>
    </main>
  );
}
