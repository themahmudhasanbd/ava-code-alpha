import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AvaThemePreset {
  openCodeDark,
  openCodeLight,
  dracula,
  tokyoNight,
  catppuccin,
  nord,
  monokai,
  matrix,
}

class AppTheme {
  static const String _prefKey = 'ava_theme_preset';

  static final ValueNotifier<AvaThemePreset> currentThemeNotifier =
      ValueNotifier<AvaThemePreset>(AvaThemePreset.openCodeLight);

  static Future<void> initTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedName = prefs.getString(_prefKey);
      if (savedName != null) {
        for (final preset in AvaThemePreset.values) {
          if (preset.name == savedName) {
            currentThemeNotifier.value = preset;
            break;
          }
        }
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  static Future<void> setTheme(AvaThemePreset preset) async {
    currentThemeNotifier.value = preset;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, preset.name);
    } catch (e) { print('Ignored error: $e'); }
  }

  static bool get isDark => currentThemeNotifier.value != AvaThemePreset.openCodeLight;

  static Color get bg {
    switch (currentThemeNotifier.value) {
      case AvaThemePreset.openCodeLight:
        return const Color(0xFFF8FAFC);
      case AvaThemePreset.dracula:
        return const Color(0xFF282A36);
      case AvaThemePreset.tokyoNight:
        return const Color(0xFF1A1B26);
      case AvaThemePreset.catppuccin:
        return const Color(0xFF1E1E2E);
      case AvaThemePreset.nord:
        return const Color(0xFF2E3440);
      case AvaThemePreset.monokai:
        return const Color(0xFF272822);
      case AvaThemePreset.matrix:
        return const Color(0xFF0D0D0D);
      case AvaThemePreset.openCodeDark:
        return const Color(0xFF09090B);
    }
  }

  static Color get cardBg {
    switch (currentThemeNotifier.value) {
      case AvaThemePreset.openCodeLight:
        return Colors.white;
      case AvaThemePreset.dracula:
        return const Color(0xFF44475A);
      case AvaThemePreset.tokyoNight:
        return const Color(0xFF24283B);
      case AvaThemePreset.catppuccin:
        return const Color(0xFF25253A);
      case AvaThemePreset.nord:
        return const Color(0xFF3B4252);
      case AvaThemePreset.monokai:
        return const Color(0xFF3E3D32);
      case AvaThemePreset.matrix:
        return const Color(0xFF1A1A1A);
      case AvaThemePreset.openCodeDark:
        return const Color(0xFF18181B);
    }
  }

  static Color get borderColor {
    switch (currentThemeNotifier.value) {
      case AvaThemePreset.openCodeLight:
        return const Color(0xFFCBD5E1);
      case AvaThemePreset.dracula:
        return const Color(0xFF6272A4);
      case AvaThemePreset.tokyoNight:
        return const Color(0xFF414868);
      case AvaThemePreset.catppuccin:
        return const Color(0xFF313244);
      case AvaThemePreset.nord:
        return const Color(0xFF4C566A);
      case AvaThemePreset.monokai:
        return const Color(0xFF49483E);
      case AvaThemePreset.matrix:
        return const Color(0xFF00FF66).withValues(alpha: 0.3);
      case AvaThemePreset.openCodeDark:
        return const Color(0xFF27272A);
    }
  }

  static Color get primary {
    switch (currentThemeNotifier.value) {
      case AvaThemePreset.openCodeLight:
      case AvaThemePreset.openCodeDark:
        return const Color(0xFF4F46E5);
      case AvaThemePreset.dracula:
        return const Color(0xFFBD93F9);
      case AvaThemePreset.tokyoNight:
        return const Color(0xFF7AA2F7);
      case AvaThemePreset.catppuccin:
        return const Color(0xFFCBA6F7);
      case AvaThemePreset.nord:
        return const Color(0xFF88C0D0);
      case AvaThemePreset.monokai:
        return const Color(0xFFF92672);
      case AvaThemePreset.matrix:
        return const Color(0xFF00FF66);
    }
  }

  static Color get textPrimary {
    switch (currentThemeNotifier.value) {
      case AvaThemePreset.openCodeLight:
        return const Color(0xFF0F172A);
      case AvaThemePreset.dracula:
        return const Color(0xFFF8F8F2);
      case AvaThemePreset.tokyoNight:
        return const Color(0xFFA9B1D6);
      case AvaThemePreset.catppuccin:
        return const Color(0xFFCDD6F4);
      case AvaThemePreset.nord:
        return const Color(0xFFECEFF4);
      case AvaThemePreset.monokai:
        return const Color(0xFFF8F8F2);
      case AvaThemePreset.matrix:
        return const Color(0xFF00FF66);
      case AvaThemePreset.openCodeDark:
        return const Color(0xFFFAFAFA);
    }
  }

  static Color get textSecondary {
    switch (currentThemeNotifier.value) {
      case AvaThemePreset.openCodeLight:
        return const Color(0xFF334155);
      case AvaThemePreset.dracula:
        return const Color(0xFF6272A4);
      case AvaThemePreset.tokyoNight:
        return const Color(0xFF565F89);
      case AvaThemePreset.catppuccin:
        return const Color(0xFFA6ADC8);
      case AvaThemePreset.nord:
        return const Color(0xD8ECEFF4);
      case AvaThemePreset.monokai:
        return const Color(0xFF75715E);
      case AvaThemePreset.matrix:
        return const Color(0xFF009933);
      case AvaThemePreset.openCodeDark:
        return const Color(0xFFA1A1AA);
    }
  }

  static String getPresetName(AvaThemePreset preset) {
    switch (preset) {
      case AvaThemePreset.openCodeDark:
        return 'AvA OpenCode Dark';
      case AvaThemePreset.openCodeLight:
        return 'AvA OpenCode Light';
      case AvaThemePreset.dracula:
        return 'Dracula Theme';
      case AvaThemePreset.tokyoNight:
        return 'Tokyo Night';
      case AvaThemePreset.catppuccin:
        return 'Catppuccin Macchiato';
      case AvaThemePreset.nord:
        return 'Nord Theme';
      case AvaThemePreset.monokai:
        return 'Monokai Pro';
      case AvaThemePreset.matrix:
        return 'Matrix Terminal';
    }
  }

  static ThemeData get themeData {
    return ThemeData(
      brightness: isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: bg,
      colorScheme: ColorScheme(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: primary,
        onPrimary: Colors.white,
        secondary: primary,
        onSecondary: Colors.white,
        error: Colors.redAccent,
        onError: Colors.white,
        surface: cardBg,
        onSurface: textPrimary,
      ),
      fontFamily: 'HindSiliguri',
      fontFamilyFallback: const [
        'HindSiliguri',
        'Hind Siliguri',
        'NotoSansBengali',
        'Noto Sans Bengali',
        'Inter',
        'PlusJakartaSans',
        'sans-serif',
      ],
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  static const Color accentTeal = Color(0xFF06B6D4);
  static const Color bgDark = Color(0xFF09090B);
  static const Color bgLight = Color(0xFFF8FAFC);

  // ─── Impeccable Semantic Z-Index Scale ─────────────────────────────────────
  static const int zDropdown = 1000;
  static const int zSticky = 1100;
  static const int zBackdrop = 1200;
  static const int zModal = 1300;
  static const int zToast = 1400;
  static const int zTooltip = 1500;

  // ─── Impeccable Motion Deceleration Curves (Anti-Bounce) ───────────────────
  static const Curve easeOutQuart = Cubic(0.25, 1.0, 0.5, 1.0);
  static const Curve easeOutQuint = Cubic(0.22, 1.0, 0.36, 1.0);
  static const Curve easeOutExpo = Cubic(0.16, 1.0, 0.3, 1.0);

  // ─── Impeccable Typographic Standards ──────────────────────────────────────
  static const double displayLetterSpacingFloor = -0.04;
  static const double maxBodyChLength = 70.0;
}
