import type { RpcClient } from "../rpc-client";
import { runTurn } from "./chat";
import { renameSession } from "./sessions";

/**
 * TUI-parity automatic session titles for the mobile app.
 *
 * After the first successful turn of a session, a short ephemeral agent turn
 * generates a <=36 char title from the opening exchange, then the real
 * session is renamed via `thread/name/set`. Everything is best-effort: any
 * failure resolves to null and never affects chat.
 */

const TITLE_MAX_CHARS = 36;
const TITLE_PROMPT_MAX_BYTES = 960;
const TITLE_TURN_TIMEOUT_MS = 90_000;

function buildTitlePrompt(userText: string, assistantText?: string): string {
  const excerpt = [userText, assistantText]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, TITLE_PROMPT_MAX_BYTES);
  return (
    `Generate a very short title (max ${TITLE_MAX_CHARS} characters) for the conversation below. ` +
    `Rules: plain text only, no quotation marks, no trailing period, no emoji. ` +
    `Reply with ONLY the title, nothing else.\n\nConversation:\n${excerpt}`
  );
}

function cleanTitle(raw: string): string | null {
  let t = raw
    .trim()
    .replace(/^["'""''`]+|["'""''`\-–—.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  if (t.length > TITLE_MAX_CHARS) t = t.slice(0, TITLE_MAX_CHARS).trim();
  return t || null;
}

/** Runs the title prompt on an ephemeral thread and resolves with raw text. */
function runTitleTurn(rpc: RpcClient, threadId: string, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (text: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(text);
    };
    const timer = setTimeout(() => done(deltaText.join("")), TITLE_TURN_TIMEOUT_MS);

    const deltaText: string[] = [];
    let completedText = "";
    runTurn(
      rpc,
      threadId,
      prompt,
      {},
      {
        onPart: (p) => {
          if (p.kind === "text" && p.status === "done" && p.text) completedText = p.text;
        },
        onDelta: (_id, delta, kind) => {
          if (kind === "text" && delta) deltaText.push(delta);
        },
        onPlan: () => {},
        onNotice: () => {},
        onStats: () => {},
        onDone: (err) => done(err ? "" : completedText || deltaText.join("")),
      }
    ).catch(() => done(completedText || deltaText.join("")));
  });
}

export interface GenerateTitleOptions {
  /** The real session to rename. */
  sessionId: string;
  cwd: string;
  model?: string;
  userText: string;
  assistantText?: string;
}

/**
 * Generates a title for `sessionId` via an ephemeral helper thread.
 * Returns the applied title, or null when generation failed / was skipped.
 */
export async function generateSessionTitle(
  rpc: RpcClient,
  opts: GenerateTitleOptions
): Promise<string | null> {
  try {
    const startRes = await rpc.call<{ thread?: { id?: unknown } }>("thread/start", {
      cwd: opts.cwd,
      ephemeral: true,
      thread_source: "thread_title",
      sandbox: "read-only",
      ...(opts.model ? { model: opts.model } : {}),
    });
    const tempId = startRes?.thread?.id ? String(startRes.thread.id) : "";
    if (!tempId) return null;
    try {
      const raw = await runTitleTurn(
        rpc,
        tempId,
        buildTitlePrompt(opts.userText, opts.assistantText)
      );
      const title = cleanTitle(raw);
      if (title) {
        try {
          await renameSession(rpc, opts.sessionId, title);
        } catch {
          /* rename failed — still return the title */
        }
      }
      return title;
    } finally {
      try {
        await rpc.call("thread/delete", { threadId: tempId });
      } catch {
        /* ephemeral threads vanish on their own */
      }
    }
  } catch {
    return null;
  }
}
