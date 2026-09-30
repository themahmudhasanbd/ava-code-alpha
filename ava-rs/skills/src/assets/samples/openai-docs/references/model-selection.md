# Model Selection

> **Note:** AvA Code operates without built-in default models. All available models are dynamically populated from configured providers or custom user endpoints.

## Dynamic Selection Process

1. Query active model providers via live API / RPC discovery.
2. If no providers are configured, prompt the user to add an active model provider or endpoint.
3. Match available models from the active catalog to the user's requested tasks, capabilities, and reasoning requirements.
4. Support the standard reasoning tiers: `low`, `medium`, `max`, `ultra`.
