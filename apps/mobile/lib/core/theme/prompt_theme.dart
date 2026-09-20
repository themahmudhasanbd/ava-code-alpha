import 'package:flutter/material.dart';

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

  // Container & Surfaces (Crystal Transparent Glossy Glass)
  static const Color cardBg = Color(0xF218181D); // Zinc 900 translucent
  static const Color borderColor = Color(0x38FFFFFF);
  static const Color buttonBg = Color(0x1AFFFFFF);
  static const Color buttonHoverBg = Color(0x2EFFFFFF);

  // Shadows
  static List<BoxShadow> get promptCardShadow => [
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
}
