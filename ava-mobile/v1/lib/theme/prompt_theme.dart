import 'package:flutter/material.dart';

/// Central design tokens and color theme based on AvA Code's original prompt box
/// and interface aesthetic (Indigo/Violet gradients, vibrant accents, sleek dark/light surfaces).
class PromptTheme {
  PromptTheme._();

  // ── Primary Brand & Gradients ───────────────────────────────────────────────
  static const Color primary = Color(0xFF6366F1); // Indigo-500
  static const Color primaryDark = Color(0xFF4F46E5); // Indigo-600
  static const Color primaryLight = Color(0xFF818CF8); // Indigo-400
  static const Color primaryLighter = Color(0xFFA5B4FC); // Indigo-300
  static const Color primarySoft = Color(0xFFEEF2FF); // Indigo-50

  // ── Send Button Gradient ───────────────────────────────────────────────────
  static const LinearGradient primarySendGradient = LinearGradient(
    colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ── Stop / Interrupt Gradient ──────────────────────────────────────────────
  static const LinearGradient stopButtonGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ── Agent Dropdown Badge Gradient & Colors ─────────────────────────────────
  static LinearGradient agentBadgeGradient(bool isDark) {
    return LinearGradient(
      colors: isDark
          ? [
              const Color(0xFF6366F1).withValues(alpha: 0.22),
              const Color(0xFF4F46E5).withValues(alpha: 0.12),
            ]
          : [
              const Color(0xFFEEF2FF),
              const Color(0xFFE0E7FF),
            ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  static const Color agentBadgeBorder = Color(0xFF6366F1);

  static Color agentBadgeTextColor(bool isDark) {
    return isDark ? const Color(0xFFA5B4FC) : const Color(0xFF4F46E5);
  }

  // ── Workspace Dropdown Badge Gradient & Colors ─────────────────────────────
  static LinearGradient workspaceBadgeGradient(bool isDark) {
    return LinearGradient(
      colors: isDark
          ? [
              const Color(0xFF3B82F6).withValues(alpha: 0.22),
              const Color(0xFF1D4ED8).withValues(alpha: 0.12),
            ]
          : [
              const Color(0xFFEFF6FF),
              const Color(0xFFDBEAFE),
            ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  static const Color workspaceBadgeBorder = Color(0xFF3B82F6);

  static Color workspaceBadgeTextColor(bool isDark) {
    return isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8);
  }

  // ── Tools Button Styling ───────────────────────────────────────────────────
  static Color toolsButtonBg(bool isDark) {
    return isDark
        ? const Color(0xFFFFFFFF).withValues(alpha: 0.07)
        : const Color(0xFF000000).withValues(alpha: 0.05);
  }

  static Color toolsButtonBorder(bool isDark) {
    return isDark
        ? const Color(0xFFFFFFFF).withValues(alpha: 0.12)
        : const Color(0xFF000000).withValues(alpha: 0.08);
  }

  // ── Container & Surfaces (Crystal Transparent Glossy Glass) ────────────────
  static Color cardBg(bool isDark) {
    return isDark
        ? const Color(0xFF18181B).withValues(alpha: 0.25)
        : Colors.white.withValues(alpha: 0.30);
  }

  static Color borderColor(bool isDark) {
    return isDark
        ? const Color(0xFFFFFFFF).withValues(alpha: 0.18)
        : const Color(0xFF000000).withValues(alpha: 0.12);
  }

  static Color buttonBg(bool isDark) {
    return isDark
        ? const Color(0xFFFFFFFF).withValues(alpha: 0.10)
        : const Color(0xFF000000).withValues(alpha: 0.06);
  }

  static Color buttonHoverBg(bool isDark) {
    return isDark
        ? const Color(0xFFFFFFFF).withValues(alpha: 0.18)
        : const Color(0xFF000000).withValues(alpha: 0.10);
  }

  static Color outerBarBg(bool isDark) {
    return Colors.transparent;
  }

  // ── Shadows ────────────────────────────────────────────────────────────────
  static List<BoxShadow> promptCardShadow(bool isDark, [Color? accentColor]) {
    return [
      BoxShadow(
        color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.06),
        blurRadius: 16,
        spreadRadius: 0,
        offset: const Offset(0, 4),
      ),
    ];
  }

  static List<BoxShadow> buttonShadow(Color color) {
    return [
      BoxShadow(
        color: color.withValues(alpha: 0.35),
        blurRadius: 6,
        offset: const Offset(0, 2),
      ),
    ];
  }
}
