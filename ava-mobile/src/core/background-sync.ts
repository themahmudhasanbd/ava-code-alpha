import { AppState, type AppStateStatus } from "react-native";
import { notifyTurnComplete } from "./notifications";

class BackgroundSyncManager {
  private currentAppState: AppStateStatus = AppState.currentState;
  private pendingSyncSessions = new Set<string>();
  private syncCallbacks = new Set<(sessionIds: string[]) => void>();

  constructor() {
    AppState.addEventListener("change", this.handleAppStateChange);
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    const wasBackground =
      this.currentAppState === "background" || this.currentAppState === "inactive";
    this.currentAppState = nextState;

    if (wasBackground && nextState === "active") {
      this.flushPendingSync();
    }
  };

  public isBackground(): boolean {
    return (
      this.currentAppState === "background" || this.currentAppState === "inactive"
    );
  }

  /**
   * Called when a turn finishes running. If app is currently in background,
   * schedule a push/local notification and queue a background sync on foreground.
   */
  public onTurnDone(sessionId: string, title?: string, summary?: string) {
    if (this.isBackground()) {
      this.pendingSyncSessions.add(sessionId);
      notifyTurnComplete(sessionId, title, summary);
    }
  }

  public registerSyncListener(cb: (sessionIds: string[]) => void): () => void {
    this.syncCallbacks.add(cb);
    return () => {
      this.syncCallbacks.delete(cb);
    };
  }

  private flushPendingSync() {
    if (this.pendingSyncSessions.size === 0) return;
    const sessionIds = Array.from(this.pendingSyncSessions);
    this.pendingSyncSessions.clear();

    this.syncCallbacks.forEach((cb) => {
      try {
        cb(sessionIds);
      } catch (err) {
        console.warn("[BackgroundSync] syncCallback error:", err);
      }
    });
  }
}

export const backgroundSync = new BackgroundSyncManager();
