import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Modern typography system matching Claude / Codex / Inter design specifications
class AppTypography {
  AppTypography._();

  // Primary UI Font: Inter with tight tracking and high legibility
  static TextStyle get displayLarge => GoogleFonts.inter(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.8,
        color: AppColors.textPrimary,
        height: 1.2,
      );

  static TextStyle get displayMedium => GoogleFonts.inter(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.6,
        color: AppColors.textPrimary,
        height: 1.25,
      );

  static TextStyle get titleLarge => GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.4,
        color: AppColors.textPrimary,
        height: 1.3,
      );

  static TextStyle get titleMedium => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        letterSpacing: -0.2,
        color: AppColors.textPrimary,
        height: 1.35,
      );

  static TextStyle get bodyLarge => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        letterSpacing: -0.1,
        color: AppColors.textPrimary,
        height: 1.45,
      );

  static TextStyle get bodyMedium => GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: AppColors.textSecondary,
        height: 1.4,
      );

  static TextStyle get bodySmall => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.1,
        color: AppColors.textMuted,
        height: 1.35,
      );

  static TextStyle get labelMedium => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.1,
        color: AppColors.textPrimary,
      );

  // Monospace Code Font: JetBrains Mono for streaming tokens, diffs, terminal
  static TextStyle get codeLarge => GoogleFonts.jetBrainsMono(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        letterSpacing: -0.2,
        color: AppColors.textPrimary,
        height: 1.5,
      );

  static TextStyle get codeMedium => GoogleFonts.jetBrainsMono(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        letterSpacing: -0.1,
        color: AppColors.textPrimary,
        height: 1.45,
      );

  static TextStyle get codeSmall => GoogleFonts.jetBrainsMono(
        fontSize: 10.5,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: AppColors.textSecondary,
        height: 1.4,
      );
}
