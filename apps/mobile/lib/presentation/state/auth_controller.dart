import 'package:flutter/foundation.dart';
import '../../data/models/user_session.dart';
import '../../data/repositories/auth_repository.dart';

enum AuthStatus {
  uninitialized,
  unauthenticated,
  authenticating,
  authenticated,
}

/// Reactive State Controller for User Authentication
class AuthController extends ChangeNotifier {
  final AuthRepository _repository;

  AuthStatus _status = AuthStatus.uninitialized;
  UserSession? _session;
  String? _errorMessage;

  AuthController({required AuthRepository repository}) : _repository = repository;

  AuthStatus get status => _status;
  UserSession? get session => _session;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  /// Initializes auth state on app launch (auto-login check)
  Future<void> init() async {
    _status = AuthStatus.authenticating;
    notifyListeners();

    try {
      final active = await _repository.checkActiveSession();
      if (active != null) {
        _session = active;
        _status = AuthStatus.authenticated;
        _errorMessage = null;
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (e) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  /// Attempts login with user credentials
  Future<bool> login({
    required String username,
    required String password,
  }) async {
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();

    final result = await _repository.login(
      username: username,
      password: password,
    );

    if (result.isSuccess && result.session != null) {
      _session = result.session;
      _status = AuthStatus.authenticated;
      _errorMessage = null;
      notifyListeners();
      return true;
    } else {
      _session = null;
      _status = AuthStatus.unauthenticated;
      _errorMessage = result.errorMessage ?? 'Authentication failed';
      notifyListeners();
      return false;
    }
  }

  /// Logs out user and clears session
  Future<void> logout() async {
    await _repository.logout();
    _session = null;
    _status = AuthStatus.unauthenticated;
    _errorMessage = null;
    notifyListeners();
  }
}
