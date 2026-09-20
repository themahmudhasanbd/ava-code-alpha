/// Represents an AI model provider (Google Antigravity, OpenRouter, DeepSeek, etc.)
class ProviderModel {
  final String id;
  final String name;
  final String description;
  final String baseUrl;
  final String? apiKey;
  final String? assetIcon;
  final bool isConnected;
  final bool isDefault;
  final List<String> models;

  const ProviderModel({
    required this.id,
    required this.name,
    required this.description,
    this.baseUrl = '',
    this.apiKey,
    this.assetIcon,
    this.isConnected = false,
    this.isDefault = false,
    this.models = const [],
  });

  ProviderModel copyWith({
    bool? isConnected,
    List<String>? models,
    String? apiKey,
    String? baseUrl,
  }) =>
      ProviderModel(
        id: id,
        name: name,
        description: description,
        baseUrl: baseUrl ?? this.baseUrl,
        apiKey: apiKey ?? this.apiKey,
        assetIcon: assetIcon,
        isConnected: isConnected ?? this.isConnected,
        isDefault: isDefault,
        models: models ?? this.models,
      );

  /// Built-in provider catalog. Models are empty — loaded dynamically via /connect or API.
  static List<ProviderModel> get builtInPresets => [
        const ProviderModel(
          id: 'antigravity',
          name: 'Google Antigravity',
          description: 'Native Cloud Code backend with Gemini & Claude models',
          baseUrl: 'https://daily-cloudcode-pa.googleapis.com',
          assetIcon: 'assets/providers/antigravity.png',
          isDefault: true,
        ),
        const ProviderModel(
          id: 'anthropic',
          name: 'Anthropic Claude',
          description: 'Claude family via direct Anthropic Messages API',
          baseUrl: 'https://api.anthropic.com/v1',
          assetIcon: 'assets/providers/anthropic.png',
        ),
        const ProviderModel(
          id: 'openai',
          name: 'OpenAI Platform',
          description: 'GPT and o-series reasoning models',
          baseUrl: 'https://api.openai.com/v1',
          assetIcon: 'assets/providers/openai.png',
        ),
        const ProviderModel(
          id: 'groq',
          name: 'Groq LPU',
          description: 'Ultra-fast inference via Groq LPUs',
          baseUrl: 'https://api.groq.com/openai/v1',
          assetIcon: 'assets/providers/groq.png',
        ),
        const ProviderModel(
          id: 'deepseek',
          name: 'DeepSeek',
          description: 'DeepSeek V3 & R1 reasoning endpoints',
          baseUrl: 'https://api.deepseek.com/v1',
          assetIcon: 'assets/providers/deepseek.png',
        ),
        const ProviderModel(
          id: 'ollama',
          name: 'Ollama Local',
          description: 'Local on-device LLM server',
          baseUrl: 'http://localhost:11434/v1',
          assetIcon: 'assets/providers/ollama.png',
        ),
        const ProviderModel(
          id: 'custom',
          name: 'Custom Endpoint',
          description: 'OpenAI-compatible custom endpoint',
          baseUrl: '',
          assetIcon: 'assets/providers/custom.png',
        ),
      ];
}
