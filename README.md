# AvA

<p align="center"><strong>AvA</strong> is a next-generation autonomous coding agent built for long agentic tasks, running locally on your computer with sandboxing, resilient multi-turn state execution, and multi-provider intelligence.</p>

---

## Overview

AvA is designed from the ground up for reliable, deep agentic programming workflows. It combines:

- **Autonomous Multi-Turn Execution**: High resilience for complex, multi-step coding, refactoring, and debugging tasks.
- **Native Rust Runtime**: Ultra-fast performance, low memory overhead, and solid process sandboxing.
- **Rich Terminal UI & Protocol**: Full interactive TUI, session resume, side conversations, and robust tool pipelines.
- **Multi-Provider Support**: Supports custom OpenAI-compatible endpoints, Anthropic, Gemini, Ollama, and local models.

---

## Quickstart

### Running AvA

Once built or installed, simply run:

```shell
ava
```

---

## Configuration

AvA loads configuration from `~/.ava/` (or via the `AVA_HOME` environment variable):

- Config file: `~/.ava/config.toml`
- Instructions: `~/.ava/instructions/`
- Project-local config: `.ava/config.toml`

---

## License

This project is open source and licensed under the [Apache-2.0 License](LICENSE).
