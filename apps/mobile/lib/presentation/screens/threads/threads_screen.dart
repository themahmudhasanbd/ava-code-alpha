import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../components/shadcn_button.dart';
import '../../components/shadcn_card.dart';
import '../../state/app_state.dart';

/// Threads and sessions list view
class ThreadsScreen extends StatelessWidget {
  final ValueChanged<int>? onNavigateTab;

  const ThreadsScreen({super.key, this.onNavigateTab});

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
          appBar: AppBar(
            title: Text('Workspace Threads', style: AppTypography.titleLarge),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.plus, size: 20),
                onPressed: () {
                  threadCtrl.createNewThread(title: 'New Session');
                  onNavigateTab?.call(0); // Switch to Chat
                },
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            children: [
              // New Thread Action Card
              ShadcnButton(
                text: 'Start New Conversation',
                icon: LucideIcons.plusCircle,
                isFullWidth: true,
                onPressed: () {
                  threadCtrl.createNewThread(title: 'New Session');
                  onNavigateTab?.call(0);
                },
              ),
              const SizedBox(height: 20),

              Text('ACTIVE SESSIONS', style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted)),
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
