import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Globe, RotateCw } from "lucide-react";

import { GlassIconButton, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { APP } from "@/config/app";

export const Route = createFileRoute("/browser")({
  head: () => ({
    meta: [
      { title: "Browser — AvA Code" },
      { name: "description", content: "Preview websites and your running apps inside AvA Code." },
      { property: "og:title", content: "Browser — AvA Code" },
      { property: "og:description", content: "Preview websites and your running apps inside AvA Code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrowserPage,
});

function normalize(input: string) {
  const t = input.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(t) ? `http://${t}` : `https://${t}`;
}

function BrowserPage() {
  const [address, setAddress] = useState<string>(APP.defaultBrowserUrl);
  const [url, setUrl] = useState<string>(APP.defaultBrowserUrl);
  const [reloadKey, setReloadKey] = useState(0);

  const go = () => {
    const next = normalize(address);
    if (next) {
      setAddress(next);
      setUrl(next);
      setReloadKey((k) => k + 1);
    }
  };

  return (
    <AppShell title="Browser">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 py-4">
        <Surface className="flex items-center gap-2 p-1.5">
          <Globe className="ml-2 size-4 shrink-0 text-muted-foreground" />
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="Enter a URL"
            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
            inputMode="url"
          />
          <GlassIconButton label="Go" onClick={go}><ArrowRight className="size-4" /></GlassIconButton>
          <GlassIconButton label="Reload" onClick={() => setReloadKey((k) => k + 1)}><RotateCw className="size-4" /></GlassIconButton>
          <GlassIconButton label="Open in new tab" onClick={() => window.open(url, "_blank", "noopener")}><ExternalLink className="size-4" /></GlassIconButton>
        </Surface>
        <Surface className="relative min-h-[60vh] flex-1 overflow-hidden p-0">
          <iframe key={reloadKey} src={url} title="Browser preview" className="absolute inset-0 size-full bg-background" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
        </Surface>
        <p className="text-center text-xs text-muted-foreground">Some sites block being shown inside apps — use “Open in new tab” for those.</p>
      </div>
    </AppShell>
  );
}
