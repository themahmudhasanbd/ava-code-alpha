import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Horizontal scrolling suggestion pills for quick prompts
class ChatSuggestionPills extends StatelessWidget {
  final List<Map<String, String>> suggestions;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final ValueChanged<String> onSelectSuggestion;

  const ChatSuggestionPills({
    super.key,
    required this.suggestions,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.onSelectSuggestion,
  });

  static Widget getSuggestionIcon(String label) {
    final l = label.toLowerCase();
    IconData icon = LucideIcons.sparkles;
    Color iconColor = const Color(0xFF818CF8);

    if (l.contains('cloudflare') || l.contains('zone')) {
      icon = LucideIcons.cloud;
      iconColor = const Color(0xFF38BDF8);
    } else if (l.contains('database') || l.contains('sql')) {
      icon = LucideIcons.database;
      iconColor = const Color(0xFFFBBF24);
    } else if (l.contains('git') || l.contains('status')) {
      icon = LucideIcons.gitBranch;
      iconColor = const Color(0xFF34D399);
    } else if (l.contains('search') || l.contains('codebase')) {
      icon = LucideIcons.search;
      iconColor = const Color(0xFF818CF8);
    }

    return Icon(icon, size: 13, color: iconColor);
  }

  @override
  Widget build(BuildContext context) {
    if (suggestions.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF09090B) : const Color(0xFFF8FAFC),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: Row(
          children: suggestions.map((item) {
            final prompt = item['prompt'] ?? '';
            final label = item['label'] ?? prompt;
            return Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: InkWell(
                onTap: () => onSelectSuggestion(prompt),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: borderColor, width: 0.8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      getSuggestionIcon(label),
                      const SizedBox(width: 6),
                      Text(
                        label,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textPrimary),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}
