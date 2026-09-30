/**
 * Intent derivation for the agent turn UX.
 *
 * Option B architecture: the core may send `meta.intent` (a short 2-5 word
 * task title like "PM2 status check") at turn start. When present, it takes
 * precedence. Otherwise we derive a human-friendly intent label from the
 * user's prompt text with a lightweight heuristic.
 *
 * Used for:
 *  - Pre-state card: "Checking your pm2 status…" (before any tool starts)
 *  - Overview card title during the turn
 *  - Completion: "PM2 status check completed"
 *  - Stopped: "PM2 status check stopped"
 */

const VERB_MAP: Record<string, string> = {
  check: "Checking",
  show: "Showing",
  get: "Getting",
  fetch: "Fetching",
  run: "Running",
  execute: "Running",
  create: "Creating",
  make: "Making",
  build: "Building",
  fix: "Fixing",
  repair: "Repairing",
  find: "Finding",
  search: "Searching",
  look: "Looking",
  open: "Opening",
  close: "Closing",
  deploy: "Deploying",
  install: "Installing",
  update: "Updating",
  upgrade: "Upgrading",
  delete: "Deleting",
  remove: "Removing",
  list: "Listing",
  analyze: "Analyzing",
  analyse: "Analysing",
  explain: "Explaining",
  summarize: "Summarizing",
  summarise: "Summarising",
  write: "Writing",
  read: "Reading",
  test: "Testing",
  debug: "Debugging",
  restart: "Restarting",
  start: "Starting",
  stop: "Stopping",
  // common Bangla verbs (transliterated)
  dekho: "Checking",
  dekh: "Checking",
  koro: "Working on",
  kor: "Working on",
  chalao: "Running",
  chalau: "Running",
  kholo: "Opening",
  bondho: "Closing",
};

/**
 * Derive a present-continuous intent label from the user's prompt.
 * "check my pm2 status" -> "Checking your pm2 status"
 */
export function deriveIntentFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (!clean) return "Working";

  // Strip leading politeness / fillers
  let text = clean
    .replace(/^(please\s+|pls\s+|kindly\s+)/i, "")
    .replace(/\s+(please|pls)$/i, "");

  // Cap length for the label
  const words = text.split(" ");
  const short = words.slice(0, 8).join(" ");
  const truncated = words.length > 8;

  const wordList = short.split(" ");
  const first = (wordList[0] || "").toLowerCase();
  const last = (wordList[wordList.length - 1] || "").toLowerCase();

  // English SVO: verb first ("check my pm2 status").
  // Bangla SOV: verb last ("amar pm2 status dekho").
  let mapped = VERB_MAP[first];
  let rest: string;
  if (mapped) {
    rest = short.slice(wordList[0].length).trim();
  } else if (VERB_MAP[last] && wordList.length > 1) {
    mapped = VERB_MAP[last];
    rest = wordList.slice(0, -1).join(" ");
  } else {
    rest = "";
  }

  const cleanRest = (t: string) =>
    t
      .replace(/\bmy\b/gi, "your")
      .replace(/\bme\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  let label: string;
  if (mapped) {
    const restFixed = cleanRest(rest);
    label = restFixed ? `${mapped} ${restFixed}` : mapped;
  } else {
    // No verb match: "Working on <prompt>"
    label = `Working on ${cleanRest(short)}`;
  }

  // Capitalize first letter, keep the rest as typed
  label = label.charAt(0).toUpperCase() + label.slice(1);
  return truncated ? `${label}…` : label;
}

/**
 * Resolve the intent for a turn. Core-provided `meta.intent` wins;
 * otherwise derive from the user prompt.
 */
export function resolveIntent(metaIntent: string | undefined, userPrompt: string | undefined): string {
  if (metaIntent && metaIntent.trim()) return metaIntent.trim();
  if (userPrompt && userPrompt.trim()) return deriveIntentFromPrompt(userPrompt);
  return "Working";
}

/**
 * Title-case a short intent for completion messages.
 * "Checking your pm2 status" -> "Pm2 status check" is lossy, so instead we
 * build completion text from the base noun phrase when possible.
 */
export function completionText(intent: string, summary?: string): string {
  const base = intent.trim();
  if (summary && summary.trim()) return summary.trim();
  // "Checking your pm2 status" -> "Pm2 status check completed"
  const m = base.match(/^(checking|showing|getting|fetching|running|creating|making|building|fixing|finding|searching|opening|deploying|installing|updating|deleting|listing|analyzing|explaining|summarizing|writing|reading|testing|debugging|restarting|starting|stopping|working on)\s+(your\s+|you\s+)?(.+?)\.{0,3}$/i);
  if (m && m[3]) {
    const noun = m[3].trim();
    const titled = noun.charAt(0).toUpperCase() + noun.slice(1);
    return `${titled} completed`;
  }
  return `${base} — completed`;
}

export function stoppedText(intent: string, stepsDone: number, stepsTotal: number): string {
  const base = intent.trim();
  if (stepsTotal > 0) {
    return `${base} — stopped (${stepsDone}/${stepsTotal} steps done)`;
  }
  return `${base} — stopped`;
}
