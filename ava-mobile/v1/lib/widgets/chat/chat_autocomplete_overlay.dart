import "package:flutter/material.dart";
import "package:lucide_icons_flutter/lucide_icons.dart";
import "../../models/app_models.dart";

/// Autocomplete Popup Overlay for Slash (/) and Context Mentions (@)
class ChatAutocompleteOverlay extends StatelessWidget {
  final bool isSlash;
  final String slashFilter;
  final String atFilter;
  final List<SlashCommandItem> builtinSlashCommands;
  final List<SlashCommandItem> dynamicCoreCommands;
  final List<Map<String, dynamic>> atContextItems;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final ValueChanged<String> onSelect;

  const ChatAutocompleteOverlay({
    super.key,
    required this.isSlash,
    required this.slashFilter,
    required this.atFilter,
    required this.builtinSlashCommands,
    required this.dynamicCoreCommands,
    required this.atContextItems,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final Map<String, SlashCommandItem> uniqueCommands = {};
    for (final cmd in builtinSlashCommands) {
      uniqueCommands[cmd.command.toLowerCase()] = cmd;
    }
    for (final cmd in dynamicCoreCommands) {
      uniqueCommands[cmd.command.toLowerCase()] = cmd;
    }
    final slashMatches = uniqueCommands.values
        .where((c) =>
            c.command.toLowerCase().contains(slashFilter.toLowerCase()) ||
            c.title.toLowerCase().contains(slashFilter.toLowerCase()) ||
            c.description.toLowerCase().contains(slashFilter.toLowerCase()))
        .toList();
    final atMatches = atContextItems
        .where((i) =>
            i['label']!.toString().toLowerCase().contains(atFilter.toLowerCase()) ||
            (i['title']?.toString().toLowerCase().contains(atFilter.toLowerCase()) ?? false))
        .toList();

    final count = isSlash ? slashMatches.length : atMatches.length;
    if (count == 0) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      constraints: const BoxConstraints(maxHeight: 220),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.09),
            blurRadius: 14,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF13131A) : const Color(0xFFF1F5F9),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
              border: Border(bottom: BorderSide(color: borderColor.withValues(alpha: 0.6), width: 0.8)),
            ),
            child: Row(
              children: [
                Icon(
                  isSlash ? LucideIcons.slash : LucideIcons.atSign,
                  size: 13,
                  color: isSlash ? const Color(0xFF6366F1) : const Color(0xFF38BDF8),
                ),
                const SizedBox(width: 6),
                Text(
                  isSlash ? 'AvA Slash Commands' : 'Context & Agent Mentions',
                  style: TextStyle(
                    fontSize: 11,
                    fontFamily: 'PlusJakartaSans',
                    fontWeight: FontWeight.w700,
                    color: textPrimary,
                  ),
                ),
                const Spacer(),
                Text(
                  '$count matches',
                  style: TextStyle(fontSize: 10, fontFamily: 'Inter', color: textSecondary),
                ),
              ],
            ),
          ),
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(vertical: 4),
              itemCount: count,
              itemBuilder: (context, idx) {
                if (isSlash) {
                  final cmd = slashMatches[idx];
                  return ListTile(
                    dense: true,
                    leading: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(cmd.icon ?? LucideIcons.terminal, size: 14, color: const Color(0xFF6366F1)),
                    ),
                    title: Row(
                      children: [
                        Text(
                          cmd.command,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontFamily: 'JetBrainsMono',
                            fontWeight: FontWeight.w700,
                            color: textPrimary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            cmd.title,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontFamily: 'PlusJakartaSans',
                              fontWeight: FontWeight.w600,
                              color: textSecondary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E1E2E) : const Color(0xFFE2E8F0),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            cmd.category,
                            style: TextStyle(
                              fontSize: 9,
                              fontFamily: 'Inter',
                              fontWeight: FontWeight.w600,
                              color: textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    subtitle: Text(
                      cmd.description,
                      style: TextStyle(fontSize: 10.5, fontFamily: 'Inter', color: textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () => onSelect(cmd.command),
                  );
                } else {
                  final item = atMatches[idx];
                  final itemColor = item['color'] as Color? ?? const Color(0xFF38BDF8);
                  final itemIcon = item['icon'] as IconData? ?? LucideIcons.atSign;
                  final label = item['label']!.toString();
                  final title = item['title']?.toString() ?? label;
                  final category = item['category']?.toString() ?? 'Context';

                  return ListTile(
                    dense: true,
                    leading: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: itemColor.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(itemIcon, size: 14, color: itemColor),
                    ),
                    title: Row(
                      children: [
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontFamily: 'JetBrainsMono',
                            fontWeight: FontWeight.w700,
                            color: textPrimary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontFamily: 'PlusJakartaSans',
                              fontWeight: FontWeight.w600,
                              color: textSecondary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: itemColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            category,
                            style: TextStyle(
                              fontSize: 9,
                              fontFamily: 'Inter',
                              fontWeight: FontWeight.w700,
                              color: itemColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    subtitle: Text(
                      item['desc']!.toString(),
                      style: TextStyle(fontSize: 10.5, fontFamily: 'Inter', color: textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () => onSelect(label),
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
