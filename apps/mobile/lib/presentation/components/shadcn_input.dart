import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

/// Clean input field with focus outline, clear button, and password toggle
class ShadcnInput extends StatefulWidget {
  final TextEditingController controller;
  final String? label;
  final String? hintText;
  final IconData? prefixIcon;
  final bool isPassword;
  final TextInputType keyboardType;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool autofocus;
  final FocusNode? focusNode;

  const ShadcnInput({
    super.key,
    required this.controller,
    this.label,
    this.hintText,
    this.prefixIcon,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.onChanged,
    this.onSubmitted,
    this.autofocus = false,
    this.focusNode,
  });

  @override
  State<ShadcnInput> createState() => _ShadcnInputState();
}

class _ShadcnInputState extends State<ShadcnInput> {
  late bool _obscureText;
  late FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _obscureText = widget.isPassword;
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_handleFocusChange);
  }

  void _handleFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
  }

  @override
  void dispose() {
    if (widget.focusNode == null) {
      _focusNode.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: AppTypography.titleMedium.copyWith(
              fontSize: 13,
              color: AppColors.text(context),
            ),
          ),
          const SizedBox(height: 6),
        ],
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          decoration: BoxDecoration(
            color: AppColors.card(context),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: _isFocused
                  ? (isDark ? AppColors.borderFocus : AppColors.lightBorderFocus)
                  : AppColors.lineStrong(context),
              width: _isFocused ? 1.5 : 1.0,
            ),
          ),
          child: TextField(
            controller: widget.controller,
            focusNode: _focusNode,
            autofocus: widget.autofocus,
            obscureText: _obscureText,
            keyboardType: widget.keyboardType,
            style: AppTypography.bodyLarge.copyWith(color: AppColors.text(context)),
            cursorColor: AppColors.text(context),
            onChanged: widget.onChanged,
            onSubmitted: widget.onSubmitted,
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: InputBorder.none,
              hintText: widget.hintText,
              hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.muted(context)),
              prefixIcon: widget.prefixIcon != null
                  ? Icon(widget.prefixIcon, size: 16, color: AppColors.subtext(context))
                  : null,
              suffixIcon: widget.isPassword
                  ? IconButton(
                      icon: Icon(
                        _obscureText ? LucideIcons.eyeOff : LucideIcons.eye,
                        size: 16,
                        color: AppColors.subtext(context),
                      ),
                      onPressed: () => setState(() => _obscureText = !_obscureText),
                    )
                  : null,
            ),
          ),
        ),
      ],
    );
  }
}
