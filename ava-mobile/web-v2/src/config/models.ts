import type { ModelInfo } from "@/core/types";

/** Reasoning levels the OmniRoute combos accept. */
export const REASONING_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

/** Sandbox modes the agent server understands. */
export const SANDBOX_MODES = [
  { id: "read-only", label: "Read only", description: "Can read files, cannot change anything" },
  { id: "workspace-write", label: "Workspace", description: "Can edit files inside the project" },
  { id: "danger-full-access", label: "Full access", description: "No limits on files or commands" },
] as const;

const combo = (id: string, name: string, description: string): ModelInfo => ({
  id,
  name,
  description,
  provider: "omniroute",
  supportsImages: true,
  reasoningEfforts: [...REASONING_EFFORTS],
});

/** Curated OmniRoute combos — same list the mobile app ships with. */
export const CURATED_MODELS: ModelInfo[] = [
  combo("ultra-working-combo", "Ultra Working Combo", "Best overall working combo"),
  combo("powerful-coding-combo", "Powerful Coding Combo", "Strong coding combo"),
  combo("omni-codex-combo", "Omni Codex Combo", "Codex-style coding combo"),
  combo("auto/best-coding", "Auto Best Coding", "Automatically picks the best coder"),
];
