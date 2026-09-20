import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

/// Handles persistent local storage of authentication tokens and preferences
class SecureStorageService {
  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  Future<void> saveAuthSession({
    required String username,
    required String token,
  }) async {
    await init();
    await _prefs!.setString(AppConstants.keyAuthUser, username);
    await _prefs!.setString(AppConstants.keyAuthToken, token);
  }

  Future<String?> getAuthToken() async {
    await init();
    return _prefs!.getString(AppConstants.keyAuthToken);
  }

  Future<String?> getAuthUser() async {
    await init();
    return _prefs!.getString(AppConstants.keyAuthUser);
  }

  Future<void> clearAuth() async {
    await init();
    await _prefs!.remove(AppConstants.keyAuthToken);
    await _prefs!.remove(AppConstants.keyAuthUser);
  }

  Future<void> saveString(String key, String value) async {
    await init();
    await _prefs!.setString(key, value);
  }

  Future<String?> getString(String key) async {
    await init();
    return _prefs!.getString(key);
  }
}
