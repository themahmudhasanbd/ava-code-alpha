import 'package:flutter/material.dart';

/// Shadcn-inspired Zinc color tokens for AvA Code Alpha
class AppColors {
  AppColors._();

  // Zinc Neutral Palette
  static const Color background = Color(0xFF09090B); // Zinc 950
  static const Color surface = Color(0xFF121215);    // Zinc 900
  static const Color surfaceElevated = Color(0xFF18181B); // Zinc 850
  static const Color surfaceSubtle = Color(0xFF27272A); // Zinc 800
  static const Color surfaceHighlight = Color(0xFF3F3F46); // Zinc 700

  // 1px Subtle Borders
  static const Color border = Color(0x14FFFFFF); // 8% white
  static const Color borderSubtle = Color(0x0DFFFFFF); // 5% white
  static const Color borderStrong = Color(0x26FFFFFF); // 15% white
  static const Color borderFocus = Color(0xFFFAFAFA); // White focus ring

  // Typography & Foreground
  static const Color textPrimary = Color(0xFFFAFAFA); // Zinc 50
  static const Color textSecondary = Color(0xFFA1A1AA); // Zinc 400
  static const Color textMuted = Color(0xFF71717A); // Zinc 500
  static const Color textInverse = Color(0xFF09090B); // Zinc 950

  // Accents & Signals
  static const Color accentPrimary = Color(0xFF3B82F6); // Blue 500
  static const Color accentCyan = Color(0xFF06B6D4); // Cyan 500
  static const Color accentSuccess = Color(0xFF10B981); // Emerald 500
  static const Color accentWarning = Color(0xFFF59E0B); // Amber 500
  static const Color accentDanger = Color(0xFFEF4444); // Red 500
  static const Color accentPurple = Color(0xFF8B5CF6); // Violet 500

  // Diff Colors
  static const Color diffAddBg = Color(0x1A10B981); // Emerald 10%
  static const Color diffAddText = Color(0xFF34D399); // Emerald 400
  static const Color diffRemoveBg = Color(0x1AEF4444); // Red 10%
  static const Color diffRemoveText = Color(0xFFF87171); // Red 400
}
