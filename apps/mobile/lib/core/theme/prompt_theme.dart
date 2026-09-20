import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Central design tokens and color theme matching AvA Code's premier prompt box
class PromptTheme {
  PromptTheme._();

  // Primary Brand & Gradients
  static const Color primary = Color(0xFF6366F1); // Indigo-500
  static const Color primaryDark = Color(0xFF4F46E5); // Indigo-600
  static const Color primaryLight = Color(0xFF818CF8); // Indigo-400
  static const Color primaryLighter = Color(0xFFA5B4FC); // Indigo-300
  static const Color primarySoft = Color(0xFFEEF2FF); // Indigo-50

  // Send Button Gradient
  static const LinearGradient primarySendGradient = LinearGradient(
    colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Stop / Interrupt Gradient
  static const LinearGradient stopButtonGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Container & Surfaces (Theme Aware)
  static Color cardBgFor(BuildContext context) => AppColors.isDark(context)
      ? const Color(0xF218181D)
      : const Color(0xF8FFFFFF);

  static Color borderColorFor(BuildContext context) => AppColors.isDark(context)
      ? const Color(0x38FFFFFF)
      : const Color(0xFFE2E8F0);

  static Color buttonBgFor(BuildContext context) => AppColors.isDark(context)
      ? const Color(0x1AFFFFFF)
      : const Color(0xFFF1F5F9);

  static Color buttonHoverBgFor(BuildContext context) => AppColors.isDark(context)
      ? const Color(0x2EFFFFFF)
      : const Color(0xFFE2E8F0);

  // Shadows
  static List<BoxShadow> promptCardShadowFor(BuildContext context) {
    if (AppColors.isDark(context)) {
      return [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.45),
          blurRadius: 24,
          spreadRadius: 0,
          offset: const Offset(0, 8),
        ),
        BoxShadow(
          color: const Color(0xFF6366F1).withValues(alpha: 0.08),
          blurRadius: 16,
          offset: const Offset(0, 2),
        ),
      ];
    } else {
      return [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.06),
          blurRadius: 20,
          spreadRadius: 0,
          offset: const Offset(0, 6),
        ),
        BoxShadow(
          color: const Color(0xFF6366F1).withValues(alpha: 0.04),
          blurRadius: 12,
          offset: const Offset(0, 2),
        ),
      ];
    }
  }

  // Legacy fallback constants
  static const Color cardBg = Color(0xF218181D);
  static const Color borderColor = Color(0x38FFFFFF);
  static const Color buttonBg = Color(0x1AFFFFFF);
  static const Color buttonHoverBg = Color(0x2EFFFFFF);
  static List<BoxShadow> get promptCardShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.45),
          blurRadius: 24,
          spreadRadius: 0,
          offset: const Offset(0, 8),
        ),
      ];
}
