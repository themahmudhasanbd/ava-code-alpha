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

let savedTabs: TerminalTab[] = [];
let savedActiveTabId = "";

export function getTerminalTabs(defaultCwd: string): { tabs: TerminalTab[]; activeTabId: string } {
  if (savedTabs.length === 0) {
    const initial = makeTerminalTab("bash-1", defaultCwd);
    savedTabs = [initial];
    savedActiveTabId = initial.id;
  }
  return { tabs: savedTabs, activeTabId: savedActiveTabId };
}

export function saveTerminalTabs(tabs: TerminalTab[], activeTabId: string) {
  savedTabs = tabs;
  savedActiveTabId = activeTabId;
}
