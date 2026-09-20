import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../data/models/turn_item_model.dart';
import '../../components/chat_prompt_box.dart';
import '../../components/diff_viewer.dart';
import '../../components/shadcn_badge.dart';
import '../../components/shadcn_card.dart';
import '../../components/thinking_accordion.dart';
import '../../state/app_state.dart';

/// Conversation view displaying real-time streaming turns, reasoning thoughts, and diffs
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleSend() {
    final text = _inputController.text;
    if (text.trim().isEmpty) return;

    final threadCtrl = AppStateScope.of(context).threadController;
    _inputController.clear();
    threadCtrl.sendPrompt(text);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final scope = AppStateScope.of(context);
    final threadCtrl = scope.threadController;
    final providerCtrl = scope.providerController;

    return ListenableBuilder(
      listenable: Listenable.merge([threadCtrl, providerCtrl]),
      builder: (context, _) {
        final activeThread = threadCtrl.activeThread;
        final items = threadCtrl.items;
        final isStreaming = threadCtrl.isStreaming;

        return Scaffold(
          backgroundColor: AppColors.bg(context),
          body: Column(
            children: [
              // Sleek Session Thread Sub-header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.card(context),
                  border: Border(bottom: BorderSide(color: AppColors.line(context), width: 1)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.messageSquare, size: 14, color: AppColors.accentPrimary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        activeThread?.title ?? 'Active Workspace Session',
                        style: AppTypography.titleMedium.copyWith(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.text(context),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: Icon(LucideIcons.plus, size: 16, color: AppColors.subtext(context)),
                      onPressed: () => threadCtrl.createNewThread(title: 'New Session'),
                      tooltip: 'New Thread',
                      splashRadius: 16,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ),

              // Message & Tool List
              Expanded(
                child: items.isEmpty
                    ? _buildEmptyState(context)
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          return _buildTurnItem(context, items[index]);
                        },
                      ),
              ),

              // Signature Prompt Composer Dock
              ChatPromptBox(
                controller: _inputController,
                isStreaming: isStreaming,
                onSend: _handleSend,
                onInterrupt: () => threadCtrl.interruptTurn(),
                onSelectSuggestion: (prompt) => _handleSend(),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final isDark = AppColors.isDark(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.line(context)),
              ),
              child: Image.asset(AppConstants.appLogoPath, fit: BoxFit.contain),
            ),
            const SizedBox(height: 16),
            Text(
              '${AppConstants.appName} Workspace Ready',
              style: AppTypography.titleLarge.copyWith(color: AppColors.text(context)),
            ),
            const SizedBox(height: 6),
            Text(
              'Autonomous developer agent is active. Send a prompt to edit files, execute commands, or plan architecture.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium.copyWith(color: AppColors.subtext(context)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTurnItem(BuildContext context, TurnItemModel item) {
    final isDark = AppColors.isDark(context);

    switch (item.type) {
      case TurnItemType.userPrompt:
        return Align(
          alignment: Alignment.centerRight,
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 6),
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.85),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.line(context)),
            ),
            child: Text(
              item.content,
              style: AppTypography.bodyLarge.copyWith(color: AppColors.text(context)),
            ),
          ),
        );

      case TurnItemType.reasoning:
        return ThinkingAccordion(
          thoughtText: item.content,
          isLive: item.status == ItemStatus.inProgress,
        );

      case TurnItemType.commandExecution:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: ShadcnCard(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.terminal, size: 14, color: AppColors.accentCyan),
                    const SizedBox(width: 6),
                    Text(
                      'Shell Command',
                      style: AppTypography.titleMedium.copyWith(
                        fontSize: 12,
                        color: AppColors.text(context),
                      ),
                    ),
                    const Spacer(),
                    const ShadcnBadge(label: 'bash', variant: ShadcnBadgeVariant.neutral),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.bg(context),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    item.content,
                    style: AppTypography.codeSmall.copyWith(color: AppColors.accentCyan),
                  ),
                ),
                if (item.secondaryContent != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    item.secondaryContent!,
                    style: AppTypography.codeSmall.copyWith(color: AppColors.muted(context)),
                  ),
                ],
              ],
            ),
          ),
        );

      case TurnItemType.fileChange:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: DiffViewer(
            filePath: item.title,
            diffText: item.secondaryContent ?? item.content,
          ),
        );

      case TurnItemType.agentMessage:
      case TurnItemType.mcpToolCall:
      case TurnItemType.error:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 28,
                height: 28,
                margin: const EdgeInsets.only(top: 2),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.line(context)),
                ),
                child: const Icon(LucideIcons.sparkles, size: 14, color: AppColors.accentPrimary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AvA Agent',
                      style: AppTypography.titleMedium.copyWith(
                        fontSize: 13,
                        color: AppColors.text(context),
                      ),
                    ),
                    const SizedBox(height: 4),
                    MarkdownBody(
                      data: item.content.isEmpty ? '...' : item.content,
                      styleSheet: MarkdownStyleSheet(
                        p: AppTypography.bodyLarge.copyWith(height: 1.5, color: AppColors.text(context)),
                        code: AppTypography.codeSmall.copyWith(
                          backgroundColor: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                          color: isDark ? Colors.white : AppColors.lightTextPrimary,
                        ),
                        codeblockDecoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.line(context)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
    }
  }
}
