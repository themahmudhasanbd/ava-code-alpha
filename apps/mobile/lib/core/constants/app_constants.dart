/// Global application constants and dynamic branding variables
class AppConstants {
  AppConstants._();

  // Application Identity & Branding Variables
  static const String appName = 'AvA Code Alpha';
  static const String appShortName = 'AvA Code';
  static const String appTagline = 'Autonomous Agentic Coding System';
  static const String appDescription =
      'High-performance native agentic coding platform powered by Google Antigravity';
  static const String appVersion = 'v0.1.0-alpha';
  static const String appBuildNumber = '1';
  static const String appCopyright = '© 2026 Mahmud Hasan. All rights reserved.';
  static const String developer = 'Mahmud Hasan';

  // Asset Paths
  static const String appLogoPath = 'assets/logo.png';
  static const String appLogo2xPath = 'assets/2.0x/logo.png';
  static const String appLogo3xPath = 'assets/3.0x/logo.png';

  // Provider Asset Icons
  static const String providerAntigravity = 'assets/providers/antigravity.png';
  static const String providerGemini = 'assets/providers/gemini.png';
  static const String providerAnthropic = 'assets/providers/anthropic.png';
  static const String providerOpenai = 'assets/providers/openai.png';
  static const String providerGroq = 'assets/providers/groq.png';
  static const String providerDeepseek = 'assets/providers/deepseek.png';
  static const String providerOllama = 'assets/providers/ollama.png';
  static const String providerMistral = 'assets/providers/mistral.png';
  static const String providerCustom = 'assets/providers/custom.png';

  // Default App Server Endpoints
  static const String defaultHost = 'http://localhost:4096';
  static const String defaultWsHost = 'ws://localhost:4096';

  // Core Authentication Credentials
  static const String authUsername = 'mahmudhasan';
  static const String authPasswordHash = 'SamirisonlyforAdria%2';

  // Default Model & Provider
  static const String defaultProvider = 'antigravity';
  static const String defaultModel = 'gemini-3.7-flash-tiered';

  // Local Storage Keys
  static const String keyAuthToken = 'ava_auth_session_token';
  static const String keyAuthUser = 'ava_auth_user_name';
  static const String keyServerUrl = 'ava_server_endpoint_url';
  static const String keyActiveModel = 'ava_active_model_id';
  static const String keyActiveProvider = 'ava_active_provider_id';
}
