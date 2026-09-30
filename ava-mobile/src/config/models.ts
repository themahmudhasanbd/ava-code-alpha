import type { ModelInfo } from "@/core/types";

/** Reasoning levels accepted by models and engines. */
export const REASONING_EFFORTS = ["low", "medium", "max", "ultra"] as const;

/** Sandbox modes the agent server understands. */
export const SANDBOX_MODES = [
  { id: "read-only", label: "Read only", description: "Can read files, cannot change anything" },
  { id: "workspace-write", label: "Workspace", description: "Can edit files inside the project" },
  { id: "danger-full-access", label: "Full access", description: "No limits on files or commands" },
] as const;

/** No hardcoded fallback models. Models must come dynamically from server or configured providers. */
export const DEFAULT_FALLBACK_MODELS: ModelInfo[] = [];

/** Backward compatibility alias */
export const CURATED_MODELS = DEFAULT_FALLBACK_MODELS;
