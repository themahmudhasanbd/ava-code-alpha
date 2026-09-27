#!/usr/bin/env -S NODE_NO_WARNINGS=1 pnpm ts-node-esm --files

import { Ava } from "@openai/codex-sdk";
import { avaPathOverride } from "./helpers.ts";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const ava = new Ava({ avaPathOverride: avaPathOverride() });
const thread = ava.startThread();

const schema = z.object({
  summary: z.string(),
  status: z.enum(["ok", "action_required"]),
});

const turn = await thread.run("Summarize repository status", {
  outputSchema: zodToJsonSchema(schema, { target: "openAi" }),
});
console.log(turn.finalResponse);
