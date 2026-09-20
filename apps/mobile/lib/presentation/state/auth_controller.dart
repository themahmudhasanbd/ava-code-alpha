import 'package:flutter/foundation.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/user_session.dart';
import '../../data/repositories/auth_repository.dart';

enum AuthStatus {
  uninitialized,
  needsOnboarding,
  unauthenticated,
  authenticating,
  authenticated,
}

/// Reactive State Controller for User Authentication & Onboarding
class AuthController extends ChangeNotifier {
  final AuthRepository _repository;

  AuthStatus _status = AuthStatus.uninitialized;
  UserSession? _session;
  String? _errorMessage;
  int _initialTabIndex = 0;

  AuthController({required AuthRepository repository}) : _repository = repository;

  AuthStatus get status => _status;
  UserSession? get session => _session;
  String? get errorMessage => _errorMessage;
  int get initialTabIndex => _initialTabIndex;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get needsOnboarding => _status == AuthStatus.needsOnboarding;

  void setInitialTabIndex(int index) {
    _initialTabIndex = index;
    notifyListeners();
  }

  /// Finishes onboarding, saves selected model, and enters main dashboard
  Future<void> finishOnboarding({
    String? provider,
    String? model,
    int targetTab = 0,
  }) async {
    if (provider != null && model != null) {
      await _repository.saveActiveModel(provider: provider, model: model);
    } else {
      await _repository.setOnboardingCompleted(true);
    }
    _initialTabIndex = targetTab;
    _status = AuthStatus.authenticated;
    _errorMessage = null;
    notifyListeners();
  }

  /// Initializes auth state on app launch
  Future<void> init() async {
    _status = AuthStatus.authenticating;
    notifyListeners();

    try {
      final active = await _repository.checkActiveSession();
      if (active != null) {
        _session = active;
        final hasModel = await _repository.isModelConfigured();
        if (!hasModel) {
          _status = AuthStatus.needsOnboarding;
        } else {
          _status = AuthStatus.authenticated;
        }
        _errorMessage = null;
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (e) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  /// Completes the streamlined 2-step onboarding flow (Provider & Model)
  Future<bool> completeOnboarding({
    required String provider,
    required String model,
    String? tokenOrApiKey,
    String? customBaseUrl,
  }) async {
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();

    final result = await _repository.completeOnboarding(
      provider: provider,
      model: model,
      tokenOrApiKey: tokenOrApiKey,
      customBaseUrl: customBaseUrl,
      serverUrl: AppConstants.defaultHost,
      workspacePath: '/var/www/ava-code',
      enableTelemetry: false,
    );

    if (result.isSuccess && result.session != null) {
      _session = result.session;
      _status = AuthStatus.authenticated;
      _errorMessage = null;
      notifyListeners();
      return true;
    } else {
      _status = AuthStatus.needsOnboarding;
      _errorMessage = result.errorMessage ?? 'Setup completion failed';
      notifyListeners();
      return false;
    }
  }

  /// Attempts login with user credentials, checks model config, and routes accordingly
  Future<bool> login({
    required String username,
    required String password,
  }) async {
    _errorMessage = null;

    final result = await _repository.login(
      username: username,
      password: password,
    );

    if (result.isSuccess && result.session != null) {
      _session = result.session;
      _errorMessage = null;

      final hasModel = await _repository.isModelConfigured();
      if (!hasModel) {
        _status = AuthStatus.needsOnboarding;
      } else {
        _status = AuthStatus.authenticated;
      }

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

  /// Resets onboarding back to the initial wizard
  Future<void> restartOnboarding() async {
    await _repository.logout();
    _session = null;
    _status = AuthStatus.needsOnboarding;
    _errorMessage = null;
    notifyListeners();
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
