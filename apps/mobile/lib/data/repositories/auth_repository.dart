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

  /// Validates user credentials with live App Server
  Future<AuthResult> login({
    required String username,
    required String password,
  }) async {
    final cleanUsername = username.trim();
    final cleanPassword = password.trim();

    if (cleanUsername.isEmpty || cleanPassword.isEmpty) {
      return AuthResult.failure('Please enter both username and password.');
    }

    final rpc = _rpcClient;
    // Try authenticating with the live JSON-RPC server first
    if (rpc != null) {
      try {
        final res = await rpc.call('auth/login', {
          'username': cleanUsername,
          'password': cleanPassword,
        });

        if (res.isSuccess && res.result is Map<String, dynamic>) {
          final resultData = res.result as Map<String, dynamic>;
          final token = resultData['token']?.toString();
          if (token != null && token.isNotEmpty) {
            rpc.setAuthToken(token);

            final session = UserSession(
              username: cleanUsername,
              token: token,
              authenticatedAt: DateTime.now(),
              isBiometricEnabled: true,
            );

            await _storage.saveAuthSession(
              username: session.username,
              token: session.token,
            );

            return AuthResult.success(session);
          }
        } else if (res.error != null) {
          final msg = res.error!['message']?.toString() ?? 'Access denied.';
          return AuthResult.failure(msg);
        }
      } catch (_) {
        // Fall back to local verification if network call fails
      }
    }

    // Local deterministic verification fallback
    if (cleanUsername == AppConstants.authUsername &&
        cleanPassword == AppConstants.authPasswordHash) {
      final rawSeed = '$cleanUsername:${DateTime.now().millisecondsSinceEpoch}:ava-alpha-secret';
      final sessionToken = sha256.convert(utf8.encode(rawSeed)).toString();

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
    } else {
      return AuthResult.failure('Invalid credentials. Access denied to AvA Core.');
    }
  }

  /// Restores session on app startup
  Future<UserSession?> checkActiveSession() async {
    final token = await _storage.getAuthToken();
    final user = await _storage.getAuthUser();

    if (token != null && user != null && user == AppConstants.authUsername) {
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
