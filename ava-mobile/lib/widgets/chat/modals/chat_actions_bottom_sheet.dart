import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../models/app_models.dart';

/// Modal bottom sheet providing quick navigation and actions from the prompt bar
class ChatActionsBottomSheet extends StatelessWidget {
  final AvaModelItem? currentModel;
  final String reasoningEffort;
  final Map<String, dynamic> currentSandbox;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final VoidCallback onOpenModelReasoning;
  final VoidCallback onOpenSandboxSelector;
  final VoidCallback? onNewSession;
  final ValueChanged<int>? onNavigateTab;
  final VoidCallback? onClearMessages;
  final int queuedPromptsCount;
  final VoidCallback? onOpenQueuedPrompts;

  const ChatActionsBottomSheet({
    super.key,
    required this.currentModel,
    this.reasoningEffort = 'medium',
    required this.currentSandbox,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onOpenModelReasoning,
    required this.onOpenSandboxSelector,
    this.onNewSession,
    this.onNavigateTab,
    this.onClearMessages,
    this.queuedPromptsCount = 0,
    this.onOpenQueuedPrompts,
  });

  static void show(
    BuildContext context, {
    required AvaModelItem? currentModel,
    String reasoningEffort = 'medium',
    required Map<String, dynamic> currentSandbox,
    required Color cardBg,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
    required VoidCallback onOpenModelReasoning,
    required VoidCallback onOpenSandboxSelector,
    VoidCallback? onNewSession,
    ValueChanged<int>? onNavigateTab,
    VoidCallback? onClearMessages,
    int queuedPromptsCount = 0,
    VoidCallback? onOpenQueuedPrompts,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => ChatActionsBottomSheet(
        currentModel: currentModel,
        reasoningEffort: reasoningEffort,
        currentSandbox: currentSandbox,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        onOpenModelReasoning: onOpenModelReasoning,
        onOpenSandboxSelector: onOpenSandboxSelector,
        onNewSession: onNewSession,
        onNavigateTab: onNavigateTab,
        onClearMessages: onClearMessages,
        queuedPromptsCount: queuedPromptsCount,
        onOpenQueuedPrompts: onOpenQueuedPrompts,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String modelName = currentModel?.name ?? 'Default Model';
    final String effort = reasoningEffort.toUpperCase();

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.ellipsis, size: 20, color: Color(0xFF6366F1)),
              const SizedBox(width: 10),
              Text(
                'Prompt Actions & Tools',
                style: TextStyle(
                  fontSize: 16,
                  fontFamily: 'PlusJakartaSans',
                  fontWeight: FontWeight.bold,
                  color: textPrimary,
                ),
              ),
              const Spacer(),
              IconButton(
                icon: Icon(LucideIcons.x, size: 18, color: textSecondary),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 0. Queued Prompts (if any)
          if (queuedPromptsCount > 0) ...[
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: ListTile(
                dense: true,
                leading: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.listOrdered, size: 17, color: Color(0xFF818CF8)),
                ),
                title: Row(
                  children: [
                    Text(
                      'Queued Prompts',
                      style: TextStyle(
                        fontSize: 13,
                        fontFamily: 'PlusJakartaSans',
                        fontWeight: FontWeight.bold,
                        color: textPrimary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$queuedPromptsCount',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                subtitle: Text(
                  'Manage, reorder, edit, or remove pending prompts',
                  style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
                ),
                trailing: Icon(LucideIcons.chevronRight, size: 16, color: textSecondary),
                onTap: () {
                  Navigator.pop(context);
                  onOpenQueuedPrompts?.call();
                },
              ),
            ),
          ],

          // 1. Select Model & Reasoning Effort Option
          ListTile(
            dense: true,
            leading: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.cpu, size: 17, color: Color(0xFF6366F1)),
            ),
            title: Row(
              children: [
                Text(
                  'Model & Reasoning',
                  style: TextStyle(
                    fontSize: 13,
                    fontFamily: 'PlusJakartaSans',
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '$modelName • $effort',
                    style: const TextStyle(
                      fontSize: 10,
                      fontFamily: 'JetBrainsMono',
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF6366F1),
                    ),
                  ),
                ),
              ],
            ),
            subtitle: Text(
              'Switch LLM models and configure thinking depth preset',
              style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
            ),
            trailing: Icon(LucideIcons.chevronRight, size: 16, color: textSecondary),
            onTap: () {
              Navigator.pop(context);
              onOpenModelReasoning();
            },
          ),

