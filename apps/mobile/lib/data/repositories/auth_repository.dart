import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../../core/constants/app_constants.dart';
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

/// Authentication repository validating credentials and managing sessions
class AuthRepository {
  final SecureStorageService _storage;

  AuthRepository({required SecureStorageService storage}) : _storage = storage;

  /// Validates user credentials: username `mahmudhasan` & password `SamirisonlyforAdria%2`
  Future<AuthResult> login({
    required String username,
    required String password,
  }) async {
    // Artificial smooth latency to feel responsive yet secure
    await Future.delayed(const Duration(milliseconds: 350));

    final cleanUsername = username.trim();
    final cleanPassword = password.trim();

    if (cleanUsername.isEmpty || cleanPassword.isEmpty) {
      return AuthResult.failure('Please enter both username and password.');
    }

    if (cleanUsername == AppConstants.authUsername &&
        cleanPassword == AppConstants.authPasswordHash) {
      // Generate a secure session token
      final rawSeed = '$cleanUsername:${DateTime.now().millisecondsSinceEpoch}:ava-alpha-secret';
      final sessionToken = sha256.convert(utf8.encode(rawSeed)).toString();

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
    await _storage.clearAuth();
  }
}
