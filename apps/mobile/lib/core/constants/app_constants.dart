/// Global application constants and default configuration values
class AppConstants {
  AppConstants._();

  static const String appName = 'AvA Code Alpha';
  static const String appVersion = 'v0.1.0-alpha';

  // Default App Server Endpoints
  static const String defaultHost = 'http://localhost:4096';
  static const String defaultWsHost = 'ws://localhost:4096';

  // Core Authentication Credentials
  static const String authUsername = 'mahmudhasan';
  static const String authPasswordHash = 'SamirisonlyforAdria%2';

  // Default Model
  static const String defaultProvider = 'antigravity';
  static const String defaultModel = 'gemini-3.7-flash-tiered';

  // Local Storage Keys
  static const String keyAuthToken = 'ava_auth_session_token';
  static const String keyAuthUser = 'ava_auth_user_name';
  static const String keyServerUrl = 'ava_server_endpoint_url';
  static const String keyActiveModel = 'ava_active_model_id';
  static const String keyActiveProvider = 'ava_active_provider_id';
}
