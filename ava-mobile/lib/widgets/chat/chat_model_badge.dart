import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../models/app_models.dart';

/// Small badge that floats at the top-right corner of the prompt input card,
/// showing the currently selected Model & Reasoning Effort. Tapping opens the selector modal.
class ChatModelBadge extends StatelessWidget {
  final AvaModelItem? currentModel;
  final String reasoningEffort;
  final Color cardBg;
  final Color textSecondary;
  final bool isDark;
  final VoidCallback onTap;

  const ChatModelBadge({
    super.key,
    required this.currentModel,
    this.reasoningEffort = 'medium',
    required this.cardBg,
    required this.textSecondary,
    this.isDark = true,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    String modelName = currentModel?.name ?? 'Model';
    if (modelName.length > 18) {
      modelName = '${modelName.substring(0, 16)}…';
    }

    final String effort = reasoningEffort.isNotEmpty ? reasoningEffort.toUpperCase() : 'MAX';

    final pillBg = isDark
        ? const Color(0xFF1E1B4B)
        : const Color(0xFFEEF2FF);
    final borderColor = isDark
        ? const Color(0xFF6366F1).withValues(alpha: 0.6)
        : const Color(0xFF818CF8);
    final textColor = isDark
        ? const Color(0xFFC7D2FE)
        : const Color(0xFF3730A3);

    return Positioned(
      top: -9,
      right: 18,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          decoration: BoxDecoration(
            color: pillBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor, width: 1.1),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.35 : 0.15),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: Color(0xFF6366F1),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '$modelName • $effort',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                  fontFamily: 'JetBrainsMono',
                  color: textColor,
                ),
              ),
              const SizedBox(width: 4),
              Icon(LucideIcons.chevronDown, size: 11, color: textColor),
            ],
          ),
        ),
      ),
    );
  }
}
