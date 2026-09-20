import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../components/shadcn_button.dart';
import '../../components/shadcn_card.dart';
import '../../state/app_state.dart';

/// Threads and sessions list view with live create and delete capabilities
class ThreadsScreen extends StatelessWidget {
  final ValueChanged<int>? onNavigateTab;

  const ThreadsScreen({super.key, this.onNavigateTab});

  void _showNewThreadDialog(BuildContext context, dynamic threadCtrl) {
    final titleController = TextEditingController(text: 'New Agent Turn');
    final dirController = TextEditingController(text: '/var/www/ava-code-alpha');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF18181B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x40FFFFFF)),
        ),
        title: Row(
          children: [
            const Icon(LucideIcons.plusCircle, size: 18, color: AppColors.accentPrimary),
            const SizedBox(width: 8),
            Text('Create Session Thread', style: AppTypography.titleMedium),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Thread Title', style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: TextField(
                controller: titleController,
                style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary),
                decoration: const InputDecoration(border: InputBorder.none, isDense: true),
              ),
            ),
            const SizedBox(height: 14),
            Text('Working Directory', style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: TextField(
                controller: dirController,
                style: AppTypography.codeSmall.copyWith(color: AppColors.textPrimary),
                decoration: const InputDecoration(border: InputBorder.none, isDense: true),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentPrimary,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              threadCtrl.createNewThread(
                title: titleController.text.trim(),
                workingDirectory: dirController.text.trim(),
              );
              onNavigateTab?.call(0);
            },
            child: const Text('Create Thread'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteThread(BuildContext context, dynamic threadCtrl, String threadId, String title) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF18181B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x40FFFFFF)),
        ),
        title: Text('Delete Thread', style: AppTypography.titleMedium),
        content: Text('Are you sure you want to delete "$title"?', style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentDanger,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              threadCtrl.deleteThread(threadId);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final threadCtrl = AppStateScope.of(context).threadController;

    return ListenableBuilder(
      listenable: threadCtrl,
      builder: (context, _) {
        final threads = threadCtrl.threads;
        final activeThread = threadCtrl.activeThread;

        return Scaffold(
          backgroundColor: AppColors.background,
          body: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            children: [
              // Screen Header Section
              Row(
                children: [
                  const Icon(LucideIcons.gitBranch, size: 16, color: AppColors.accentPrimary),
                  const SizedBox(width: 8),
                  Text('Workspace Threads', style: AppTypography.titleLarge.copyWith(fontSize: 18)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(LucideIcons.plus, size: 18, color: AppColors.textPrimary),
                    tooltip: 'New Thread',
                    onPressed: () => _showNewThreadDialog(context, threadCtrl),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // New Thread Action Card
              ShadcnButton(
                text: 'Start New Conversation',
                icon: LucideIcons.plusCircle,
                isFullWidth: true,
                onPressed: () => _showNewThreadDialog(context, threadCtrl),
              ),
              const SizedBox(height: 20),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('ACTIVE SESSIONS', style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted)),
                  Text('${threads.length} Total', style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted, fontSize: 10)),
                ],
              ),
              const SizedBox(height: 10),

              ...threads.map((thread) {
                final isActive = activeThread?.id == thread.id;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: ShadcnCard(
                    onTap: () {
                      threadCtrl.selectThread(thread);
                      onNavigateTab?.call(0); // Switch to Chat
                    },
                    backgroundColor: isActive ? AppColors.surfaceElevated : AppColors.surface,
                    border: Border.all(
                      color: isActive ? AppColors.borderFocus : AppColors.border,
                      width: isActive ? 1.5 : 1.0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                thread.title,
                                style: AppTypography.titleMedium.copyWith(
                                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (isActive) ...[
                              const SizedBox(width: 8),
                              const ShadcnBadge(label: 'Active', variant: ShadcnBadgeVariant.success),
                            ],
                            const SizedBox(width: 4),
                            IconButton(
                              icon: const Icon(LucideIcons.trash2, size: 14, color: AppColors.textMuted),
                              onPressed: () => _confirmDeleteThread(context, threadCtrl, thread.id, thread.title),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(LucideIcons.folder, size: 12, color: AppColors.textMuted),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                thread.workingDirectory,
                                style: AppTypography.codeSmall,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            ShadcnBadge(label: thread.provider, variant: ShadcnBadgeVariant.antigravity),
                            const SizedBox(width: 6),
                            Text(thread.model, style: AppTypography.codeSmall),
                            const Spacer(),
                            Text(
                              '${thread.turnCount} turns',
                              style: AppTypography.bodySmall,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }
}
