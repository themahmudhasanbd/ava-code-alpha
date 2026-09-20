/// Represents an AI model provider (Google Antigravity, OpenRouter, DeepSeek, etc.)
class ProviderModel {
  final String id;
  final String name;
  final String description;
  final String baseUrl;
  final String? assetIcon;
  final bool isConnected;
  final bool isDefault;
  final List<String> models;

  ProviderModel({
    required this.id,
    required this.name,
    required this.description,
    this.baseUrl = '',
    this.assetIcon,
    this.isConnected = false,
    this.isDefault = false,
    this.models = const [],
  });

  static List<ProviderModel> get builtInPresets => [
        ProviderModel(
          id: 'antigravity',
          name: 'Google Antigravity',
          description: 'Native Cloud Code backend with Gemini 3.7/3.8, Claude Opus & Sonnet',
          baseUrl: 'https://daily-cloudcode-pa.googleapis.com',
          assetIcon: 'assets/providers/antigravity.png',
          isConnected: true,
          isDefault: true,
          models: [
            'gemini-3.7-flash-tiered',
            'gemini-3.7-flash-high',
            'gemini-3.8-flash-tiered',
            'gemini-pro-agent',
            'claude-opus-4-6-thinking',
            'claude-sonnet-4-6',
            'gpt-oss-120b-medium',
          ],
        ),
        ProviderModel(
          id: 'anthropic',
          name: 'Anthropic Claude',
          description: 'Claude 3.7 Sonnet & 3.5 Haiku direct Messages API',
          baseUrl: 'https://api.anthropic.com/v1',
          assetIcon: 'assets/providers/anthropic.png',
          isConnected: true,
          models: [
            'claude-3-7-sonnet',
            'claude-3-5-haiku',
          ],
        ),
        ProviderModel(
          id: 'openai',
          name: 'OpenAI Platform',
          description: 'GPT-4o, GPT-4o-mini, and o3-mini reasoning models',
          baseUrl: 'https://api.openai.com/v1',
          assetIcon: 'assets/providers/openai.png',
          isConnected: true,
          models: [
            'gpt-4o',
            'gpt-4o-mini',
            'o3-mini',
          ],
        ),
        ProviderModel(
          id: 'groq',
          name: 'Groq LPU',
          description: 'Ultra-fast inference powered by Groq LPUs',
          baseUrl: 'https://api.groq.com/openai/v1',
          assetIcon: 'assets/providers/groq.png',
          isConnected: true,
          models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
        ),
        ProviderModel(
          id: 'deepseek',
          name: 'DeepSeek',
          description: 'Official DeepSeek V3 & R1 reasoning endpoints',
          baseUrl: 'https://api.deepseek.com/v1',
          assetIcon: 'assets/providers/deepseek.png',
          isConnected: true,
          models: ['deepseek-chat', 'deepseek-reasoner'],
        ),
        ProviderModel(
          id: 'ollama',
          name: 'Ollama Local',
          description: 'Local on-device or local network LLM server',
          baseUrl: 'http://localhost:11434/v1',
          assetIcon: 'assets/providers/ollama.png',
          isConnected: true,
          models: ['qwen2.5-coder:7b', 'deepseek-r1:8b'],
        ),
      ];
}
