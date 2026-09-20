import 'package:flutter/material.dart';
import '../../core/storage/secure_storage_service.dart';

/// Reactive Theme Controller supporting Light and Dark modes with persistent storage
class ThemeController extends ChangeNotifier {
  static const String _storageKeyTheme = 'ava_app_theme_mode';
  final SecureStorageService _storage;
  ThemeMode _themeMode = ThemeMode.dark;

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  ThemeController({required SecureStorageService storage}) : _storage = storage;

  Future<void> init() async {
    final savedMode = await _storage.getString(_storageKeyTheme);
    if (savedMode == 'light') {
      _themeMode = ThemeMode.light;
    } else {
      _themeMode = ThemeMode.dark;
    }
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    if (_themeMode == ThemeMode.dark) {
      _themeMode = ThemeMode.light;
      await _storage.saveString(_storageKeyTheme, 'light');
    } else {
      _themeMode = ThemeMode.dark;
      await _storage.saveString(_storageKeyTheme, 'dark');
    }
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    await _storage.saveString(_storageKeyTheme, mode == ThemeMode.light ? 'light' : 'dark');
    notifyListeners();
  }
}
