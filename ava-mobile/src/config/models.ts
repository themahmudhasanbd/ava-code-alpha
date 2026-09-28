import type { ModelInfo } from "@/core/types";

/** Reasoning levels accepted by OmniRoute and Antigravity. */
export const REASONING_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

/** Sandbox modes the agent server understands. */
export const SANDBOX_MODES = [
  { id: "read-only", label: "Read only", description: "Can read files, cannot change anything" },
  { id: "workspace-write", label: "Workspace", description: "Can edit files inside the project" },
  { id: "danger-full-access", label: "Full access", description: "No limits on files or commands" },
] as const;

const m = (
  id: string,
  name: string,
  description: string,
  provider: string = "omniroute",
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

/** Curated master catalog with OmniRoute, Google Antigravity, and Frontier models. */
export const CURATED_MODELS: ModelInfo[] = [
  // ── 1. OmniRoute Combos ──
  m("ultra-working-combo", "Ultra Working Combo", "Best overall multi-model coding ensemble", "omniroute", true, true),
  m("powerful-coding-combo", "Powerful Coding Combo", "High-accuracy coding & reasoning combo with full vision", "omniroute", true, true),
  m("omni-ava-combo", "Omni Ava Combo", "AvA-specialized autonomous coding engine", "omniroute", true, true),
  m("auto/best-coding", "Auto Best Coding", "Intelligently routes to the strongest coding model", "omniroute", true, true),
  m("auto/best-reasoning", "Auto Best Reasoning", "Maximum thinking depth & logical deduction", "omniroute", true, true),
  m("auto/best-vision", "Auto Best Vision", "Multimodal UI inspection & design recognition", "omniroute", true, true),
  m("auto/fast", "Auto Fast", "Ultra-low latency streaming for rapid iterations", "omniroute", true, false),

  // ── 2. Google Antigravity Models ──
  m("antigravity/gemini-3.7-flash-high", "Gemini 3.7 Flash (High)", "Deep thinking Gemini 3.7 with high reasoning budget", "antigravity", true, true),
  m("antigravity/gemini-3.7-flash-medium", "Gemini 3.7 Flash (Medium)", "Balanced Gemini 3.7 Flash for fast agentic coding", "antigravity", true, true),
  m("antigravity/gemini-3.1-pro-low", "Gemini 3.1 Pro Agent", "Enterprise agentic coding & large codebase reasoning", "antigravity", true, true),
  m("antigravity/claude-opus-4-6-thinking", "Claude Opus 4.6 (Thinking)", "Next-gen Claude Opus reasoning engine via Antigravity", "antigravity", true, true),
  m("antigravity/claude-sonnet-4-6", "Claude Sonnet 4.6 (Thinking)", "High-speed Claude Sonnet 4.6 with extended reasoning", "antigravity", true, true),
  m("antigravity/gpt-oss-120b-medium", "GPT-OSS 120B (Medium)", "Open-weights 120B frontier model with reasoning", "antigravity", false, true),

  // ── 3. Frontier Models ──
  m("gpt-6-astra", "GPT-6 Astra", "Advanced frontier model for complex tasks & deep reasoning", "omniroute", true, true),
  m("gpt-5.6-sol", "GPT-5.6 Sol", "Frontier agentic coding model with precision execution", "omniroute", true, true),
  m("gpt-5.6-terra", "GPT-5.6 Terra", "Balanced everyday coding and architectural design", "omniroute", true, true),
  m("gpt-5.6-luna", "GPT-5.6 Luna", "Fast, lightweight agentic coding model", "omniroute", true, true),
  m("gpt-5.5", "GPT-5.5", "Frontier model for complex research and software engineering", "omniroute", true, true),
  m("claude-3-7-sonnet", "Claude 3.7 Sonnet", "Anthropic Claude 3.7 Sonnet hybrid reasoning & coding", "omniroute", true, true),
  m("deepseek-r1", "DeepSeek R1", "Open reasoning powerhouse with transparent chain of thought", "omniroute", false, true),
  m("deepseek-v3", "DeepSeek V3", "High-throughput software engineering and code generation", "omniroute", false, false),
];
