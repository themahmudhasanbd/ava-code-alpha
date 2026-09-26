import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../models/app_models.dart';

/// ChatQueuedPromptsDock — sleek floating dock above prompt box when prompts are queued.
class ChatQueuedPromptsDock extends StatelessWidget {
  final List<QueuedPromptItem> queuedPrompts;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final VoidCallback onManage;
  final VoidCallback onClearAll;

  const ChatQueuedPromptsDock({
    super.key,
    required this.queuedPrompts,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onManage,
    required this.onClearAll,
  });

  @override
  Widget build(BuildContext context) {
    if (queuedPrompts.isEmpty) return const SizedBox.shrink();

    final nextPrompt = queuedPrompts.first;
    final count = queuedPrompts.length;

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 0, 14, 6),
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF14141E) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.45 : 0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.15 : 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                width: 0.8,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(LucideIcons.clock, size: 11, color: Color(0xFF818CF8)),
                const SizedBox(width: 4),
                Text(
                  'Queued ($count)',
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF818CF8),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Next Prompt Preview
          Expanded(
            child: InkWell(
              onTap: onManage,
              borderRadius: BorderRadius.circular(4),
              child: Text(
                'Next: "${nextPrompt.promptText.replaceAll('\n', ' ')}"',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11.5,
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w500,
                  color: textSecondary,
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),

          // Manage Button
          InkWell(
            onTap: onManage,
            borderRadius: BorderRadius.circular(6),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E1E2E) : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(LucideIcons.listFilter, size: 12, color: textPrimary),
                  const SizedBox(width: 4),
                  Text(
                    'Manage',
                    style: TextStyle(
                      fontSize: 11,
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 4),

          // Clear All Button
          InkWell(
            onTap: onClearAll,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Icon(
                LucideIcons.x,
                size: 13,
                color: textSecondary.withValues(alpha: 0.7),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
