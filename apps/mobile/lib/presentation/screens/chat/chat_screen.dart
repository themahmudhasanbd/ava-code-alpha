import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../data/models/turn_item_model.dart';
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
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Image.asset(AppConstants.appLogoPath, fit: BoxFit.contain),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        activeThread?.title ?? AppConstants.appName,
                        style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const ShadcnBadge(
                            label: 'Antigravity',
                            variant: ShadcnBadgeVariant.antigravity,
                            showDot: true,
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              providerCtrl.activeModelId,
                              style: AppTypography.codeSmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.rotateCcw, size: 18),
                onPressed: () => threadCtrl.createNewThread(title: 'New Session'),
                tooltip: 'New Thread',
              ),
              IconButton(
                icon: const Icon(LucideIcons.moreVertical, size: 18),
                onPressed: () {},
              ),
            ],
          ),
          body: Column(
            children: [
              // Message & Tool List
              Expanded(
                child: items.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          return _buildTurnItem(items[index]);
                        },
                      ),
              ),

              // Bottom Input Composer
              _buildInputComposer(isStreaming, threadCtrl),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
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
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.borderStrong),
              ),
              child: Image.asset(AppConstants.appLogoPath, fit: BoxFit.contain),
            ),
            const SizedBox(height: 16),
            Text('${AppConstants.appName} is Ready', style: AppTypography.titleLarge),
            const SizedBox(height: 6),
            Text(
              'Connected to native Google Antigravity provider (`gemini-3.7-flash-tiered`). Send an instruction to begin.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTurnItem(TurnItemModel item) {
    switch (item.type) {
      case TurnItemType.userPrompt:
        return Align(
          alignment: Alignment.centerRight,
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 6),
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.85),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderStrong),
            ),
            child: Text(
              item.content,
              style: AppTypography.bodyLarge.copyWith(color: AppColors.textPrimary),
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
                    Text('Shell Command', style: AppTypography.titleMedium.copyWith(fontSize: 12)),
                    const Spacer(),
                    const ShadcnBadge(label: 'bash', variant: ShadcnBadgeVariant.neutral),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(item.content, style: AppTypography.codeSmall.copyWith(color: AppColors.accentCyan)),
                ),
                if (item.secondaryContent != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    item.secondaryContent!,
                    style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted),
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
                  color: AppColors.surfaceHighlight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.sparkles, size: 14, color: AppColors.textPrimary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('AvA Agent', style: AppTypography.titleMedium.copyWith(fontSize: 13)),
                    const SizedBox(height: 4),
                    MarkdownBody(
                      data: item.content.isEmpty ? '...' : item.content,
                      styleSheet: MarkdownStyleSheet(
                        p: AppTypography.bodyLarge.copyWith(height: 1.5),
                        code: AppTypography.codeSmall.copyWith(
                          backgroundColor: AppColors.surfaceElevated,
                        ),
                        codeblockDecoration: BoxDecoration(
                          color: AppColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
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

  Widget _buildInputComposer(bool isStreaming, dynamic threadCtrl) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(top: BorderSide(color: AppColors.border, width: 1)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.borderStrong),
                ),
                child: TextField(
                  controller: _inputController,
                  style: AppTypography.bodyLarge,
                  cursorColor: AppColors.textPrimary,
                  maxLines: 4,
                  minLines: 1,
                  decoration: InputDecoration(
                    hintText: isStreaming ? 'Agent is working...' : 'Ask AvA to code, refactor, or test...',
                    hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  onSubmitted: (_) => _handleSend(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: const BoxDecoration(
                color: AppColors.textPrimary,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(
                  isStreaming ? LucideIcons.square : LucideIcons.arrowUp,
                  size: 18,
                  color: AppColors.textInverse,
                ),
                onPressed: isStreaming ? () => threadCtrl.interruptTurn() : _handleSend,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
