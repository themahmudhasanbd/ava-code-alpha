import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

enum ShadcnBadgeVariant {
  neutral,
  success,
  warning,
  danger,
  antigravity,
  outline,
  secondary,
  defaultVariant,
}

/// Minimalist pill badge for model names, statuses, and providers
class ShadcnBadge extends StatelessWidget {
  final String label;
  final IconData? icon;
  final ShadcnBadgeVariant variant;
  final bool showDot;

  const ShadcnBadge({
    super.key,
    required this.label,
    this.icon,
    this.variant = ShadcnBadgeVariant.neutral,
    this.showDot = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Color dotColor;
    Border? border;

    switch (variant) {
      case ShadcnBadgeVariant.neutral:
      case ShadcnBadgeVariant.defaultVariant:
        bg = AppColors.surfaceElevated;
        fg = AppColors.textSecondary;
        dotColor = AppColors.textSecondary;
        border = Border.all(color: AppColors.border, width: 1);
        break;
      case ShadcnBadgeVariant.outline:
        bg = Colors.transparent;
        fg = AppColors.textSecondary;
        dotColor = AppColors.textSecondary;
        border = Border.all(color: AppColors.borderStrong, width: 1);
        break;
      case ShadcnBadgeVariant.secondary:
        bg = const Color(0x20FFFFFF);
        fg = AppColors.textPrimary;
        dotColor = AppColors.accentPrimary;
        border = Border.all(color: const Color(0x30FFFFFF), width: 0.8);
        break;
      case ShadcnBadgeVariant.success:
        bg = AppColors.diffAddBg;
        fg = AppColors.diffAddText;
        dotColor = AppColors.accentSuccess;
        border = Border.all(color: AppColors.accentSuccess.withValues(alpha: 0.3), width: 1);
        break;
      case ShadcnBadgeVariant.warning:
        bg = AppColors.accentWarning.withValues(alpha: 0.12);
        fg = AppColors.accentWarning;
        dotColor = AppColors.accentWarning;
        border = Border.all(color: AppColors.accentWarning.withValues(alpha: 0.3), width: 1);
        break;
      case ShadcnBadgeVariant.danger:
        bg = AppColors.diffRemoveBg;
        fg = AppColors.diffRemoveText;
        dotColor = AppColors.accentDanger;
        border = Border.all(color: AppColors.accentDanger.withValues(alpha: 0.3), width: 1);
        break;
      case ShadcnBadgeVariant.antigravity:
        bg = AppColors.accentPrimary.withValues(alpha: 0.15);
        fg = const Color(0xFF60A5FA); // Blue 400
        dotColor = AppColors.accentPrimary;
        border = Border.all(color: AppColors.accentPrimary.withValues(alpha: 0.35), width: 1);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: border,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showDot) ...[
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ] else if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: AppTypography.codeSmall.copyWith(
              fontSize: 10.5,
              fontWeight: FontWeight.w500,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}
