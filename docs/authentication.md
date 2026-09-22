# Authentication in AvA Code Alpha

AvA Code Alpha supports multiple authentication backends:

1. **Google Antigravity OAuth 2.0 PKCE**:
   - Manages token exchange and automatic rotation for Google Cloud Code Assist & frontier Gemini / Claude models.
   - For complete configuration and token lifecycle details, see [Phase 4: Multi-Provider & Google Antigravity Integration](file:///var/www/ava-code/docs/phase-4-antigravity-and-providers.md).

2. **API Key Authentication**:
   - Custom provider keys configured in `~/.config/ava/config.toml` or environment variables (e.g. `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`).
   - For custom provider setups, see [Custom Providers Guide](file:///var/www/ava-code/docs/custom_providers.md).

3. **Persistent Auth Store**:
   - Credentials are stored securely in `~/.config/ava/auth.json`.