          // 2. Sandbox Mode Option
          ListTile(
            dense: true,
            leading: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: (currentSandbox['color'] as Color).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(currentSandbox['icon'] as IconData, size: 17, color: currentSandbox['color'] as Color),
            ),
            title: Row(
              children: [
                Text(
                  'Sandbox Permission',
                  style: TextStyle(
                    fontSize: 13,
                    fontFamily: 'PlusJakartaSans',
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: (currentSandbox['color'] as Color).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    currentSandbox['short'] as String,
                    style: TextStyle(
                      fontSize: 10,
                      fontFamily: 'PlusJakartaSans',
                      fontWeight: FontWeight.w700,
                      color: currentSandbox['color'] as Color,
                    ),
                  ),
                ),
              ],
            ),
            subtitle: Text(
              'Configure autonomous file write and shell execution boundaries',
              style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
            ),
            trailing: Icon(LucideIcons.chevronRight, size: 16, color: textSecondary),
            onTap: () {
              Navigator.pop(context);
              onOpenSandboxSelector();
            },
          ),

          const Divider(height: 16),

          // 3. New Session
          ListTile(
            dense: true,
            leading: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.plusCircle, size: 17, color: Color(0xFF10B981)),
            ),
            title: Text(
              'New Session',
              style: TextStyle(
                fontSize: 13,
                fontFamily: 'PlusJakartaSans',
                fontWeight: FontWeight.bold,
                color: textPrimary,
              ),
            ),
            subtitle: Text(
              'Start a fresh conversation transcript and context',
              style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
            ),
            onTap: () {
              Navigator.pop(context);
              onNewSession?.call();
            },
          ),

          // 4. Workspace Files Explorer
          ListTile(
            dense: true,
            leading: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.folderOpen, size: 17, color: Color(0xFF38BDF8)),
            ),
            title: Text(
              'Workspace Files Explorer',
              style: TextStyle(
                fontSize: 13,
                fontFamily: 'PlusJakartaSans',
                fontWeight: FontWeight.bold,
                color: textPrimary,
              ),
            ),
            subtitle: Text(
              'Browse files, tree & open code editor',
              style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
            ),
            onTap: () {
              Navigator.pop(context);
              onNavigateTab?.call(1); // Files Tab
            },
          ),

          // 5. MCP Tools & Integrations
          ListTile(
            dense: true,
            leading: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFA78BFA).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.plug, size: 17, color: Color(0xFFA78BFA)),
            ),
            title: Text(
              'MCP Tools & Integrations',
              style: TextStyle(
                fontSize: 13,
                fontFamily: 'PlusJakartaSans',
                fontWeight: FontWeight.bold,
                color: textPrimary,
              ),
            ),
            subtitle: Text(
              'Inspect MCP servers, tools & runtime status',
              style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
            ),
            onTap: () {
              Navigator.pop(context);
              onNavigateTab?.call(3); // MCP Tab
            },
          ),

          // 6. Interactive Terminal
          ListTile(
            dense: true,
            leading: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.terminal, size: 17, color: Color(0xFFF59E0B)),
            ),
            title: Text(
              'Terminal Console',
              style: TextStyle(
                fontSize: 13,
                fontFamily: 'PlusJakartaSans',
                fontWeight: FontWeight.bold,
                color: textPrimary,
              ),
            ),
            subtitle: Text(
              'Full-featured interactive bash shell',
              style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
            ),
            onTap: () {
              Navigator.pop(context);
              onNavigateTab?.call(7); // Terminal Tab
            },
          ),

          // 7. Clear Messages View
          ListTile(
            dense: true,
            leading: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.trash2, size: 17, color: Color(0xFFEF4444)),
            ),
            title: Text(
              'Clear Chat View',
              style: TextStyle(
                fontSize: 13,
                fontFamily: 'PlusJakartaSans',
                fontWeight: FontWeight.bold,
                color: textPrimary,
              ),
            ),
            subtitle: Text(
              'Clear messages from current screen view',
              style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
            ),
            onTap: () {
              Navigator.pop(context);
              onClearMessages?.call();
            },
          ),
        ],
      ),
    );
  }
}
