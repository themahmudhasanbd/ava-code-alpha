import type { ModelInfo } from "@/core/types";

/** Reasoning levels accepted by models and engines. */
export const REASONING_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

/** Sandbox modes the agent server understands. */
export const SANDBOX_MODES = [
  { id: "read-only", label: "Read only", description: "Can read files, cannot change anything" },
  { id: "workspace-write", label: "Workspace", description: "Can edit files inside the project" },
  { id: "danger-full-access", label: "Full access", description: "No limits on files or commands" },
] as const;

/** Google Antigravity OAuth client configuration */
export const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
export const ANTIGRAVITY_CLIENT_SECRET = "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";
export const ANTIGRAVITY_REDIRECT_URI = "http://localhost:51121/callback";
export const ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
].join(" ");

export function getAntigravityAuthUrl(state?: string): string {
  const stateVal = state || Math.random().toString(36).substring(2, 15);
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    ANTIGRAVITY_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(ANTIGRAVITY_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(
    ANTIGRAVITY_SCOPES
  )}&access_type=offline&prompt=consent&state=${encodeURIComponent(stateVal)}`;
}

const m = (
  id: string,
  name: string,
  description: string,
  provider: string = "inbuilt",
  supportsImages: boolean = true,
  reasoning: boolean = true
): ModelInfo => ({
  id,
  name,
  description,
  provider,
  supportsImages,
  reasoning,
  reasoningEfforts: [...REASONING_EFFORTS],
});

/** Fallback models when server/dynamic catalog is loading or offline (all static combos removed). */
export const DEFAULT_FALLBACK_MODELS: ModelInfo[] = [
  m("gpt-6-astra", "GPT-6 Astra", "Advanced frontier model for complex tasks & deep reasoning", "server", true, true),
  m("gpt-5.6-sol", "GPT-5.6 Sol", "Frontier agentic coding model with precision execution", "server", true, true),
  m("gpt-5.6-terra", "GPT-5.6 Terra", "Balanced everyday coding and architectural design", "server", true, true),
  m("gpt-5.6-luna", "GPT-5.6 Luna", "Fast, lightweight agentic coding model", "server", true, true),
  m("gpt-5.5", "GPT-5.5", "Frontier model for complex research and software engineering", "server", true, true),
  m("gemini-3.8-flash-high", "Gemini 3.8 Flash (High)", "Deep thinking Gemini 3.8 with extended reasoning", "antigravity", true, true),
  m("gemini-3.7-flash-high", "Gemini 3.7 Flash (High)", "Balanced Gemini 3.7 Flash for fast agentic coding", "antigravity", true, true),
  m("gemini-3.1-pro-high", "Gemini 3.1 Pro Agent", "Enterprise agentic coding & large codebase reasoning", "antigravity", true, true),
  m("claude-sonnet-4-6", "Claude Sonnet 4.6 (Thinking)", "High-speed Claude Sonnet 4.6 with extended reasoning", "antigravity", true, true),
  m("claude-opus-4-6-thinking", "Claude Opus 4.6 (Thinking)", "Next-gen Claude Opus reasoning engine via Antigravity", "antigravity", true, true),
  m("claude-3-7-sonnet", "Claude 3.7 Sonnet", "Anthropic Claude 3.7 Sonnet hybrid reasoning & coding", "server", true, true),
  m("deepseek-r1", "DeepSeek R1", "Open reasoning powerhouse with transparent chain of thought", "server", false, true),
];

/** Backward compatibility alias */
export const CURATED_MODELS = DEFAULT_FALLBACK_MODELS;
