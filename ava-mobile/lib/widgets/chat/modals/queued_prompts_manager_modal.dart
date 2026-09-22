import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../models/app_models.dart';
import '../image_lightbox_viewer.dart';

/// Modal bottom sheet for viewing and managing queued pending prompts
class QueuedPromptsManagerModal extends StatefulWidget {
  final List<QueuedPromptItem> queuedPrompts;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final ValueChanged<QueuedPromptItem> onEditPrompt;
  final ValueChanged<QueuedPromptItem> onSendNow;
  final ValueChanged<int> onDeleteIndex;
  final void Function(int oldIndex, int newIndex) onReorder;
  final VoidCallback onClearAll;

  const QueuedPromptsManagerModal({
    super.key,
    required this.queuedPrompts,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onEditPrompt,
    required this.onSendNow,
    required this.onDeleteIndex,
    required this.onReorder,
    required this.onClearAll,
  });

  static void show(
    BuildContext context, {
    required List<QueuedPromptItem> queuedPrompts,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
    required ValueChanged<QueuedPromptItem> onEditPrompt,
    required ValueChanged<QueuedPromptItem> onSendNow,
    required ValueChanged<int> onDeleteIndex,
    required void Function(int oldIndex, int newIndex) onReorder,
    required VoidCallback onClearAll,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => QueuedPromptsManagerModal(
        queuedPrompts: queuedPrompts,
        isDark: isDark,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        onEditPrompt: onEditPrompt,
        onSendNow: onSendNow,
        onDeleteIndex: onDeleteIndex,
        onReorder: onReorder,
        onClearAll: onClearAll,
      ),
    );
  }

  @override
  State<QueuedPromptsManagerModal> createState() => _QueuedPromptsManagerModalState();
}

