#!/usr/bin/env bash
# ==============================================================================
# AvA - Custom AI Provider Management Helper
# Easily add, configure, and switch AI providers in ~/.ava/config.toml
# ==============================================================================

set -e

AVA_CONFIG_DIR="${AVA_HOME:-$HOME/.ava}"
AVA_CONFIG_FILE="$AVA_CONFIG_DIR/config.toml"

mkdir -p "$AVA_CONFIG_DIR"

if [ ! -f "$AVA_CONFIG_FILE" ]; then
    cat << 'EOF' > "$AVA_CONFIG_FILE"
# AvA Configuration
model_provider = "openai"
model = "gpt-5"

EOF
fi

print_usage() {
    echo "AvA Custom AI Provider Helper"
    echo ""
    echo "Usage:"
    echo "  ava-provider list"
    echo "  ava-provider set-model <model-name>"
    echo "  ava-provider set-provider <provider-id>"
    echo "  ava-provider use <provider-id> <model-name>"
    echo "  ava-provider add-custom --id <id> --name <name> --url <base-url> [--key <env-key> | --token <bearer-token>] [--model <model>]"
    echo "  ava-provider setup-openrouter --key <api-key> [--model <model>]"
    echo "  ava-provider setup-deepseek --key <api-key> [--model <model>]"
    echo "  ava-provider setup-gemini --key <api-key> [--model <model>]"
    echo "  ava-provider setup-groq --key <api-key> [--model <model>]"
    echo "  ava-provider setup-ollama [--url <base-url>] [--model <model>]"
    echo ""
    echo "Config location: $AVA_CONFIG_FILE"
}

cmd="${1:-}"

case "$cmd" in
    list)
        echo "=== Current AvA Configuration ($AVA_CONFIG_FILE) ==="
        cat "$AVA_CONFIG_FILE"
        ;;

    set-model)
        model="$2"
        if [ -z "$model" ]; then
            echo "Error: model name required. Example: ava-provider set-model claude-3.7-sonnet"
            exit 1
        fi
        if grep -q "^model =" "$AVA_CONFIG_FILE"; then
            sed -i "s|^model =.*|model = \"$model\"|" "$AVA_CONFIG_FILE"
        else
            echo "model = \"$model\"" >> "$AVA_CONFIG_FILE"
        fi
        echo "✅ Active model updated to: $model"
        ;;

    set-provider)
        provider="$2"
        if [ -z "$provider" ]; then
            echo "Error: provider ID required. Example: ava-provider set-provider openrouter"
            exit 1
        fi
        if grep -q "^model_provider =" "$AVA_CONFIG_FILE"; then
            sed -i "s|^model_provider =.*|model_provider = \"$provider\"|" "$AVA_CONFIG_FILE"
        else
            echo "model_provider = \"$provider\"" >> "$AVA_CONFIG_FILE"
        fi
        echo "✅ Active provider updated to: $provider"
        ;;

    use)
        provider="$2"
        model="$3"
        if [ -z "$provider" ] || [ -z "$model" ]; then
            echo "Error: provider and model required. Example: ava-provider use openrouter anthropic/claude-3.7-sonnet"
            exit 1
        fi
        "$0" set-provider "$provider"
        "$0" set-model "$model"
        echo "🚀 AvA is now configured to use: $provider / $model"
        ;;

    setup-openrouter)
        shift
        key=""
        model="anthropic/claude-3.7-sonnet"
        while [[ "$#" -gt 0 ]]; do
            case $1 in
                --key) key="$2"; shift ;;
                --model) model="$2"; shift ;;
            esac
            shift
        done
        if [ -n "$key" ]; then
            export OPENROUTER_API_KEY="$key"
        fi
        
        # Ensure provider block exists
        if ! grep -q "\[model_providers.openrouter\]" "$AVA_CONFIG_FILE"; then
            cat << 'EOF' >> "$AVA_CONFIG_FILE"

