/// Represents an AI model provider (Google Antigravity, OpenRouter, DeepSeek, etc.)
class ProviderModel {
  final String id;
  final String name;
  final String description;
  final String baseUrl;
  final bool isConnected;
  final bool isDefault;
  final List<String> models;

  ProviderModel({
    required this.id,
    required this.name,
    required this.description,
    required this.baseUrl,
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
          id: 'openrouter',
          name: 'OpenRouter',
          description: 'Unified gateway to Claude 3.7 Sonnet, OpenAI, DeepSeek, and Llama 3',
          baseUrl: 'https://openrouter.ai/api/v1',
          isConnected: false,
          models: [
            'anthropic/claude-3.7-sonnet',
            'deepseek/deepseek-r1',
            'openai/gpt-4o',
          ],
        ),
        ProviderModel(
          id: 'deepseek',
          name: 'DeepSeek',
          description: 'Official DeepSeek V3 & R1 reasoning endpoints',
          baseUrl: 'https://api.deepseek.com/v1',
          isConnected: false,
          models: ['deepseek-chat', 'deepseek-reasoner'],
        ),
        ProviderModel(
          id: 'ollama',
          name: 'Ollama Local',
          description: 'Local on-device or local network LLM server',
          baseUrl: 'http://localhost:11434/v1',
          isConnected: false,
          models: ['qwen2.5-coder:32b', 'llama3.3:70b'],
        ),
      ];
}
