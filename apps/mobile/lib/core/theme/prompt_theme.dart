import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Central design tokens and color theme matching AvA Code's premier prompt box
class PromptTheme {
  PromptTheme._();

  // Primary Brand (Monochrome Zinc)
  static const Color primary = Color(0xFF18181B); // Zinc-900
  static const Color primaryDark = Color(0xFF09090B); // Zinc-950
  static const Color primaryLight = Color(0xFF27272A); // Zinc-800
  static const Color primaryLighter = Color(0xFF71717A); // Zinc-500
  static const Color primarySoft = Color(0xFFF4F4F5); // Zinc-100

  // Send Button Gradient (Sleek Monochrome)
  static LinearGradient sendGradientFor(BuildContext context) {
    return AppColors.isDark(context)
        ? const LinearGradient(
            colors: [Color(0xFFFAFAFA), Color(0xFFE4E4E7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : const LinearGradient(
            colors: [Color(0xFF18181B), Color(0xFF09090B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          );
  }

  // Stop / Interrupt Gradient
  static const LinearGradient stopButtonGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Container & Surfaces (Theme Aware)
  static Color cardBgFor(BuildContext context) => AppColors.isDark(context)
      ? const Color(0xF218181B)
      : const Color(0xF8FFFFFF);

  static Color borderColorFor(BuildContext context) => AppColors.isDark(context)
      ? const Color(0x2EFFFFFF)
      : const Color(0xFFE4E4E7);

  static Color buttonBgFor(BuildContext context) => AppColors.isDark(context)
      ? const Color(0x1AFFFFFF)
      : const Color(0xFFF4F4F5);

  static Color buttonHoverBgFor(BuildContext context) => AppColors.isDark(context)
      ? const Color(0x2EFFFFFF)
      : const Color(0xFFE4E4E7);

  // Shadows
  static List<BoxShadow> promptCardShadowFor(BuildContext context) {
    if (AppColors.isDark(context)) {
      return [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.5),
          blurRadius: 24,
          spreadRadius: 0,
          offset: const Offset(0, 8),
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
      ];
    }
  }

  // Legacy fallback constants
  static const Color cardBg = Color(0xF218181B);
  static const Color borderColor = Color(0x2EFFFFFF);
  static const Color buttonBg = Color(0x1AFFFFFF);
  static const Color buttonHoverBg = Color(0x2EFFFFFF);
}

