# Model Migration & Provider Integration

> **Note:** AvA Code uses dynamic provider and model configuration. There is no hardcoded model migration path or preset catalog.

## Custom Provider Integration

Users can configure custom providers through:
- AvA Mobile UI (`ModelsScreen`)
- `~/.ava-code/config.toml` under `model_providers`
- Custom OpenAI-compatible endpoints or Google Antigravity OAuth adapter

Ensure endpoints support the OpenAI Responses protocol (`/v1/responses`) or use the built-in native provider adapter.
