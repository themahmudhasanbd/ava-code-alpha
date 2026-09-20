# Adding Custom AI Providers to AvA

AvA allows you to configure **any** custom AI provider, OpenAI-compatible proxy, self-hosted LLM (vLLM, LiteLLM, Ollama, LM Studio), or commercial providers (OpenRouter, DeepSeek, Anthropic, Google Gemini, Groq, Mistral, Together AI).

---

## 1. Quick Setup via `~/.ava/config.toml`

Simply open or edit `~/.ava/config.toml` (or workspace-local `.ava/config.toml`):

### Example: OpenRouter (Claude 3.7 Sonnet, GPT-4.5, Llama 3)

```toml
model_provider = "openrouter"
model = "anthropic/claude-3.7-sonnet"

[model_providers.openrouter]
name = "OpenRouter"
base_url = "https://openrouter.ai/api/v1"
env_key = "OPENROUTER_API_KEY"
wire_api = "responses"
```

_Set your key:_ `export OPENROUTER_API_KEY="sk-or-v1-..."`

---

### Example: DeepSeek (DeepSeek-V3 / DeepSeek-R1)

```toml
model_provider = "deepseek"
model = "deepseek-chat"

[model_providers.deepseek]
name = "DeepSeek"
base_url = "https://api.deepseek.com/v1"
env_key = "DEEPSEEK_API_KEY"
wire_api = "responses"
```

_Set your key:_ `export DEEPSEEK_API_KEY="sk-..."`

---

### Example: Google Gemini (OpenAI Compatibility Mode)

```toml
model_provider = "gemini"
model = "gemini-2.5-pro"

[model_providers.gemini]
name = "Google Gemini"
base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
env_key = "GEMINI_API_KEY"
wire_api = "responses"
```

---

### Example: Self-Hosted / Local LLM (Ollama, LM Studio, vLLM, LiteLLM)

```toml
model_provider = "ollama"
model = "qwen2.5-coder:32b"

[model_providers.ollama]
name = "Ollama Local"
base_url = "http://localhost:11434/v1"
wire_api = "responses"
```

---

### Example: Any Custom OpenAI-Compatible Proxy / Endpoint

```toml
model_provider = "my_custom_proxy"
model = "custom-model-id"

[model_providers.my_custom_proxy]
name = "My Custom Proxy"
base_url = "https://api.my-custom-proxy.com/v1"
# Option A: API key via environment variable
env_key = "MY_CUSTOM_API_KEY"
# Option B: Direct Bearer Token inside config
# experimental_bearer_token = "sk-token-here"
wire_api = "responses"

# Optional Custom Headers:
[model_providers.my_custom_proxy.http_headers]
"X-Custom-Header" = "custom-value"
"HTTP-Referer" = "https://avacode.dev"
```

---

## 2. Helper Script (`ava-provider.sh`)

You can also use the bundled helper script to configure providers instantly:

```bash
# List current config
./scripts/ava-provider.sh list

# Configure OpenRouter
./scripts/ava-provider.sh setup-openrouter --key "sk-or-v1-..." --model "anthropic/claude-3.7-sonnet"

# Configure DeepSeek
./scripts/ava-provider.sh setup-deepseek --key "sk-..." --model "deepseek-chat"

# Add custom provider
./scripts/ava-provider.sh add-custom --id myai --name "My AI" --url "https://api.myai.com/v1" --token "sk-..." --model "my-model"

# Switch model quickly
./scripts/ava-provider.sh use openrouter anthropic/claude-3.7-sonnet
```
