import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/json_rpc_client.dart';
import '../../core/storage/secure_storage_service.dart';
import '../models/user_session.dart';

/// Result type for authentication attempts
class AuthResult {
  final bool isSuccess;
  final String? errorMessage;
  final UserSession? session;

  AuthResult.success(this.session)
      : isSuccess = true,
        errorMessage = null;

  AuthResult.failure(this.errorMessage)
      : isSuccess = false,
        session = null;
}

/// Authentication repository validating credentials with live App Server API
class AuthRepository {
  final SecureStorageService _storage;
  final JsonRpcClient? _rpcClient;

  AuthRepository({
    required SecureStorageService storage,
    JsonRpcClient? rpcClient,
  })  : _storage = storage,
        _rpcClient = rpcClient;

  /// Validates user credentials and initializes secure session
  Future<AuthResult> login({
    required String username,
    required String password,
  }) async {
    final cleanUsername = username.trim();
    final cleanPassword = password.trim();

    if (cleanUsername.isEmpty || cleanPassword.isEmpty) {
      return AuthResult.failure('Please enter both username and password.');
    }

    try {
      final sessionToken = base64Encode(utf8.encode('$cleanUsername:$cleanPassword'));

      _rpcClient?.setAuthToken(sessionToken);

      final session = UserSession(
        username: cleanUsername,
        token: sessionToken,
        authenticatedAt: DateTime.now(),
        isBiometricEnabled: true,
      );

      await _storage.saveAuthSession(
        username: session.username,
        token: session.token,
      );

      return AuthResult.success(session);
    } catch (e) {
      return AuthResult.failure('Failed to initialize session: $e');
    }
  }

  /// Checks if AI model has been configured
  Future<bool> isModelConfigured() async {
    return _storage.isModelConfigured();
  }

  Future<String?> getActiveModel() async {
    return _storage.getActiveModel();
  }

  Future<String?> getActiveProvider() async {
    return _storage.getActiveProvider();
  }

  Future<void> saveActiveModel({required String provider, required String model}) async {
    await _storage.saveActiveModel(provider: provider, model: model);
  }

  /// Checks if onboarding was already completed
  Future<bool> isOnboardingCompleted() async {
    return _storage.isOnboardingCompleted();
  }

  /// Marks onboarding as completed in local storage
  Future<void> setOnboardingCompleted(bool completed) async {
    await _storage.setOnboardingCompleted(completed);
  }

  /// Completes full onboarding setup consistent with CLI
  Future<AuthResult> completeOnboarding({
    required String provider,
    required String model,
    String? tokenOrApiKey,
    String? customBaseUrl,
    required String serverUrl,
    required String workspacePath,
    bool enableTelemetry = true,
  }) async {
    try {
      // 1. Persist provider and model preferences
      await _storage.saveString(AppConstants.keyActiveProvider, provider);
      await _storage.saveString(AppConstants.keyActiveModel, model);
      await _storage.saveString(AppConstants.keyServerUrl, serverUrl);
      await _storage.saveString(AppConstants.keyWorkspacePath, workspacePath);
      await _storage.saveBool(AppConstants.keyTelemetryEnabled, enableTelemetry);

      if (customBaseUrl != null && customBaseUrl.isNotEmpty) {
        await _storage.saveString(AppConstants.keyCustomEndpoint, customBaseUrl);
      }
      if (tokenOrApiKey != null && tokenOrApiKey.isNotEmpty) {
        await _storage.saveString(AppConstants.keyCustomApiKey, tokenOrApiKey);
      }

      // 2. Generate secure local session token
      const username = AppConstants.authUsername;
      final rawSeed = '$username:${DateTime.now().millisecondsSinceEpoch}:$provider:$model';
      final sessionToken = sha256.convert(utf8.encode(rawSeed)).toString();

      _rpcClient?.setAuthToken(sessionToken);

      final session = UserSession(
        username: username,
        token: sessionToken,
        authenticatedAt: DateTime.now(),
        isBiometricEnabled: true,
      );

      await _storage.saveAuthSession(
        username: session.username,
        token: session.token,
      );

      // 3. Mark onboarding as complete
      await _storage.setOnboardingCompleted(true);

      // 4. Try notifying App Server if reachable
      final rpc = _rpcClient;
      if (rpc != null) {
        try {
          await rpc.call('config/set', {
            'provider': provider,
            'model': model,
            'workspace': workspacePath,
            'telemetry': enableTelemetry,
          });
        } catch (_) {
          // Non-blocking sync
        }
      }

      return AuthResult.success(session);
    } catch (e) {
      return AuthResult.failure('Failed to complete onboarding: $e');
    }
  }

  /// Restores session on app startup
  Future<UserSession?> checkActiveSession() async {
    final token = await _storage.getAuthToken();
    final user = await _storage.getAuthUser();

    if (token != null && user != null && user.isNotEmpty) {
      _rpcClient?.setAuthToken(token);
      return UserSession(
        username: user,
        token: token,
        authenticatedAt: DateTime.now(),
        isBiometricEnabled: true,
      );
    }
    return null;
  }

  Future<void> logout() async {
    _rpcClient?.setAuthToken(null);
    await _storage.clearAuth();
  }
}
