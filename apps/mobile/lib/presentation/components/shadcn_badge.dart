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

/// Minimalist monochrome pill badge for model names, statuses, and providers
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

    final isDark = AppColors.isDark(context);

    switch (variant) {
      case ShadcnBadgeVariant.neutral:
      case ShadcnBadgeVariant.defaultVariant:
      case ShadcnBadgeVariant.secondary:
      case ShadcnBadgeVariant.antigravity:
        bg = isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated;
        fg = AppColors.text(context);
        dotColor = AppColors.subtext(context);
        border = Border.all(color: AppColors.line(context), width: 1);
        break;
      case ShadcnBadgeVariant.outline:
        bg = Colors.transparent;
        fg = AppColors.subtext(context);
        dotColor = AppColors.subtext(context);
        border = Border.all(color: AppColors.line(context), width: 1);
        break;
      case ShadcnBadgeVariant.success:
        bg = AppColors.diffAddBg;
        fg = AppColors.diffAddText;
        dotColor = AppColors.accentSuccess;
        border = Border.all(color: AppColors.accentSuccess.withValues(alpha: 0.25), width: 1);
        break;
      case ShadcnBadgeVariant.warning:
        bg = isDark ? const Color(0x20F59E0B) : const Color(0x15F59E0B);
        fg = AppColors.accentWarning;
        dotColor = AppColors.accentWarning;
        border = Border.all(color: AppColors.accentWarning.withValues(alpha: 0.25), width: 1);
        break;
      case ShadcnBadgeVariant.danger:
        bg = AppColors.diffRemoveBg;
        fg = AppColors.diffRemoveText;
        dotColor = AppColors.accentDanger;
        border = Border.all(color: AppColors.accentDanger.withValues(alpha: 0.25), width: 1);
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
