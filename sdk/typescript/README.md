# Ava SDK

Embed the Ava agent in your workflows and apps.

The TypeScript SDK wraps the `ava` CLI from `@openai/codex`. It spawns the CLI and exchanges JSONL events over stdin/stdout.

## Installation

```bash
npm install @openai/codex-sdk
```

Requires Node.js 18+.

## Quickstart

```typescript
import { Ava } from "@openai/codex-sdk";

const ava = new Ava();
const thread = ava.startThread();
const turn = await thread.run("Diagnose the test failure and propose a fix");

console.log(turn.finalResponse);
console.log(turn.items);
```

Call `run()` repeatedly on the same `Thread` instance to continue that conversation.

```typescript
const nextTurn = await thread.run("Implement the fix");
```

### Streaming responses

`run()` buffers events until the turn finishes. To react to intermediate progress—tool calls, streaming responses, and file change notifications—use `runStreamed()` instead, which returns an async generator of structured events.

```typescript
const { events } = await thread.runStreamed("Diagnose the test failure and propose a fix");

for await (const event of events) {
  switch (event.type) {
    case "item.completed":
      console.log("item", event.item);
      break;
    case "turn.completed":
      console.log("usage", event.usage);
      break;
  }
}
```

### Structured output

The Ava agent can produce a JSON response that conforms to a specified schema. The schema can be provided for each turn as a plain JSON object.

```typescript
const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    status: { type: "string", enum: ["ok", "action_required"] },
  },
  required: ["summary", "status"],
  additionalProperties: false,
} as const;

const turn = await thread.run("Summarize repository status", { outputSchema: schema });
console.log(turn.finalResponse);
```

You can also create a JSON schema from a [Zod schema](https://github.com/colinhacks/zod) using the [`zod-to-json-schema`](https://www.npmjs.com/package/zod-to-json-schema) package and setting the `target` to `"openAi"`.

```typescript
const schema = z.object({
  summary: z.string(),
  status: z.enum(["ok", "action_required"]),
});

const turn = await thread.run("Summarize repository status", {
  outputSchema: zodToJsonSchema(schema, { target: "openAi" }),
});
console.log(turn.finalResponse);
```

### Attaching images

Provide structured input entries when you need to include images alongside text. Text entries are concatenated into the final prompt while image entries are passed to the Ava CLI via `--image`.

```typescript
const turn = await thread.run([
  { type: "text", text: "Describe these screenshots" },
  { type: "local_image", path: "./ui.png" },
  { type: "local_image", path: "./diagram.jpg" },
]);
```

### Resuming an existing thread

Threads are persisted in `~/.ava-code/sessions`. If you lose the in-memory `Thread` object, reconstruct it with `resumeThread()` and keep going.

```typescript
const savedThreadId = process.env.AVA_THREAD_ID!;
const thread = ava.resumeThread(savedThreadId);
await thread.run("Implement the fix");
```

### Working directory controls

Ava runs in the current working directory by default. To avoid unrecoverable errors, Ava requires the working directory to be a Git repository. You can skip the Git repository check by passing the `skipGitRepoCheck` option when creating a thread.

```typescript
const thread = ava.startThread({
  workingDirectory: "/path/to/project",
  skipGitRepoCheck: true,
});
```

### Controlling the Ava CLI environment

By default, the Ava CLI inherits the Node.js process environment. Provide the optional `env` parameter when instantiating the
`Ava` client to fully control which variables the CLI receives—useful for sandboxed hosts like Electron apps.

```typescript
const ava = new Ava({
  env: {
    PATH: "/usr/local/bin",
  },
});
```

The SDK still injects its required variables (such as `AVA_API_KEY`) on top of the environment you provide. If you set
`baseUrl`, the SDK passes it as a `--config openai_base_url=...` override.

### Passing `--config` overrides

Use the `config` option to provide additional Ava CLI configuration overrides. The SDK accepts a JSON object, flattens it
into dotted paths, and serializes values as TOML literals before passing them as repeated `--config key=value` flags.

```typescript
const ava = new Ava({
  config: {
    show_raw_agent_reasoning: true,
    sandbox_workspace_write: { network_access: true },
  },
});
```

For configuration keys that cannot be expressed as dotted paths, pass raw TOML overrides with `configOverrides`. Each entry
is forwarded unchanged as a separate `--config` argument, without modifying `AVA_HOME`:

```typescript
const ava = new Ava({
  config: { default_permissions: "audit" },
  configOverrides: ['permissions.audit.filesystem={":root"="read","/path/to/project/.env"="deny"}'],
});
```

Raw overrides are applied after structured `config` overrides and take precedence over them. SDK-managed settings, such as
`baseUrl`, and thread-specific options are applied afterward and take precedence.
