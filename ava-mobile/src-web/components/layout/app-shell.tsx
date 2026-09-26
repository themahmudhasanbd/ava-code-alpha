import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { StatusDot } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { AppDrawer } from "./app-drawer";

/** Shared page frame: floating glass header + drawer. Redirects to sign-in when signed out. */
export function AppShell({ title, actions, children, swipeDrawer = false }: { title?: string; actions?: ReactNode; children: ReactNode; swipeDrawer?: boolean }) {
  const { ready, auth, status } = useAva();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const gesture = useRef<{ x: number; y: number } | null>(null);

  const startSwipe = (event: PointerEvent<HTMLElement>) => {
    if (swipeDrawer && event.pointerType === "touch" && event.clientX <= 28) {
      gesture.current = { x: event.clientX, y: event.clientY };
    }
  };

  const finishSwipe = (event: PointerEvent<HTMLElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = Math.abs(event.clientY - start.y);
    if (dx > 64 && dx > dy * 1.4) setDrawer(true);
  };

  useEffect(() => {
    if (ready && !auth) navigate({ to: "/login" });
  }, [ready, auth, navigate]);

  if (!ready || !auth) return <main className="min-h-dvh bg-background app-glow" />;

  return (
    <main
      className="relative flex h-dvh flex-col overflow-hidden bg-background app-glow text-foreground"
      onPointerDown={startSwipe}
      onPointerUp={finishSwipe}
      onPointerCancel={() => { gesture.current = null; }}
    >
      <header className="glass z-20 mx-3 mt-3 flex h-14 shrink-0 items-center justify-between rounded-2xl px-2 sm:mx-5 sm:h-16 sm:px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppDrawer open={drawer} onOpenChange={setDrawer} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{APP.name}</span>
              <StatusDot status={status} />
            </div>
            {title && <p className="truncate text-xs text-muted-foreground">{title}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">{actions}</div>
      </header>
      {children}
    </main>
  );
}
