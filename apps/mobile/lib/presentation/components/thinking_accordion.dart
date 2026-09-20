import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

/// Collapsible reasoning block displaying streaming thought thoughts
class ThinkingAccordion extends StatefulWidget {
  final String thoughtText;
  final bool isLive;

  const ThinkingAccordion({
    super.key,
    required this.thoughtText,
    this.isLive = false,
  });

  @override
  State<ThinkingAccordion> createState() => _ThinkingAccordionState();
}

class _ThinkingAccordionState extends State<ThinkingAccordion> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar
          InkWell(
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Icon(
                    widget.isLive ? LucideIcons.sparkles : LucideIcons.brain,
                    size: 14,
                    color: widget.isLive ? AppColors.accentPurple : AppColors.textMuted,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.isLive ? 'Thinking...' : 'Reasoning process',
                      style: AppTypography.titleMedium.copyWith(
                        fontSize: 12,
                        color: widget.isLive ? AppColors.textPrimary : AppColors.textSecondary,
                      ),
                    ),
                  ),
                  if (widget.isLive) ...[
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: AppColors.accentPurple,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Icon(
                    _isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                    size: 14,
                    color: AppColors.textMuted,
                  ),
                ],
              ),
            ),
          ),
          if (_isExpanded) ...[
            Container(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.border, width: 1)),
              ),
              child: Text(
                widget.thoughtText,
                style: AppTypography.codeSmall.copyWith(
                  color: AppColors.textSecondary,
                  height: 1.45,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
