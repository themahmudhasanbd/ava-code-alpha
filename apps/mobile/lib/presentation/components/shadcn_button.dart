import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_motion.dart';
import '../../core/theme/app_typography.dart';

enum ShadcnButtonVariant {
  primary,
  secondary,
  outline,
  ghost,
  destructive,
}

enum ShadcnButtonSize {
  sm,
  md,
  lg,
}

/// Tactile animated button with micro-spring scaling and smooth loading state
class ShadcnButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final ShadcnButtonVariant variant;
  final ShadcnButtonSize size;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;

  const ShadcnButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.variant = ShadcnButtonVariant.primary,
    this.size = ShadcnButtonSize.md,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
  });

  @override
  State<ShadcnButton> createState() => _ShadcnButtonState();
}

class _ShadcnButtonState extends State<ShadcnButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: AppMotion.durationFast,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: AppMotion.buttonPressScale,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails _) {
    if (widget.onPressed != null && !widget.isLoading) {
      _controller.forward();
    }
  }

  void _onTapUp(TapUpDetails _) {
    _controller.reverse();
  }

  void _onTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final isEnabled = widget.onPressed != null && !widget.isLoading;

    Color bg;
    Color fg;
    Border? border;

    switch (widget.variant) {
      case ShadcnButtonVariant.primary:
        bg = isEnabled ? AppColors.textPrimary : AppColors.surfaceSubtle;
        fg = isEnabled ? AppColors.textInverse : AppColors.textMuted;
        border = null;
        break;
      case ShadcnButtonVariant.secondary:
        bg = AppColors.surfaceSubtle;
        fg = AppColors.textPrimary;
        border = Border.all(color: AppColors.border, width: 1);
        break;
      case ShadcnButtonVariant.outline:
        bg = Colors.transparent;
        fg = AppColors.textPrimary;
        border = Border.all(color: AppColors.borderStrong, width: 1);
        break;
      case ShadcnButtonVariant.ghost:
        bg = Colors.transparent;
        fg = AppColors.textSecondary;
        border = null;
        break;
      case ShadcnButtonVariant.destructive:
        bg = AppColors.accentDanger;
        fg = AppColors.textPrimary;
        border = null;
        break;
    }

    double height;
    EdgeInsets padding;
    TextStyle textStyle;

    switch (widget.size) {
      case ShadcnButtonSize.sm:
        height = 34;
        padding = const EdgeInsets.symmetric(horizontal: 12);
        textStyle = AppTypography.labelMedium.copyWith(fontSize: 12, color: fg);
        break;
      case ShadcnButtonSize.md:
        height = 42;
        padding = const EdgeInsets.symmetric(horizontal: 16);
        textStyle = AppTypography.titleMedium.copyWith(fontSize: 14, color: fg);
        break;
      case ShadcnButtonSize.lg:
        height = 50;
        padding = const EdgeInsets.symmetric(horizontal: 20);
        textStyle = AppTypography.titleLarge.copyWith(fontSize: 16, color: fg);
        break;
    }

    Widget content = Row(
      mainAxisSize: widget.isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (widget.isLoading) ...[
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(fg),
            ),
          ),
          const SizedBox(width: 8),
        ] else if (widget.icon != null) ...[
          Icon(widget.icon, size: 16, color: fg),
          const SizedBox(width: 8),
        ],
        Text(widget.text, style: textStyle),
      ],
    );

    return AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) => Transform.scale(
        scale: _scaleAnimation.value,
        child: GestureDetector(
          onTapDown: _onTapDown,
          onTapUp: _onTapUp,
          onTapCancel: _onTapCancel,
          onTap: isEnabled ? widget.onPressed : null,
          child: Container(
            height: height,
            padding: padding,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(10),
              border: border,
            ),
            child: content,
          ),
        ),
      ),
    );
  }
}
