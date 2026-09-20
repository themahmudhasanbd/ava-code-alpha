import 'package:flutter/material.dart';

/// Semantic Design Tokens for AvA Code Alpha.
/// Monochromatic & Minimalist Shadcn Zinc Palette (Pure Black/White in Light, Obsidian Zinc in Dark).
class AppColors {
  AppColors._();

  // Dark Theme Palette (Zinc / Obsidian)
  static const Color background = Color(0xFF09090B); // Zinc 950
  static const Color surface = Color(0xFF121215);    // Zinc 900
  static const Color surfaceElevated = Color(0xFF18181B); // Zinc 850
  static const Color surfaceSubtle = Color(0xFF27272A); // Zinc 800
  static const Color surfaceHighlight = Color(0xFF3F3F46); // Zinc 700

  // Light Theme Palette (Clean Monochrome / Pure Minimalist)
  static const Color lightBackground = Color(0xFFFAFAFA); // Zinc 50
  static const Color lightSurface = Color(0xFFFFFFFF);    // Pure White
  static const Color lightSurfaceElevated = Color(0xFFF4F4F5); // Zinc 100
  static const Color lightSurfaceSubtle = Color(0xFFE4E4E7); // Zinc 200
  static const Color lightSurfaceHighlight = Color(0xFFD4D4D8); // Zinc 300

  // 1px Subtle Borders (Dark)
  static const Color border = Color(0x1AFFFFFF); // 10% white
  static const Color borderSubtle = Color(0x0DFFFFFF); // 5% white
  static const Color borderStrong = Color(0x2EFFFFFF); // 18% white
  static const Color borderFocus = Color(0xFFFAFAFA); // Focus ring

  // Light Theme Borders (Clean Zinc Neutral)
  static const Color lightBorder = Color(0xFFE4E4E7); // Zinc 200
  static const Color lightBorderSubtle = Color(0xFFF4F4F5); // Zinc 100
  static const Color lightBorderStrong = Color(0xFFD4D4D8); // Zinc 300
  static const Color lightBorderFocus = Color(0xFF18181B); // Zinc 900

  // Typography & Foreground (Dark)
  static const Color textPrimary = Color(0xFFFAFAFA); // Zinc 50
  static const Color textSecondary = Color(0xFFA1A1AA); // Zinc 400
  static const Color textMuted = Color(0xFF71717A); // Zinc 500
  static const Color textInverse = Color(0xFF09090B); // Zinc 950

  // Typography & Foreground (Light - Pure Black/Zinc, No Blue)
  static const Color lightTextPrimary = Color(0xFF09090B); // Zinc 950
  static const Color lightTextSecondary = Color(0xFF52525B); // Zinc 600
  static const Color lightTextMuted = Color(0xFF71717A); // Zinc 500
  static const Color lightTextInverse = Color(0xFFFFFFFF); // Pure White

  // Accents & Signals (Monochrome Focused)
  static const Color accentPrimary = Color(0xFFFAFAFA); // Monochrome default
  static const Color accentIndigo = Color(0xFF18181B);
  static const Color accentCyan = Color(0xFF71717A);
  static const Color accentSuccess = Color(0xFF10B981); // Emerald 500
  static const Color accentWarning = Color(0xFFF59E0B); // Amber 500
  static const Color accentDanger = Color(0xFFEF4444); // Red 500
  static const Color accentPurple = Color(0xFF71717A);

  // Diff Colors
  static const Color diffAddBg = Color(0x1A10B981); // Emerald 10%
  static const Color diffAddText = Color(0xFF10B981); // Emerald 500
  static const Color diffRemoveBg = Color(0x1AEF4444); // Red 10%
  static const Color diffRemoveText = Color(0xFFEF4444); // Red 500

  // Context-aware Dynamic Helpers
  static bool isDark(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark;

  static Color bg(BuildContext context) =>
      isDark(context) ? background : lightBackground;

  static Color card(BuildContext context) =>
      isDark(context) ? surface : lightSurface;

  static Color cardElevated(BuildContext context) =>
      isDark(context) ? surfaceElevated : lightSurfaceElevated;

  static Color cardSubtle(BuildContext context) =>
      isDark(context) ? surfaceSubtle : lightSurfaceSubtle;

  static Color line(BuildContext context) =>
      isDark(context) ? border : lightBorder;

  static Color lineStrong(BuildContext context) =>
      isDark(context) ? borderStrong : lightBorderStrong;

  static Color text(BuildContext context) =>
      isDark(context) ? textPrimary : lightTextPrimary;

  static Color subtext(BuildContext context) =>
      isDark(context) ? textSecondary : lightTextSecondary;

  static Color muted(BuildContext context) =>
      isDark(context) ? textMuted : lightTextMuted;

  static Color accent(BuildContext context) =>
      isDark(context) ? textPrimary : lightTextPrimary;

  static Color primary(BuildContext context) =>
      isDark(context) ? textPrimary : lightTextPrimary;
}