[model_providers.openrouter]
name = "OpenRouter"
base_url = "https://openrouter.ai/api/v1"
env_key = "OPENROUTER_API_KEY"
wire_api = "responses"
EOF
        fi
        
        if grep -q "^model_provider =" "$AVA_CONFIG_FILE"; then
            sed -i 's|^model_provider =.*|model_provider = "openrouter"|' "$AVA_CONFIG_FILE"
        else
            echo 'model_provider = "openrouter"' >> "$AVA_CONFIG_FILE"
        fi
        if grep -q "^model =" "$AVA_CONFIG_FILE"; then
            sed -i "s|^model =.*|model = \"$model\"|" "$AVA_CONFIG_FILE"
        else
            echo "model = \"$model\"" >> "$AVA_CONFIG_FILE"
        fi
        echo "✅ OpenRouter configured successfully! Model: $model"
        ;;

    setup-deepseek)
        shift
        key=""
        model="deepseek-chat"
        while [[ "$#" -gt 0 ]]; do
            case $1 in
                --key) key="$2"; shift ;;
                --model) model="$2"; shift ;;
            esac
            shift
        done
        if [ -n "$key" ]; then
            export DEEPSEEK_API_KEY="$key"
        fi
        if ! grep -q "\[model_providers.deepseek\]" "$AVA_CONFIG_FILE"; then
            cat << 'EOF' >> "$AVA_CONFIG_FILE"

[model_providers.deepseek]
name = "DeepSeek"
base_url = "https://api.deepseek.com/v1"
env_key = "DEEPSEEK_API_KEY"
wire_api = "responses"
EOF
        fi
        sed -i 's|^model_provider =.*|model_provider = "deepseek"|' "$AVA_CONFIG_FILE" 2>/dev/null || echo 'model_provider = "deepseek"' >> "$AVA_CONFIG_FILE"
        sed -i "s|^model =.*|model = \"$model\"|" "$AVA_CONFIG_FILE" 2>/dev/null || echo "model = \"$model\"" >> "$AVA_CONFIG_FILE"
        echo "✅ DeepSeek configured successfully! Model: $model"
        ;;

    add-custom)
        shift
        id=""
        name=""
        url=""
        key=""
        token=""
        model=""
        while [[ "$#" -gt 0 ]]; do
            case $1 in
                --id) id="$2"; shift ;;
                --name) name="$2"; shift ;;
                --url) url="$2"; shift ;;
                --key) key="$2"; shift ;;
                --token) token="$2"; shift ;;
                --model) model="$2"; shift ;;
            esac
            shift
        done

        if [ -z "$id" ] || [ -z "$url" ]; then
            echo "Error: --id and --url are required."
            exit 1
        fi
        if [ -z "$name" ]; then name="$id"; fi

        echo "" >> "$AVA_CONFIG_FILE"
        echo "[model_providers.$id]" >> "$AVA_CONFIG_FILE"
        echo "name = \"$name\"" >> "$AVA_CONFIG_FILE"
        echo "base_url = \"$url\"" >> "$AVA_CONFIG_FILE"
        if [ -n "$key" ]; then
            echo "env_key = \"$key\"" >> "$AVA_CONFIG_FILE"
        fi
        if [ -n "$token" ]; then
            echo "experimental_bearer_token = \"$token\"" >> "$AVA_CONFIG_FILE"
        fi
        echo "wire_api = \"responses\"" >> "$AVA_CONFIG_FILE"

        if [ -n "$model" ]; then
            sed -i "s|^model_provider =.*|model_provider = \"$id\"|" "$AVA_CONFIG_FILE" 2>/dev/null || echo "model_provider = \"$id\"" >> "$AVA_CONFIG_FILE"
            sed -i "s|^model =.*|model = \"$model\"|" "$AVA_CONFIG_FILE" 2>/dev/null || echo "model = \"$model\"" >> "$AVA_CONFIG_FILE"
        fi
        echo "✅ Custom provider '$id' ($name) added to $AVA_CONFIG_FILE!"
        ;;

    *)
        print_usage
        ;;
esac
