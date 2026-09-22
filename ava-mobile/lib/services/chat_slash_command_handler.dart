import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/agent_core_service.dart';
import '../models/app_models.dart';
import '../utils/app_toast.dart';

/// Result returned by [ChatSlashCommandHandler.handle].
class SlashCommandResult {
  /// `true` when the text was a recognized slash command (caller should NOT send to AI).
  final bool handled;

  /// Optional snackbar message to display after the command runs.
  final String? snackMessage;

  const SlashCommandResult({required this.handled, this.snackMessage});
}

/// Handles all `/command` shortcuts typed in the prompt text field.
///
/// All async work is done here, but BuildContext is never used after an async
/// gap — the caller receives a [SlashCommandResult] and shows the snackbar
/// itself while it is still mounted.
class ChatSlashCommandHandler {
  final AvaAgentCoreService agentCoreService;
  final String? activeSessionId;
  final AvaModelItem? selectedModel;
  final VoidCallback? onNewSession;
  final VoidCallback? onClearMessages;
  final ValueChanged<int>? onNavigateTab;
  final Function(Map<String, dynamic> session)? onSelectSession;
  final void Function(List<Map<String, dynamic>> memories) showMemoriesModal;
  final VoidCallback showExportModal;

  const ChatSlashCommandHandler({
    required this.agentCoreService,
    required this.activeSessionId,
    required this.selectedModel,
    required this.onNewSession,
    required this.onClearMessages,
    required this.onNavigateTab,
    required this.onSelectSession,
    required this.showMemoriesModal,
    required this.showExportModal,
  });

  /// Process [text]. Returns a [SlashCommandResult] describing what happened.
  Future<SlashCommandResult> handle(String text) async {
    final sessId = activeSessionId ?? agentCoreService.lastActiveSessionId ?? '';

    // ── Navigation-only shortcuts ─────────────────────────────────────────────
    if (text == '/clear') {
      if (onNewSession != null) {
        onNewSession!();
      } else {
        onClearMessages?.call();
      }
      return _done('Chat cleared. Started fresh session.');
    }
    if (text == '/new') {
      onNewSession?.call();
      return _done(null);
    }
    if (text == '/workspace' || text == '/open') {
      onNavigateTab?.call(1);
      return _done(null);
    }
    if (text == '/terminal') {
      onNavigateTab?.call(7);
      return _done(null);
    }
    if (text == '/mcp') {
      onNavigateTab?.call(3);
      return _done(null);
    }
    if (text == '/model') {
      onNavigateTab?.call(2);
      return _done(null);
    }

    // /agent is handled by the caller (opens a modal)
    if (text == '/agent') return const SlashCommandResult(handled: false);

    // ── Commands that need an active session ─────────────────────────────────
    if (text == '/undo') {
      if (sessId.isEmpty) return _done('No active session to undo.');
      final ok = await agentCoreService.revertSession(sessId);
      return _done(ok ? 'Reverted last assistant turn.' : 'Undo failed or nothing to revert.');
    }
    if (text == '/redo') {
      if (sessId.isEmpty) return _done('No active session to redo.');
      final ok = await agentCoreService.unrevertSession(sessId);
      return _done(ok ? 'Restored reverted turn.' : 'Redo failed or nothing to restore.');
    }
    if (text == '/compact') {
      if (sessId.isEmpty) return _done('No active session to compact.');
      final ok = await agentCoreService.compactSession(sessId,
          providerId: selectedModel?.provider, modelId: selectedModel?.id);
      return _done(ok ? 'Session context compacted successfully.' : 'Failed to compact session.');
    }
    if (text == '/fork') {
      if (sessId.isEmpty) return _done('No active session to fork.');
      final newId = await agentCoreService.forkSession(sessId);
      if (newId != null) {
        onSelectSession?.call({'id': newId, 'title': 'Forked Session'});
        return _done('Forked to new session: $newId');
      }
      return _done('Failed to fork session.');
    }
    if (text == '/share') {
      if (sessId.isEmpty) return _done('No active session to share.');
      final url = await agentCoreService.shareSession(sessId);
      if (url != null) {
        await Clipboard.setData(ClipboardData(text: url));
        return _done('Share URL copied: $url');
      }
      return _done('Failed to share session.');
    }
    if (text == '/unshare') {
      if (sessId.isEmpty) return _done('No active session.');
      final ok = await agentCoreService.unshareSession(sessId);
      return _done(ok ? 'Session unshared.' : 'Failed to unshare session.');
    }
    if (text == '/export') {
      showExportModal();
      return _done(null);
    }
    if (text.startsWith('/context')) {
      final memories = await agentCoreService.getMemories();
      showMemoriesModal(memories);
      return _done(null);
    }

    // ── Memory commands ───────────────────────────────────────────────────────
    if (text.startsWith('/save-memory')) {
      final parts = text.substring('/save-memory'.length).trim();
      if (parts.isEmpty) return _done('Usage: /save-memory <key> <value>');
      final firstSpace = parts.indexOf(' ');
      final key = firstSpace > 0 ? parts.substring(0, firstSpace).trim() : 'note';
      final val = firstSpace > 0 ? parts.substring(firstSpace).trim() : parts;
      final ok = await agentCoreService.saveMemory(key, val);
      return _done(ok ? 'Memory saved: $key' : 'Failed to save memory.');
    }
    if (text.startsWith('/update-memory')) {
      final parts = text.substring('/update-memory'.length).trim();
      final firstSpace = parts.indexOf(' ');
      if (parts.isEmpty || firstSpace <= 0) return _done('Usage: /update-memory <id> <new content>');
      final id = parts.substring(0, firstSpace).trim();
      final content = parts.substring(firstSpace).trim();
      final ok = await agentCoreService.updateMemory(id: id, content: content);
      return _done(ok ? 'Updated memory: $id' : 'Failed to update memory.');
    }
    if (text.startsWith('/delete-memory')) {
      final idOrDomain = text.substring('/delete-memory'.length).trim();
      if (idOrDomain.isEmpty) return _done('Usage: /delete-memory <id or domain>');
      final isDomain = idOrDomain.startsWith('domain:');
      final ok = isDomain
          ? await agentCoreService.deleteMemory(domain: idOrDomain.replaceFirst('domain:', '').trim())
          : await agentCoreService.deleteMemory(id: idOrDomain);
      return _done(ok ? 'Deleted memory: $idOrDomain' : 'Failed to delete memory.');
    }
    if (text.startsWith('/reset-memory')) {
      final scopeArg = text.substring('/reset-memory'.length).trim();
      final scope = scopeArg.isEmpty ? 'all' : scopeArg;
      final ok = await agentCoreService.resetMemory(scope: scope);
      return _done(ok ? 'All persistent memories reset ($scope).' : 'Failed to reset memories.');
    }

    return const SlashCommandResult(handled: false);
  }

  static SlashCommandResult _done(String? msg) =>
      SlashCommandResult(handled: true, snackMessage: msg);
}

/// Convenience extension to show the slash command result toast.
extension SlashCommandResultX on SlashCommandResult {
  void showSnack(BuildContext context) {
    if (snackMessage != null) {
      AppToast.info(context, snackMessage!);
    }
  }
}