class _QueuedPromptsManagerModalState extends State<QueuedPromptsManagerModal> {
  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final bg = isDark ? const Color(0xFF13131A) : Colors.white;
    final itemCount = widget.queuedPrompts.length;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        border: Border.all(
          color: widget.borderColor.withValues(alpha: isDark ? 0.35 : 0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: widget.textSecondary.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 6, 16, 12),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(LucideIcons.listOrdered, size: 16, color: Color(0xFF818CF8)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Queued Prompts',
                        style: TextStyle(
                          fontSize: 16,
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w700,
                          color: widget.textPrimary,
                        ),
                      ),
                      Text(
                        '$itemCount pending prompt${itemCount == 1 ? '' : 's'} waiting to execute',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontFamily: 'Inter',
                          color: widget.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (itemCount > 0)
                  TextButton.icon(
                    onPressed: () {
                      widget.onClearAll();
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(LucideIcons.trash2, size: 13, color: Color(0xFFEF4444)),
                    label: const Text(
                      'Clear All',
                      style: TextStyle(
                        fontSize: 12,
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFEF4444),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Divider(height: 1, color: widget.borderColor.withValues(alpha: isDark ? 0.25 : 0.15)),

          // List of Queued Items
          if (itemCount == 0)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
              child: Column(
                children: [
                  Icon(LucideIcons.inbox, size: 36, color: widget.textSecondary.withValues(alpha: 0.5)),
                  const SizedBox(height: 10),
                  Text(
                    'No queued prompts',
                    style: TextStyle(
                      fontSize: 14,
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w600,
                      color: widget.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Type in the prompt box while the agent is running to queue more tasks.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontFamily: 'Inter',
                      color: widget.textSecondary.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            )
          else
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: itemCount,
                separatorBuilder: (ctx, i) => const SizedBox(height: 8),
                itemBuilder: (ctx, index) {
                  final item = widget.queuedPrompts[index];
                  final isFirst = index == 0;

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A1A26) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isFirst
                            ? const Color(0xFF6366F1).withValues(alpha: 0.45)
                            : widget.borderColor.withValues(alpha: isDark ? 0.3 : 0.2),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Card Top: Position Badge + Actions
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isFirst
                                    ? const Color(0xFF6366F1).withValues(alpha: 0.2)
                                    : widget.textSecondary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                isFirst ? '#1 Next in Queue' : '#${index + 1}',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontFamily: 'Inter',
                                  fontWeight: FontWeight.w700,
                                  color: isFirst ? const Color(0xFF818CF8) : widget.textSecondary,
                                ),
                              ),
                            ),
                            if (item.attachments.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(LucideIcons.paperclip, size: 10, color: Color(0xFF10B981)),
                                    const SizedBox(width: 3),
                                    Text(
                                      '${item.attachments.length} file${item.attachments.length == 1 ? '' : 's'}',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontFamily: 'Inter',
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF10B981),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const Spacer(),

                            // Move Up
                            if (index > 0)
                              InkWell(
                                onTap: () {
                                  widget.onReorder(index, index - 1);
                                  setState(() {});
                                },
                                borderRadius: BorderRadius.circular(4),
                                child: Padding(
                                  padding: const EdgeInsets.all(4),
                                  child: Icon(LucideIcons.arrowUp, size: 13, color: widget.textSecondary),
                                ),
                              ),

                            // Move Down
                            if (index < itemCount - 1)
                              InkWell(
                                onTap: () {
                                  widget.onReorder(index, index + 1);
                                  setState(() {});
                                },
                                borderRadius: BorderRadius.circular(4),
                                child: Padding(
                                  padding: const EdgeInsets.all(4),
                                  child: Icon(LucideIcons.arrowDown, size: 13, color: widget.textSecondary),
                                ),
                              ),

                            // Delete
                            InkWell(
                              onTap: () {
                                widget.onDeleteIndex(index);
                                setState(() {});
                              },
                              borderRadius: BorderRadius.circular(4),
                              child: const Padding(
                                padding: EdgeInsets.all(4),
                                child: Icon(LucideIcons.x, size: 13, color: Color(0xFFEF4444)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Prompt text preview
                        Text(
                          item.promptText,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontFamily: 'Inter',
                            height: 1.35,
                            fontWeight: FontWeight.w500,
                            color: widget.textPrimary,
                          ),
                        ),
                        if (item.attachments.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: item.attachments.map((filePath) {
                              final name = filePath.split('/').last;
                              final ext = name.contains('.') ? name.split('.').last.toLowerCase() : '';
                              final isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].contains(ext);

                              if (isImg) {
                                return GestureDetector(
                                  onTap: () {
                                    showImageLightboxModal(
                                      context: context,
                                      imageUrlsOrPaths: [filePath],
                                      isDark: widget.isDark,
                                    );
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(LucideIcons.image, size: 11, color: Color(0xFF818CF8)),
                                        const SizedBox(width: 4),
                                        ConstrainedBox(
                                          constraints: const BoxConstraints(maxWidth: 120),
                                          child: Text(
                                            name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 10.5,
                                              fontFamily: 'JetBrainsMono',
                                              fontWeight: FontWeight.w600,
                                              color: Color(0xFF818CF8),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }

                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  color: widget.textSecondary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(LucideIcons.fileText, size: 11, color: widget.textSecondary),
                                    const SizedBox(width: 4),
                                    ConstrainedBox(
                                      constraints: const BoxConstraints(maxWidth: 120),
                                      child: Text(
                                        name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 10.5,
                                          fontFamily: 'Inter',
                                          color: widget.textSecondary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                        const SizedBox(height: 10),

                        // Card Bottom Actions
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            // Edit into prompt box
                            OutlinedButton.icon(
                              onPressed: () {
                                widget.onEditPrompt(item);
                                Navigator.of(context).pop();
                              },
                              icon: const Icon(LucideIcons.pencil, size: 12),
                              label: const Text('Edit in Box', style: TextStyle(fontSize: 11, fontFamily: 'Inter')),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: widget.textPrimary,
                                side: BorderSide(color: widget.borderColor.withValues(alpha: 0.3)),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Send Now
                            FilledButton.icon(
                              onPressed: () {
                                widget.onSendNow(item);
                                Navigator.of(context).pop();
                              },
                              icon: const Icon(LucideIcons.zap, size: 12),
                              label: const Text('Send Now', style: TextStyle(fontSize: 11, fontFamily: 'Inter', fontWeight: FontWeight.w600)),
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF6366F1),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

          // Bottom dismiss bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  side: BorderSide(color: widget.borderColor.withValues(alpha: isDark ? 0.3 : 0.2)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: Text(
                  'Close',
                  style: TextStyle(
                    fontSize: 13,
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    color: widget.textSecondary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
