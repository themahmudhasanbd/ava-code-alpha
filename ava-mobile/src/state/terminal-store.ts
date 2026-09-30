import { storage } from "@/core/storage";

export interface TerminalEntry {
  id: number;
  command: string;
  output: string;
  exitCode: number;
  timestamp: number;
}

export interface TerminalTab {
  id: string;
  name: string;
  cwd: string;
  history: TerminalEntry[];
  commandHistory: string[];
  historyIndex: number;
}

export function makeTerminalTab(name: string, cwd: string): TerminalTab {
  return {
    id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    cwd,
    history: [],
    commandHistory: [],
    historyIndex: -1,
  };
}

// Audit C30 — persist tabs so they survive app restarts. Best-effort with
// in-memory fallback; corrupt cache falls back to a fresh tab.
const TABS_KEY = "ava.terminal.tabs";
const ACTIVE_TAB_KEY = "ava.terminal.activeTabId";

let savedTabs: TerminalTab[] = [];
let savedActiveTabId = "";
let hydrated = false;

function persistTabs() {
  try {
    storage.set(TABS_KEY, JSON.stringify(savedTabs));
    storage.set(ACTIVE_TAB_KEY, savedActiveTabId);
  } catch {
    // Persisting tabs is best-effort; the in-memory copy stays authoritative.
  }
}

export function getTerminalTabs(defaultCwd: string): { tabs: TerminalTab[]; activeTabId: string } {
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = storage.get(TABS_KEY);
      const savedId = storage.get(ACTIVE_TAB_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          savedTabs = parsed as TerminalTab[];
          if (typeof savedId === "string" && savedId) savedActiveTabId = savedId;
        }
      }
    } catch {
      // Corrupt or missing cache — fall through to a fresh tab.
    }
  }
  if (savedTabs.length === 0) {
    const initial = makeTerminalTab("bash-1", defaultCwd);
    savedTabs = [initial];
    savedActiveTabId = initial.id;
    persistTabs();
  }
  return { tabs: savedTabs, activeTabId: savedActiveTabId };
}

export function saveTerminalTabs(tabs: TerminalTab[], activeTabId: string) {
  savedTabs = tabs;
  savedActiveTabId = activeTabId;
  persistTabs();
}
