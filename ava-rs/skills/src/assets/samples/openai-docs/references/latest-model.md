# Dynamic Model Reference

> **Note:** AvA Code does not provide a fixed, hardcoded default model catalog. All models and provider endpoints are user-configured or dynamically retrieved from active providers at runtime.

## Dynamic Model Discovery

When working with models in AvA Code:
- Models are discovered dynamically via connected provider endpoints or configured in `~/.ava-code/config.toml` or the Mobile UI.
- No static list of models is assumed.
- If no models are configured or reachable, AvA Code reports a realistic status (such as `No models configured` or `Remote server unreachable`).

## Configuration Guidelines

- Model configurations can specify any custom OpenAI-compatible endpoint, Antigravity OAuth provider, OpenRouter, DeepSeek, Groq, Ollama, LM Studio, etc.
- Supported reasoning tiers across AvA are: `low`, `medium`, `max`, `ultra`.
