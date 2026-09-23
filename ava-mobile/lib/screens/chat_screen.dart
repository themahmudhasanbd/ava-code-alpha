import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:file_picker/file_picker.dart';
import '../models/app_models.dart';
import '../services/agent_core_service.dart';
import '../services/audio_recorder_service.dart';
import '../services/speech_service.dart';
import '../services/chat_slash_command_handler.dart';
import '../widgets/formatted_message_view.dart';
import '../widgets/server_file_picker_modal.dart';
import '../widgets/chat/sticky_question_dock.dart';
import '../widgets/chat/sticky_permission_dock.dart';
import '../widgets/chat/prompt_highlight_controller.dart';
import '../widgets/chat/chat_autocomplete_overlay.dart';
import '../widgets/chat/chat_empty_view.dart';
import '../widgets/chat/chat_attached_files_row.dart';
import '../widgets/chat/chat_voice_input_button.dart';
import '../widgets/chat/chat_sandbox_pill.dart';
import '../widgets/chat/chat_model_badge.dart';
import '../widgets/chat/chat_loading_history_indicator.dart';
import '../widgets/chat/modals/chat_export_modal.dart';
import '../widgets/chat/modals/chat_memories_modal.dart';
import '../widgets/chat/modals/model_reasoning_modal.dart';
import '../widgets/chat/modals/sandbox_mode_modal.dart';
import '../widgets/chat/modals/chat_actions_bottom_sheet.dart';
import '../widgets/chat/modals/chat_add_files_modal.dart';
import '../widgets/chat/chat_queued_prompts_dock.dart';
import '../widgets/chat/modals/queued_prompts_manager_modal.dart';
import '../widgets/chat/background_task_sticky_widget.dart';
import '../utils/app_toast.dart';
import '../config/chat_constants.dart';
import '../theme/prompt_theme.dart';

class ChatScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final List<ChatMessageModel> messages;
  final String selectedMode;
  final ValueChanged<String> onSelectMode;
  final String? selectedAgent;
  final ValueChanged<String>? onSelectAgent;
  final VoidCallback? onNewSession;
  final String vpsWorkspacePath;
  final Future<void> Function(String prompt, {List<String>? attachments, String? userDisplayText}) onSendPrompt;
  final VoidCallback? onInterrupt;
  final Function(String requestID, String answer)? onQuestionReplied;
  final void Function(bool approved, String command, {String? requestId})? onPermissionDecision;
  final AvaAgentCoreService agentCoreService;
  final ValueChanged<int>? onNavigateTab;
  final VoidCallback? onClearMessages;
  final Function(String filePath, {String? diffOrContent})? onOpenFile;
  final Function(Map<String, dynamic> session)? onSelectSession;
  final AvaModelItem? selectedModel;
  final List<AvaModelItem> availableModels;
  final ValueChanged<AvaModelItem>? onSelectModel;
  final String reasoningEffort;
  final ValueChanged<String>? onSelectReasoningEffort;
  final String? initialAttachment;
  final VoidCallback? onClearInitialAttachment;

  const ChatScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.messages,
    required this.selectedMode,
    required this.onSelectMode,
    this.selectedAgent,
    this.onSelectAgent,
    this.onNewSession,
    required this.vpsWorkspacePath,
    required this.onSendPrompt,
    this.onInterrupt,
    this.onQuestionReplied,
    this.onPermissionDecision,
    required this.agentCoreService,
    this.onNavigateTab,
    this.onClearMessages,
    this.onOpenFile,
    this.onSelectSession,
    this.selectedModel,
    this.availableModels = const [],
    this.onSelectModel,
    this.reasoningEffort = "medium",
    this.onSelectReasoningEffort,
    this.initialAttachment,
    this.onClearInitialAttachment,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final PromptHighlightController _promptController = PromptHighlightController();
  final FocusNode _promptFocusNode = FocusNode();
  DateTime? _lastEnterKeyDownTime;
  DateTime? _lastSoftEnterTime;
  final ScrollController _scrollController = ScrollController();
  bool _userScrolledUp = false;
  bool _isSending = false;
  bool _isLoadingSuggestions = false;
  String? _dismissedQuestionId;
  String? _dismissedPermissionId;

  // Attached files state
  final List<String> _attachedFiles = [];
  bool _isUploadingDeviceFile = false;

  // Queued prompts state
  final List<QueuedPromptItem> _queuedPrompts = [];

  // Autocomplete popup states
  bool _showSlashOverlay = false;
  bool _showAtOverlay = false;
  String _slashFilter = '';
  String _atFilter = '';

  List<Map<String, String>> _dynamicSuggestions = [];
  String _currentReasoningEffort = 'medium';
  bool _isRecordingVoice = false;
  Timer? _recordingTimer;
  int _recordingSeconds = 0;
  String _liveSpeechTranscript = '';
  final Map<String, String> _voiceTranscripts = {};

  // Static config lists (from chat_constants.dart)
  final List<Map<String, dynamic>> _sandboxOptions = kDefaultSandboxOptions;
  final List<SlashCommandItem> _builtinSlashCommands = kDefaultSlashCommands;
  final List<Map<String, dynamic>> _atContextItems = kDefaultAtContextItems;

  // History pagination state
  bool _isLoadingMoreHistory = false;
  bool _hasMoreHistory = true;
  String? _historyCursor;

  // Dynamic data fetched from server
  List<SlashCommandItem> _dynamicCoreCommands = [];

  String? _activeSessionId;
  final Set<String> _locallyCancelledTaskIds = {};

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    if (widget.initialAttachment != null && widget.initialAttachment!.isNotEmpty) {
      if (!_attachedFiles.contains(widget.initialAttachment!)) {
        _attachedFiles.add(widget.initialAttachment!);
      }
      widget.onClearInitialAttachment?.call();
    }
    _activeSessionId = widget.agentCoreService.lastActiveSessionId;
    if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
      _historyCursor = widget.agentCoreService.getSessionCursor(_activeSessionId!);
      _hasMoreHistory = widget.agentCoreService.hasMoreHistory(_activeSessionId!);
    }
    _scrollController.addListener(_handleScrollChange);
    _promptController.addListener(_onPromptControllerChanged);
    _fetchDynamicAiSuggestions();
    _fetchRegisteredCommands();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom(animate: false, retries: 6);
    });
  }

  void _onPromptControllerChanged() {
    if (mounted) setState(() {});
  }

  @override
  void didUpdateWidget(covariant ChatScreen oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.initialAttachment != null &&
        widget.initialAttachment!.isNotEmpty &&
        widget.initialAttachment != oldWidget.initialAttachment) {
      if (!_attachedFiles.contains(widget.initialAttachment!)) {
        setState(() => _attachedFiles.add(widget.initialAttachment!));
      }
      widget.onClearInitialAttachment?.call();
    }

    final currentSessionId = widget.agentCoreService.lastActiveSessionId;
    final bool sessionChanged = currentSessionId != _activeSessionId ||
        (oldWidget.messages.isEmpty && widget.messages.isNotEmpty) ||
        (oldWidget.messages.any((m) => m.id == 'loading-hist') &&
            !widget.messages.any((m) => m.id == 'loading-hist'));

    if (sessionChanged) {
      _activeSessionId = currentSessionId;
      _userScrolledUp = false;
      _historyCursor =
          currentSessionId != null ? widget.agentCoreService.getSessionCursor(currentSessionId) : null;
      _hasMoreHistory =
          currentSessionId != null ? widget.agentCoreService.hasMoreHistory(currentSessionId) : true;
      _scrollToBottom(animate: false, retries: 6);
    } else if (widget.messages.isNotEmpty) {
      final isNewMessageAdded = widget.messages.length > oldWidget.messages.length;
      final bool hasNewUserMsg = isNewMessageAdded &&
          widget.messages.skip(oldWidget.messages.length).any((m) => m.sender == 'user');

      if (hasNewUserMsg) {
        _userScrolledUp = false;
        _scrollToBottom(animate: true, retries: 6);
      } else if (!_userScrolledUp && (widget.messages.last.isPending || _isSending)) {
        _scrollToBottom(animate: false, retries: 2);
      }

      // Check if active turn completed - reset _isSending and process queued prompts
      final bool nowHasPending = widget.messages.any((m) => m.isPending) || widget.agentCoreService.isStreaming;
      if (!nowHasPending) {
        if (_isSending) {
          setState(() => _isSending = false);
        }
        if (_queuedPrompts.isNotEmpty) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _processNextQueuedPrompt());
        }
      }
    }
  }

  @override
  void dispose() {
    _recordingTimer?.cancel();
    if (_isRecordingVoice) AudioRecorderService.stopRecording();
    _promptController.removeListener(_onPromptControllerChanged);
    _promptFocusNode.dispose();
    _promptController.dispose();
    _scrollController.removeListener(_handleScrollChange);
    _scrollController.dispose();
    super.dispose();
  }

  bool _scrollPostFrameScheduled = false;

  void _handleScrollChange() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    final distanceFromBottom = position.maxScrollExtent - position.pixels;

    if (distanceFromBottom > 80) {
      if (!_userScrolledUp) {
        setState(() => _userScrolledUp = true);
      }
    } else if (distanceFromBottom <= 25) {
      if (_userScrolledUp) {
        setState(() => _userScrolledUp = false);
      }
    }

    final bool hasPendingMsg = widget.messages.any((m) => m.isPending);
    // Only trigger pagination when the user is explicitly dragging/scrolling upwards near the top
    final bool isUserActivelyScrollingUp =
        _userScrolledUp && position.userScrollDirection == ScrollDirection.forward;
    if (isUserActivelyScrollingUp &&
        position.maxScrollExtent > 400 &&
        position.pixels <= 40 &&
        !_isLoadingMoreHistory &&
        _hasMoreHistory &&
        !_isSending &&
        !hasPendingMsg) {
      _loadMoreHistoryMessages();
    }
  }

  void _scrollToBottom({bool animate = true, int retries = 0}) {
    if (_userScrolledUp && !_isSending) return;
    if (_scrollPostFrameScheduled) return;
    _scrollPostFrameScheduled = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollPostFrameScheduled = false;
      if (!mounted || !_scrollController.hasClients) return;
      if (_userScrolledUp && !_isSending) return;
      final maxScroll = _scrollController.position.maxScrollExtent;
      final currentPixels = _scrollController.position.pixels;

      if (maxScroll > 0 && currentPixels < maxScroll) {
        if (animate) {
          final distance = (maxScroll - currentPixels).abs();
          final durationMs = (distance * 0.35).clamp(200, 450).toInt();
          _scrollController.animateTo(
            maxScroll,
            duration: Duration(milliseconds: durationMs),
            curve: Curves.easeOutCubic,
          );
        } else {
          _scrollController.jumpTo(maxScroll);
        }
      }
      if (retries > 0 && mounted && (!_userScrolledUp || _isSending)) {
        Future.delayed(const Duration(milliseconds: 40), () {
          if (mounted && (!_userScrolledUp || _isSending)) {
            _scrollToBottom(animate: animate, retries: retries - 1);
          }
        });
      }
    });
  }

  // ─── Data Fetching ───────────────────────────────────────────────────────────

  Future<void> _fetchDynamicAiSuggestions() async {
    if (_isLoadingSuggestions) return;
    setState(() => _isLoadingSuggestions = true);
    final suggestions = await widget.agentCoreService.fetchSuggestions(
      agent: widget.selectedMode.isEmpty ? 'WORKSPACE_WRITE' : widget.selectedMode,
      workspace: widget.vpsWorkspacePath,
    );
    if (mounted) setState(() { _dynamicSuggestions = suggestions; _isLoadingSuggestions = false; });
  }

  Future<void> _fetchRegisteredCommands() async {
    try {
      final cmds = await widget.agentCoreService.fetchCommands();
      if (mounted && cmds.isNotEmpty) {
        setState(() {
          _dynamicCoreCommands = cmds;
          _promptController.updateRegisteredCommands(cmds.map((c) => c.command));
        });
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  Future<void> _loadMoreHistoryMessages() async {
    if (_isLoadingMoreHistory || !_hasMoreHistory || widget.messages.isEmpty) return;
    final sessId = widget.agentCoreService.lastActiveSessionId;
    if (sessId == null || sessId.isEmpty) return;

    final cursor = _historyCursor ?? widget.agentCoreService.getSessionCursor(sessId);
    if (cursor == null || cursor.isEmpty) {
      setState(() { _hasMoreHistory = false; _isLoadingMoreHistory = false; });
      return;
    }

    setState(() => _isLoadingMoreHistory = true);
    try {
      final result = await widget.agentCoreService.fetchSessionMessages(sessId, beforeCursor: cursor, limit: 12);
      final olderMsgs = (result['messages'] as List<ChatMessageModel>?) ?? [];
      final nextCursor = result['nextCursor'] as String?;
      final hasMore = result['hasMore'] == true;

      if (mounted && olderMsgs.isNotEmpty) {
        final double oldMaxScroll = _scrollController.hasClients ? _scrollController.position.maxScrollExtent : 0;
        setState(() {
          _historyCursor = nextCursor;
          _hasMoreHistory = hasMore;
          widget.agentCoreService.setSessionCursor(sessId, nextCursor);
          final combined = List<ChatMessageModel>.from(olderMsgs)..addAll(widget.messages);
          final coalesced = ChatMessageModel.coalesceList(combined);
          widget.messages.clear();
          widget.messages.addAll(coalesced);
          _isLoadingMoreHistory = false;
        });
        unawaited(widget.agentCoreService.saveSessionMessagesToCache(sessId, widget.messages));
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            final newMaxScroll = _scrollController.position.maxScrollExtent;
            final scrollDiff = newMaxScroll - oldMaxScroll;
            if (scrollDiff > 0) _scrollController.jumpTo(_scrollController.position.pixels + scrollDiff);
          }
        });
      } else if (mounted) {
        setState(() { _hasMoreHistory = false; _isLoadingMoreHistory = false; });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingMoreHistory = false);
    }
  }

  // ─── Keyboard Enter & Autocomplete ─────────────────────────────────────────

  KeyEventResult _handlePromptKeyEvent(FocusNode node, KeyEvent event) {
    if (event is KeyDownEvent &&
        (event.logicalKey == LogicalKeyboardKey.enter ||
         event.logicalKey == LogicalKeyboardKey.numpadEnter)) {
      final isModifier = HardwareKeyboard.instance.isShiftPressed ||
          HardwareKeyboard.instance.isControlPressed ||
          HardwareKeyboard.instance.isAltPressed;

      if (!isModifier) {
        final now = DateTime.now();
        if (_lastEnterKeyDownTime != null &&
            now.difference(_lastEnterKeyDownTime!) < const Duration(milliseconds: 600)) {
          // Double enter pressed quickly! Send prompt
          _lastEnterKeyDownTime = null;
          final cleanText = _promptController.text.trim();
          if (cleanText.isNotEmpty || _attachedFiles.isNotEmpty) {
            _promptController.text = cleanText;
            _handleSend();
            return KeyEventResult.handled;
          }
        }
        _lastEnterKeyDownTime = now;
        // First enter -> allow standard line break
        return KeyEventResult.ignored;
      }
    }
    return KeyEventResult.ignored;
  }

  void _onPromptTextChanged(String val) {
    final now = DateTime.now();

    // Check if double enter was pressed (ends with consecutive newlines or second enter within 600ms)
    if (val.endsWith('\n\n') ||
        (_lastSoftEnterTime != null &&
         val.endsWith('\n') &&
         now.difference(_lastSoftEnterTime!) < const Duration(milliseconds: 600))) {
      _lastSoftEnterTime = null;
      final cleanText = val.trim();
      if (cleanText.isNotEmpty || _attachedFiles.isNotEmpty) {
        _promptController.text = cleanText;
        _handleSend();
        return;
      }
    }

    if (val.endsWith('\n')) {
      _lastSoftEnterTime = now;
    } else {
      _lastSoftEnterTime = null;
    }

    if (val.startsWith('/')) {
      setState(() { _showSlashOverlay = true; _showAtOverlay = false; _slashFilter = val; });
    } else if (val.contains('@')) {
      final lastAt = val.substring(val.lastIndexOf('@'));
      setState(() { _showAtOverlay = true; _showSlashOverlay = false; _atFilter = lastAt; });
    } else if (_showSlashOverlay || _showAtOverlay) {
      setState(() { _showSlashOverlay = false; _showAtOverlay = false; });
    }
  }

  void _insertAutocomplete(String textToInsert) {
    final current = _promptController.text;
    if (_showSlashOverlay) {
      _promptController.text = '$textToInsert ';
    } else if (_showAtOverlay) {
      final lastAtIndex = current.lastIndexOf('@');
      _promptController.text = lastAtIndex >= 0
          ? '${current.substring(0, lastAtIndex)}$textToInsert '
          : '$current$textToInsert ';
    }
    _promptController.selection = TextSelection.fromPosition(TextPosition(offset: _promptController.text.length));
    setState(() { _showSlashOverlay = false; _showAtOverlay = false; });
  }

  // ─── Send / Interrupt / Queue ────────────────────────────────────────────────

  void _handleSend() async {
    final text = _promptController.text.trim();
    if (text.isEmpty && _attachedFiles.isEmpty) return;

    // Special: /agent command opens modal, not handled by slash handler
    if (text == '/agent' || text == '/model') {
      _promptController.clear();
      _showModelReasoningModal(context);
      return;
    }

    // Delegate all other slash commands
    if (text.startsWith('/')) {
      _promptController.clear();
      final handler = ChatSlashCommandHandler(
        agentCoreService: widget.agentCoreService,
        activeSessionId: _activeSessionId,
        selectedModel: widget.selectedModel,
        onNewSession: widget.onNewSession,
        onClearMessages: widget.onClearMessages,
        onNavigateTab: widget.onNavigateTab,
        onSelectSession: widget.onSelectSession,
        showMemoriesModal: (memories) => _showMemoriesModal(context, memories),
        showExportModal: () => _showExportModal(context),
      );
      final result = await handler.handle(text);
      if (!mounted) return;
      result.showSnack(context);
      if (result.handled) return;
    }

    final bool isActuallyRunning = widget.messages.any((m) => m.isPending) || widget.agentCoreService.isStreaming;
    if (!isActuallyRunning && _isSending) {
      _isSending = false;
    }

    final bool hasActiveTurn = isActuallyRunning;

    // If agent is actively running, enqueue this prompt into the pending queue!
    if (hasActiveTurn) {
      final now = DateTime.now();
      final attachedCopy = List<String>.from(_attachedFiles);
      final queuedItem = QueuedPromptItem(
        id: 'queue_${now.millisecondsSinceEpoch}',
        promptText: text,
        attachments: attachedCopy,
        queuedAt: now,
      );
      _promptController.clear();
      setState(() {
        _attachedFiles.clear();
        _queuedPrompts.add(queuedItem);
        _showSlashOverlay = false;
        _showAtOverlay = false;
      });
      AppToast.success(
        context,
        'Prompt queued (#${_queuedPrompts.length} in queue)',
      );
      return;
    }

    _promptController.clear();
    final attachedToProcess = List<String>.from(_attachedFiles);
    setState(() {
      _attachedFiles.clear();
      _isSending = true;
      _showSlashOverlay = false;
      _showAtOverlay = false;
    });

    String promptText = text;

    // @git context injection
    if (promptText.contains('@git')) {
      try {
        final gitStat = await widget.agentCoreService.fetchGitStatus();
        final gitSummary =
            '[Git Context: branch=${gitStat['branch']}, modified=${gitStat['modifiedCount']} files\n${gitStat['status']}]';
        promptText = promptText.replaceAll('@git', gitSummary);
      } catch (e) { print('Ignored error: $e'); }
    }

    final bool hasAudioVoiceNote = attachedToProcess.any((f) {
      final l = f.toLowerCase();
      return l.endsWith('.webm') ||
          l.endsWith('.wav') ||
          l.endsWith('.mp3') ||
          l.endsWith('.m4a') ||
          l.endsWith('.ogg') ||
          l.endsWith('.aac') ||
          l.endsWith('.opus') ||
          l.contains('voice_note_');
    });

    String? userDisplay;
    if (text.isNotEmpty) {
      userDisplay = text;
    } else if (attachedToProcess.isNotEmpty) {
      userDisplay = ''; // Empty string so UI bubble renders only attachment cards/voice notes with zero leaked system prompt
    } else {
      userDisplay = null;
    }

    if (attachedToProcess.isNotEmpty) {
      if (hasAudioVoiceNote) {
        final audioFile = attachedToProcess.firstWhere(
          (f) =>
              f.toLowerCase().contains('voice_note_') ||
              f.toLowerCase().endsWith('.webm') ||
              f.toLowerCase().endsWith('.wav') ||
              f.toLowerCase().endsWith('.m4a') ||
              f.toLowerCase().endsWith('.mp3'),
          orElse: () => attachedToProcess.first,
        );
        final otherFiles = attachedToProcess.where((f) => f != audioFile).toList();

        final buffer = StringBuffer();
        if (text.isNotEmpty) {
          buffer.writeln(text);
          buffer.writeln();
        } else {
          buffer.writeln('Please listen to the attached voice note audio input directly and assist the user with their request.');
        }

        if (otherFiles.isNotEmpty) {
          buffer.writeln('\n[Other Attached Files:\n${otherFiles.map((f) => "- $f").join("\n")}]');
        }

        promptText = buffer.toString().trim();
      } else {
        final fileList = attachedToProcess.map((f) => '- $f').join('\n');
        promptText = promptText.isEmpty
            ? 'Please inspect and process the following attached file(s):\n$fileList'
            : '$promptText\n\n[Attached Files:\n$fileList]';
      }
    }

    _userScrolledUp = false;
    _scrollToBottom(animate: false, retries: 6);
    await widget.onSendPrompt(promptText, attachments: attachedToProcess,
        userDisplayText: userDisplay);
    if (mounted) {
      // Keep _isSending true while turn is running - it will be set to false
      // when the pending message is removed (turn completes)
      if (!widget.messages.any((m) => m.isPending)) {
        setState(() => _isSending = false);
        _processNextQueuedPrompt();
      }
      _scrollToBottom(animate: true, retries: 4);
    }
  }

  void _processNextQueuedPrompt() {
    if (_queuedPrompts.isEmpty || _isSending || widget.messages.any((m) => m.isPending)) return;
    final nextItem = _queuedPrompts.removeAt(0);
    setState(() {});
    _dispatchQueuedPrompt(nextItem);
  }

  Future<void> _dispatchQueuedPrompt(QueuedPromptItem item) async {
    setState(() => _isSending = true);

    String promptText = item.promptText;

    if (promptText.contains('@git')) {
      try {
        final gitStat = await widget.agentCoreService.fetchGitStatus();
        final gitSummary =
            '[Git Context: branch=${gitStat['branch']}, modified=${gitStat['modifiedCount']} files\n${gitStat['status']}]';
        promptText = promptText.replaceAll('@git', gitSummary);
      } catch (e) { print('Ignored error: $e'); }
    }

    final bool hasAudioVoiceNote = item.attachments.any((f) {
      final l = f.toLowerCase();
      return l.endsWith('.webm') ||
          l.endsWith('.wav') ||
          l.endsWith('.mp3') ||
          l.endsWith('.m4a') ||
          l.endsWith('.ogg') ||
          l.endsWith('.aac') ||
          l.endsWith('.opus') ||
          l.contains('voice_note_');
    });

    String? userDisplay;
    if (item.promptText.isNotEmpty) {
      userDisplay = item.promptText;
    } else if (item.attachments.isNotEmpty) {
      userDisplay = ''; // Empty string so UI bubble renders only attachment cards/voice notes with zero leaked system prompt
    } else {
      userDisplay = null;
    }

    if (item.attachments.isNotEmpty) {
      if (hasAudioVoiceNote) {
        final audioFile = item.attachments.firstWhere(
          (f) =>
              f.toLowerCase().contains('voice_note_') ||
              f.toLowerCase().endsWith('.webm') ||
              f.toLowerCase().endsWith('.wav') ||
              f.toLowerCase().endsWith('.m4a') ||
              f.toLowerCase().endsWith('.mp3'),
          orElse: () => item.attachments.first,
        );
        final otherFiles = item.attachments.where((f) => f != audioFile).toList();

        final buffer = StringBuffer();
        if (item.promptText.isNotEmpty) {
          buffer.writeln(item.promptText);
          buffer.writeln();
        } else {
          buffer.writeln('Please listen to the attached voice note audio input directly and assist the user with their request.');
        }

        if (otherFiles.isNotEmpty) {
          buffer.writeln('\n[Other Attached Files:\n${otherFiles.map((f) => "- $f").join("\n")}]');
        }

        promptText = buffer.toString().trim();
      } else {
        final fileList = item.attachments.map((f) => '- $f').join('\n');
        promptText = promptText.isEmpty
            ? 'Please inspect and process the following attached file(s):\n$fileList'
            : '$promptText\n\n[Attached Files:\n$fileList]';
      }
    }

    _userScrolledUp = false;
    _scrollToBottom(animate: false, retries: 6);
    await widget.onSendPrompt(
      promptText,
      attachments: item.attachments.isNotEmpty ? item.attachments : null,
      userDisplayText: userDisplay,
    );
    if (mounted) {
      // Keep _isSending true while turn is running - it will be set to false
      // when the pending message is removed (turn completes) in didUpdateWidget
      if (!widget.messages.any((m) => m.isPending)) {
        setState(() => _isSending = false);
        WidgetsBinding.instance.addPostFrameCallback((_) => _processNextQueuedPrompt());
      }
      _scrollToBottom(animate: true, retries: 4);
    }
  }

  void _handleInterrupt() {
    if (mounted) setState(() => _isSending = false);
    widget.onInterrupt?.call();
  }

  Future<void> _handleKillBackgroundTask(String taskId) async {
    if (taskId.isEmpty) return;
    setState(() {
      _locallyCancelledTaskIds.add(taskId);
    });
    if (mounted) {
      AppToast.info(context, 'Stopping background task $taskId...');
    }
    try {
      final sessId = widget.agentCoreService.currentSessionId;
      final ok = await widget.agentCoreService.killBackgroundTask(taskId, sessionId: sessId);
      if (mounted) {
        if (ok) {
          AppToast.success(context, 'Background task $taskId terminated');
        } else {
          AppToast.warning(context, 'Task termination requested for $taskId');
        }
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to terminate task: $e');
      }
    }
  }

  // ─── Voice Input (Direct Audio Recording & Speech Transcription) ───────────

  void _toggleVoiceInput() {
    if (_isRecordingVoice) {
      _stopVoiceRecording();
      return;
    }
    if (!AudioRecorderService.isSupported) {
      AppToast.warning(context, 'Audio recording is not supported in this browser/device.');
      return;
    }
    _recordingSeconds = 0;
    _liveSpeechTranscript = '';

    // Simultaneously start speech recognition for background transcription
    if (SpeechService.isSupported) {
      SpeechService.startListening(
        onStarted: () {},
        onResult: (text) {
          if (mounted && _isRecordingVoice) {
            _liveSpeechTranscript = text;
          }
        },
        onError: (_) {},
        onEnd: () {},
      );
    }

    AudioRecorderService.startRecording(
      onStarted: () {
        if (!mounted) return;
        setState(() => _isRecordingVoice = true);
        _recordingTimer?.cancel();
        _recordingTimer = Timer.periodic(const Duration(seconds: 1), (t) {
          if (!mounted) {
            t.cancel();
            return;
          }
          setState(() => _recordingSeconds++);
        });
      },
      onError: (err) {
        if (!mounted) return;
        _recordingTimer?.cancel();
        if (SpeechService.isSupported) {
          SpeechService.stopListening();
        }
        setState(() => _isRecordingVoice = false);
        AppToast.error(context, 'Audio recording notice: $err');
      },
    );
  }

  Future<void> _stopVoiceRecording() async {
    _recordingTimer?.cancel();
    setState(() => _isRecordingVoice = false);

    if (SpeechService.isSupported) {
      SpeechService.stopListening();
    }

    final res = await AudioRecorderService.stopRecording();
    if (res == null || res.bytes.isEmpty) {
      if (mounted) AppToast.warning(context, 'No audio captured.');
      return;
    }

    final ext = res.extension.isNotEmpty ? res.extension : 'webm';
    final fileName = 'voice_note_${DateTime.now().millisecondsSinceEpoch}.$ext';
    final uploadRes = await widget.agentCoreService.uploadFile(
      targetDirectory: '/root/shared-media/temp',
      fileName: fileName,
      fileBytes: res.bytes,
    );

    final fullPath = (uploadRes != null && uploadRes['fullPath'] != null)
        ? uploadRes['fullPath'].toString()
        : '/root/shared-media/temp/$fileName';

    if (_liveSpeechTranscript.trim().isNotEmpty) {
      _voiceTranscripts[fullPath] = _liveSpeechTranscript.trim();
    }

    if (mounted) {
      if (!_attachedFiles.contains(fullPath)) {
        setState(() => _attachedFiles.add(fullPath));
      }
      final durationStr = '${(res.duration.inSeconds ~/ 60).toString().padLeft(2, '0')}:${(res.duration.inSeconds % 60).toString().padLeft(2, '0')}';
      AppToast.success(context, 'Voice note attached ($durationStr). Ready to send.');
    }
  }

  // ─── File Picking ────────────────────────────────────────────────────────────

  void _showAddFilesMenu(BuildContext context) {
    ChatAddFilesModal.show(
      context,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      onPickFromDevice: _pickAndUploadFilesFromDevice,
      onPickFromServer: _pickFilesFromServer,
    );
  }

  Future<void> _pickAndUploadFilesFromDevice() async {
    try {
      final files = await FilePicker.pickFiles();
      if (files.isNotEmpty) {
        setState(() => _isUploadingDeviceFile = true);
        int successCount = 0;
        for (final file in files) {
          final fileName = file.name;
          final ext = fileName.contains('.') ? fileName.split('.').last.toLowerCase() : '';
          final isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].contains(ext);

          if (isImg && widget.selectedModel != null && !widget.selectedModel!.supportsImages) {
            if (mounted) {
              AppToast.warning(
                context,
                'Selected model "${widget.selectedModel!.name}" does not natively support vision. File attached as reference.',
              );
            }
          }

          final bytes = await file.readAsBytes();
          if (bytes.isEmpty) continue;
          final res = await widget.agentCoreService.uploadFile(
            targetDirectory: '/root/shared-media/temp',
            fileName: file.name,
            fileBytes: bytes,
          );
          if (res != null && res['status'] == 'ok') {
            successCount++;
            final fullPath = res['fullPath']?.toString() ?? '/root/shared-media/temp/${file.name}';
            if (!_attachedFiles.contains(fullPath)) {
              setState(() => _attachedFiles.add(fullPath));
            }
          }
        }
        if (mounted) {
          setState(() => _isUploadingDeviceFile = false);
          if (successCount > 0) {
            AppToast.success(context, 'Attached $successCount file(s) to prompt.');
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingDeviceFile = false);
        AppToast.error(context, 'File upload error: $e');
      }
    }
  }

  Future<void> _pickFilesFromServer() async {
    final initial = (widget.agentCoreService.workspacePath.isNotEmpty)
        ? widget.agentCoreService.workspacePath
        : '/root/shared-media';
    final selected = await showServerFilePickerModal(
      context,
      agentCoreService: widget.agentCoreService,
      initialPath: initial,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
    );
    if (selected != null && selected.isNotEmpty) {
      final fileName = selected.split('/').last;
      final ext = fileName.contains('.') ? fileName.split('.').last.toLowerCase() : '';
      final isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].contains(ext);

      if (isImg && widget.selectedModel != null && !widget.selectedModel!.supportsImages) {
        if (mounted) {
          AppToast.warning(
            context,
            'Selected model "${widget.selectedModel!.name}" does not natively support vision. File attached as reference.',
          );
        }
      }

      if (!_attachedFiles.contains(selected)) setState(() => _attachedFiles.add(selected));
      if (mounted) {
        AppToast.info(context, 'Attached "$fileName" to prompt.');
      }
    }
  }

  // ─── Modal Launchers ─────────────────────────────────────────────────────────

  void _showExportModal(BuildContext context) {
    ChatExportModal.show(
      context,
      sessionId: _activeSessionId ?? widget.agentCoreService.lastActiveSessionId ?? 'default',
      messages: widget.messages,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
    );
  }

  void _showMemoriesModal(BuildContext context, List<Map<String, dynamic>> initialMemories) {
    ChatMemoriesModal.show(
      context,
      agentCoreService: widget.agentCoreService,
      initialMemories: initialMemories,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
    );
  }

  void _showModelReasoningModal(BuildContext context) {
    ModelReasoningModal.show(
      context,
      currentModel: widget.selectedModel,
      availableModels: widget.availableModels,
      currentReasoningEffort: _currentReasoningEffort,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      onSelectModel: widget.onSelectModel,
      onSelectReasoningEffort: (effort) {
        setState(() => _currentReasoningEffort = effort);
        widget.onSelectReasoningEffort?.call(effort);
      },
    );
  }

  void _showSandboxModeModal(BuildContext context) {
    SandboxModeModal.show(
      context,
      selectedMode: widget.selectedMode,
      sandboxOptions: _sandboxOptions,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      onSelectMode: (modeId) {
        widget.onSelectMode(modeId);
        final opt = _sandboxOptions.firstWhere((o) => o['id'] == modeId,
            orElse: () => _sandboxOptions.first);
        AppToast.info(context, 'Sandbox mode set to ${opt['name']}');
      },
    );
  }

  void _openQueuedPromptsManager(BuildContext context) {
    QueuedPromptsManagerModal.show(
      context,
      queuedPrompts: _queuedPrompts,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      onEditPrompt: (item) {
        setState(() {
          _queuedPrompts.remove(item);
          _promptController.text = item.promptText;
          _attachedFiles.addAll(item.attachments);
        });
        _promptFocusNode.requestFocus();
      },
      onSendNow: (item) {
        setState(() => _queuedPrompts.remove(item));
        _dispatchQueuedPrompt(item);
      },
      onDeleteIndex: (idx) {
        if (idx >= 0 && idx < _queuedPrompts.length) {
          setState(() => _queuedPrompts.removeAt(idx));
        }
      },
      onReorder: (oldIdx, newIdx) {
        setState(() {
          var targetIdx = newIdx;
          if (oldIdx < targetIdx) {
            targetIdx -= 1;
          }
          final item = _queuedPrompts.removeAt(oldIdx);
          _queuedPrompts.insert(targetIdx, item);
        });
      },
      onClearAll: () {
        setState(() => _queuedPrompts.clear());
      },
    );
  }

  void _showPromptThreeDotMenu(BuildContext context) {
    final currentSandbox = _sandboxOptions.firstWhere((opt) => opt['id'] == widget.selectedMode,
        orElse: () => _sandboxOptions.first);
    ChatActionsBottomSheet.show(
      context,
      currentModel: widget.selectedModel,
      reasoningEffort: _currentReasoningEffort,
      currentSandbox: currentSandbox,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      onOpenModelReasoning: () => _showModelReasoningModal(context),
      onOpenSandboxSelector: () => _showSandboxModeModal(context),
      onNewSession: widget.onNewSession,
      onNavigateTab: widget.onNavigateTab,
      onClearMessages: widget.onClearMessages,
      queuedPromptsCount: _queuedPrompts.length,
      onOpenQueuedPrompts: () => _openQueuedPromptsManager(context),
    );
  }

  List<BackgroundTaskItem> _getBackgroundTasks() {
    final List<BackgroundTaskItem> tasks = [];
    final Set<String> seenIds = {};
    final Set<String> finishedTaskIds = Set<String>.from(_locallyCancelledTaskIds);

    void addFinishedId(String? raw) {
      if (raw == null) return;
      final trimmed = raw.trim();
      if (trimmed.isEmpty) return;
      finishedTaskIds.add(trimmed);
      if (trimmed.contains('/')) {
        finishedTaskIds.add(trimmed.split('/').last);
      }
    }

    bool isTaskFinished(String checkId) {
      if (finishedTaskIds.contains(checkId)) return true;
      final shortId = checkId.contains('/') ? checkId.split('/').last : checkId;
      if (finishedTaskIds.contains(shortId)) return true;
      return finishedTaskIds.any((f) =>
          f == checkId ||
          f == shortId ||
          (f.contains('/') && f.split('/').last == shortId) ||
          (checkId.contains('/') && checkId.split('/').last == f));
    }

    // 1. First pass: Collect all genuinely finished/terminated background task IDs
    for (final msg in widget.messages) {
      final text = msg.text;
      if (text.isNotEmpty) {
        // Explicit completion XML blocks: <command_result task_id="XYZ" ...>, <tool_result task_id="XYZ" ...>, <task_result ...>
        for (final m in RegExp(
          r'<(?:command_result|tool_result|task_result|subagent_result)\b[^>]*?(?:task_id|id|jobId)=["\x27]?([^"\x27\s>]+)',
          caseSensitive: false,
        ).allMatches(text)) {
          addFinishedId(m.group(1));
        }

        // Explicit completion summaries like:
        // "[Background Command Completed: ...]" or "[Background Tool "..." Completed (Task ID: XYZ)]"
        for (final m in RegExp(
          r'\[Background\s+(?:Command|Tool|Task)\s+(?:Completed|Failed|Cancelled|Killed)[\s\S]*?(?:task_id|id|Task ID)[:=\s]+["\x27]?([^"\x27\s\]\)]+)',
          caseSensitive: false,
        ).allMatches(text)) {
          addFinishedId(m.group(1));
        }

        // Notification header: 'Task id "XYZ" finished with result:'
        for (final m in RegExp(
          r'Task\s+id\s+["\x27]?([^"\x27\s]+)["\x27]?\s+finished',
          caseSensitive: false,
        ).allMatches(text)) {
          addFinishedId(m.group(1));
        }

        // Explicit sentence: "Task ID: XYZ has completed" / "Background command ... (Task ID: XYZ) has completed"
        for (final m in RegExp(
          r'(?:Task|Job)(?:\s+ID|\s+id)?[:\s\)]*["\x27]?([^"\x27\s]+)["\x27]?\s+(?:has\s+)?(?:been\s+)?(?:completed|finished|killed|terminated|failed|cancelled)',
          caseSensitive: false,
        ).allMatches(text)) {
          addFinishedId(m.group(1));
        }

        for (final m in RegExp(
          r'(?:task_id|job_id|jobId)[:=\s]+["\x27]?([^"\x27\s]+)["\x27]?[\s\S]*?(?:completed|finished|failed|cancelled)',
          caseSensitive: false,
        ).allMatches(text)) {
          addFinishedId(m.group(1));
        }
      }

      for (final part in msg.parts) {
        final pOut = part.output ?? '';
        final pText = part.text;
        final combined = '$pOut $pText';
        if (combined.isNotEmpty) {
          for (final m in RegExp(
            r'<(?:command_result|tool_result|task_result|subagent_result)\b[^>]*?(?:task_id|id|jobId)=["\x27]?([^"\x27\s>]+)',
            caseSensitive: false,
          ).allMatches(combined)) {
            addFinishedId(m.group(1));
          }

          for (final m in RegExp(
            r'Task\s+id\s+["\x27]?([^"\x27\s]+)["\x27]?\s+finished',
            caseSensitive: false,
          ).allMatches(combined)) {
            addFinishedId(m.group(1));
          }

          for (final m in RegExp(
            r'(?:Task|Job)(?:\s+ID|\s+id)?[:\s\)]*["\x27]?([^"\x27\s]+)["\x27]?\s+(?:has\s+)?(?:been\s+)?(?:completed|finished|killed|terminated|failed|cancelled)',
            caseSensitive: false,
          ).allMatches(combined)) {
            addFinishedId(m.group(1));
          }
        }

        final pMeta = part.metadata ?? {};
        if (pMeta['status'] == 'completed' ||
            pMeta['status'] == 'failed' ||
            pMeta['status'] == 'cancelled' ||
            pMeta['exit'] != null) {
          addFinishedId(pMeta['jobId']?.toString());
          addFinishedId(pMeta['taskId']?.toString());
          addFinishedId(part.callId);
          addFinishedId(part.id);
        }
      }
    }

    // 2. Second pass: Find active background tasks that have not completed yet
    for (final msg in widget.messages.reversed) {
      for (final part in msg.parts) {
        final meta = part.metadata ?? {};
        final dynamic input = part.input;
        bool isBg = meta['background'] == true || meta['isDaemon'] == true;

        if (!isBg && input is Map) {
          isBg = input['background'] == true ||
              input['IsDaemon'] == true ||
              input['isDaemon'] == true ||
              input['runInBackground'] == true;
        }

        final out = part.output ?? '';
        if (!isBg) {
          isBg = out.contains('started in background') ||
              out.contains('Task ID:') ||
              out.contains('Tool is running as a background task') ||
              out.contains('<background_task');
        }

        if (!isBg) continue;

        // Check if the part already finished or has an exit code
        if (meta['exit'] != null ||
            meta['status'] == 'completed' ||
            meta['status'] == 'failed' ||
            meta['status'] == 'cancelled' ||
            out.contains('has completed with status') ||
            out.contains('finished with result:')) {
          continue;
        }

        // Extract task ID
        String? id = meta['jobId']?.toString() ??
            meta['taskId']?.toString() ??
            meta['sessionID']?.toString();

        if (id == null || id.isEmpty) {
          final idMatch = RegExp(
            r'(?:Task\s+ID|job_id|task_id|task\s+id|id)[:=\s]+["\x27]?([a-zA-Z0-9_\-\/]+)["\x27]?',
            caseSensitive: false,
          ).firstMatch(out);
          if (idMatch != null) {
            id = idMatch.group(1);
          }
        }
        id ??= part.callId ?? (part.id.isNotEmpty ? part.id : null);
        if (id == null || id.isEmpty) continue;

        if (!seenIds.contains(id)) {
          seenIds.add(id);

          // If this task was finished in a later message or cancelled locally, skip it
          if (isTaskFinished(id) ||
              (part.callId != null && isTaskFinished(part.callId!)) ||
              (part.id.isNotEmpty && isTaskFinished(part.id)) ||
              (meta['jobId'] != null && isTaskFinished(meta['jobId'].toString()))) {
            continue;
          }

          String command = '';
          if (input is Map) {
            command = input['command']?.toString() ??
                input['CommandLine']?.toString() ??
                input['commandLine']?.toString() ??
                input['prompt']?.toString() ??
                input['description']?.toString() ??
                '';
          } else if (input is String) {
            command = input;
          }
          if (command.isEmpty) {
            command = meta['command']?.toString() ??
                meta['title']?.toString() ??
                part.tool ??
                'Background Task';
          }

          tasks.add(BackgroundTaskItem(
            id: id,
            command: command,
            tool: part.tool ?? meta['tool']?.toString() ?? 'Task',
            startTime: part.timestamp,
            status: 'running',
            output: part.output,
          ));
        }
      }
    }
    return tasks;
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final currentSandbox = _sandboxOptions.firstWhere(
      (opt) => opt['id'] == widget.selectedMode,
      orElse: () => _sandboxOptions.first,
    );
    final Color sandboxColor = currentSandbox['color'] as Color;
    final backgroundTasks = _getBackgroundTasks();

    return Stack(
      children: [
        // ── Full-viewport Message List (scrolls behind transparent prompt bar) ─
        Positioned.fill(
          child: _buildMessageList(),
        ),

        // ── Floating Jump-to-Latest Button ──────────────────────────────────
        if (_userScrolledUp)
          Positioned(
            bottom: 130,
            right: 16,
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0.0, end: 1.0),
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCubic,
              builder: (context, val, child) => Opacity(
                opacity: val,
                child: Transform.translate(
                  offset: Offset(0, (1 - val) * 8),
                  child: child,
                ),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    setState(() => _userScrolledUp = false);
                    _scrollToBottom(animate: true, retries: 2);
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: widget.isDark ? const Color(0xFF1E1E2E) : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: widget.isDark
                            ? const Color(0xFF6366F1).withValues(alpha: 0.40)
                            : const Color(0xFF6366F1).withValues(alpha: 0.25),
                        width: 1.0,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: widget.isDark ? 0.25 : 0.12),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.arrowDown, size: 14, color: Color(0xFF6366F1)),
                        const SizedBox(width: 5),
                        Text(
                          'Latest',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'PlusJakartaSans',
                            color: widget.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

        // ── Floating Bottom Dock (Suggestions, Sticky Docks, Autocomplete & Prompt Input Bar) ─
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Autocomplete Overlay ──────────────────────────────────────
              if (_showSlashOverlay || _showAtOverlay)
                ChatAutocompleteOverlay(
                  isSlash: _showSlashOverlay,
                  slashFilter: _slashFilter,
                  atFilter: _atFilter,
                  builtinSlashCommands: _builtinSlashCommands,
                  dynamicCoreCommands: _dynamicCoreCommands,
                  atContextItems: _atContextItems,
                  isDark: widget.isDark,
                  cardBg: widget.cardBg,
                  borderColor: widget.borderColor,
                  textPrimary: widget.textPrimary,
                  textSecondary: widget.textSecondary,
                  onSelect: _insertAutocomplete,
                ),



              // ── Sticky Docks ──────────────────────────────────────────────
              StickyPermissionDock(
                activePermission: StickyPermissionDock.getActivePermission(widget.messages,
                    dismissedPermissionId: _dismissedPermissionId),
                isDark: widget.isDark,
                cardBg: widget.cardBg,
                borderColor: widget.borderColor,
                textPrimary: widget.textPrimary,
                textSecondary: widget.textSecondary,
                onPermissionDecision: widget.onPermissionDecision,
                onDismiss: (id) => setState(() => _dismissedPermissionId = id),
              ),
              StickyQuestionDock(
                activeQuestion: StickyQuestionDock.getActiveQuestion(widget.messages,
                    dismissedQuestionId: _dismissedQuestionId),
                isDark: widget.isDark,
                borderColor: widget.borderColor,
                textPrimary: widget.textPrimary,
                textSecondary: widget.textSecondary,
                onQuestionReplied: widget.onQuestionReplied,
                onDismiss: (id) => setState(() => _dismissedQuestionId = id),
              ),


              // ── Queued Prompts Dock ───────────────────────────────────────
              if (_queuedPrompts.isNotEmpty)
                ChatQueuedPromptsDock(
                  queuedPrompts: _queuedPrompts,
                  isDark: widget.isDark,
                  cardBg: widget.cardBg,
                  borderColor: widget.borderColor,
                  textPrimary: widget.textPrimary,
                  textSecondary: widget.textSecondary,
                  onManage: () => _openQueuedPromptsManager(context),
                  onClearAll: () => setState(() => _queuedPrompts.clear()),
                ),

              // ── Transparent Floating Glass Prompt Bar ─────────────────────
              _buildPromptBar(currentSandbox, sandboxColor, backgroundTasks),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Private Build Helpers ───────────────────────────────────────────────────

  List<ChatMessageModel> get _coalescedMessages => ChatMessageModel.coalesceList(widget.messages);

  Widget _buildMessageList() {
    final messages = _coalescedMessages;
    if (messages.isEmpty) {
      return ChatEmptyView(
        textPrimary: widget.textPrimary,
        textSecondary: widget.textSecondary,
        isDark: widget.isDark,
        cardBg: widget.cardBg,
        borderColor: widget.borderColor,
        vpsWorkspacePath: widget.vpsWorkspacePath,
        selectedModel: widget.selectedModel,
        onNewSession: widget.onNewSession,
        onSelectPrompt: (p) {
          _promptController.text = p;
          _promptController.selection = TextSelection.fromPosition(TextPosition(offset: p.length));
        },
      );
    }
    return RefreshIndicator(
      onRefresh: _fetchDynamicAiSuggestions,
      child: ListView.builder(
        controller: _scrollController,
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 145),
        itemCount: messages.length + (_isLoadingMoreHistory ? 1 : 0),
        itemBuilder: (ctx, idx) => _buildMessageItem(ctx, idx, messages),
      ),
    );
  }

  Widget _buildMessageItem(BuildContext ctx, int idx, List<ChatMessageModel> messages) {
    if (_isLoadingMoreHistory && idx == 0) {
      return ChatLoadingHistoryIndicator(textSecondary: widget.textSecondary);
    }
    final msgIdx = _isLoadingMoreHistory ? idx - 1 : idx;
    final msg = messages[msgIdx];

    // Only filter internal engine compaction continue prompts or internal tool messages
    if (msg.sender == 'user') {
      final trimmed = msg.text.trim();
      final bool isEngineInternalPrompt = msg.isCompaction ||
          trimmed.startsWith('<command_result') ||
          trimmed.startsWith('<tool_result') ||
          trimmed.startsWith('<task_progress') ||
          trimmed.startsWith('<timer_notification') ||
          trimmed.startsWith('<task_result') ||
          trimmed.startsWith('<task_status') ||
          trimmed.startsWith('<synthetic_prompt') ||
          (trimmed.startsWith('<task') && trimmed.contains('state='));
      if (isEngineInternalPrompt) {
        return const SizedBox.shrink();
      }
    } else if (msg.sender == 'tool' && msg.text.trim().isEmpty && msg.parts.isEmpty) {
      return const SizedBox.shrink();
    }

    return ValueListenableBuilder<AvaUserProfile?>(
      valueListenable: widget.agentCoreService.userProfileNotifier,
      builder: (context, userProfile, _) => FormattedMessageView(
        message: msg,
        isDark: widget.isDark,
        cardBg: widget.cardBg,
        borderColor: widget.borderColor,
        textPrimary: widget.textPrimary,
        textSecondary: widget.textSecondary,
        baseUrl: widget.agentCoreService.baseUrl,
        agentCoreService: widget.agentCoreService,
        userAvatar: userProfile?.avatar,
        onQuestionReplied: widget.onQuestionReplied,
        onPermissionDecision: widget.onPermissionDecision,
        onOpenFile: widget.onOpenFile,
        onOpenSession: (sessionId) => widget.onSelectSession?.call({'id': sessionId}),
        onRetry: msg.sender == 'user'
            ? () => widget.onSendPrompt(msg.text, attachments: msg.attachments)
            : null,
        onOptionSelected: (answer) {
          _promptController.text = answer;
          _handleSend();
        },
      ),
    );
  }


  Widget _buildPromptBar(
      Map<String, dynamic> currentSandbox, Color sandboxColor, List<BackgroundTaskItem> backgroundTasks) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
      decoration: const BoxDecoration(
        color: Colors.transparent,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Sticky Background Task Bar docked right above prompt composer ────────
          if (backgroundTasks.any((t) => t.isRunning))
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: BackgroundTaskStickyWidget(
                tasks: backgroundTasks.where((t) => t.isRunning).toList(),
                isDark: widget.isDark,
                cardBg: widget.cardBg,
                borderColor: widget.borderColor,
                textPrimary: widget.textPrimary,
                textSecondary: widget.textSecondary,
                onCancel: _handleKillBackgroundTask,
                onDismiss: (taskId) {
                  setState(() {
                    _locallyCancelledTaskIds.add(taskId);
                    if (taskId.contains('/')) {
                      _locallyCancelledTaskIds.add(taskId.split('/').last);
                    }
                  });
                },
              ),
            ),
          Stack(
            clipBehavior: Clip.none,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                    decoration: BoxDecoration(
                      color: PromptTheme.cardBg(widget.isDark),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: PromptTheme.borderColor(widget.isDark),
                        width: 1.0,
                      ),
                      boxShadow: PromptTheme.promptCardShadow(widget.isDark),
                    ),
                    child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Attached files row
                    ChatAttachedFilesRow(
                      attachedFiles: _attachedFiles,
                      agentCoreService: widget.agentCoreService,
                      cardBg: widget.cardBg,
                      borderColor: widget.borderColor,
                      textPrimary: widget.textPrimary,
                      textSecondary: widget.textSecondary,
                      isDark: widget.isDark,
                      onRemove: (path) => setState(() => _attachedFiles.remove(path)),
                    ),

                    // Text input
                    Focus(
                      onKeyEvent: _handlePromptKeyEvent,
                      child: TextField(
                        controller: _promptController,
                        focusNode: _promptFocusNode,
                        style: TextStyle(
                          fontSize: 14.5,
                          color: widget.textPrimary,
                          fontFamily: 'HindSiliguri',
                          fontFamilyFallback: kBanglaFontFamilyFallback,
                        ),
                        maxLines: 6,
                        minLines: 1,
                        keyboardType: TextInputType.multiline,
                        textInputAction: TextInputAction.newline,
                        decoration: InputDecoration(
                          hintText: 'Message AvA (e.g. check status, run tasks, edit code)...',
                          hintStyle: TextStyle(
                            fontSize: 13.5,
                            color: widget.isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                            fontFamily: 'HindSiliguri',
                            fontFamilyFallback: kBanglaFontFamilyFallback,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                        ),
                        onChanged: _onPromptTextChanged,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Bottom Action row (Doc layout: [+] [Tools] [Sandbox] ... [Mic] [Send])
                    Row(
                      children: [
                        // Attach Files (+)
                        Tooltip(
                          message: 'Attach image or file',
                          child: InkWell(
                            onTap: () => _showAddFilesMenu(context),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: PromptTheme.buttonBg(widget.isDark),
                              ),
                              child: _isUploadingDeviceFile
                                  ? const Center(
                                      child: SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Color(0xFF6366F1),
                                        ),
                                      ),
                                    )
                                  : Icon(
                                      LucideIcons.plus,
                                      size: 18,
                                      color: widget.textPrimary,
                                    ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 7),

                        // Tools / Action Menu Pill
                        Tooltip(
                          message: 'Explore Tools',
                          child: InkWell(
                            onTap: () => _showPromptThreeDotMenu(context),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              height: 32,
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              decoration: BoxDecoration(
                                color: PromptTheme.buttonBg(widget.isDark),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    LucideIcons.settings2,
                                    size: 15,
                                    color: widget.textPrimary,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    'Tools',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      color: widget.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 7),

                        // Sandbox mode pill
                        ChatSandboxPill(
                          currentOption: currentSandbox,
                          badgeColor: sandboxColor,
                          isDark: widget.isDark,
                          onTap: () => _showSandboxModeModal(context),
                        ),
                        const Spacer(),

                        // Voice input button (Direct audio recording)
                        Tooltip(
                          message: 'Record voice',
                          child: ChatVoiceInputButton(
                            isRecording: _isRecordingVoice,
                            recordingDurationText: _isRecordingVoice
                                ? '${(_recordingSeconds ~/ 60).toString().padLeft(2, '0')}:${(_recordingSeconds % 60).toString().padLeft(2, '0')}'
                                : null,
                            borderColor: widget.borderColor,
                            textSecondary: widget.textPrimary,
                            isDark: widget.isDark,
                            onTap: _toggleVoiceInput,
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Send / Stop / Queue button
                        Builder(
                          builder: (ctx) {
                            final bool hasTypedContent =
                                _promptController.text.trim().isNotEmpty || _attachedFiles.isNotEmpty;
                            final bool hasActiveTurn =
                                _isSending || widget.messages.any((m) => m.isPending);
                            final bool showStopButton = hasActiveTurn && !hasTypedContent;

                            final Color btnBg = showStopButton
                                ? const Color(0xFFEF4444)
                                : (hasTypedContent
                                    ? (widget.isDark ? Colors.white : Colors.black)
                                    : (widget.isDark ? const Color(0xFF515151) : const Color(0xFFE5E7EB)));
                            final Color iconColor = showStopButton
                                ? Colors.white
                                : (hasTypedContent
                                    ? (widget.isDark ? Colors.black : Colors.white)
                                    : (widget.isDark ? const Color(0xFF9E9E9E) : const Color(0xFF9CA3AF)));

                            return Tooltip(
                              message: showStopButton
                                  ? 'Stop agent'
                                  : (hasActiveTurn ? 'Queue prompt' : 'Send message'),
                              child: InkWell(
                                onTap: showStopButton ? _handleInterrupt : _handleSend,
                                borderRadius: BorderRadius.circular(20),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: btnBg,
                                    boxShadow: hasTypedContent && !showStopButton
                                        ? [
                                            BoxShadow(
                                              color: (widget.isDark ? Colors.white : Colors.black)
                                                  .withValues(alpha: 0.18),
                                              blurRadius: 6,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Center(
                                    child: showStopButton
                                        ? const Icon(LucideIcons.square, size: 12, color: Colors.white)
                                        : Icon(LucideIcons.arrowUp, size: 18, color: iconColor),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

              // Model & Reasoning badge floating at top-right of the card
              ChatModelBadge(
                currentModel: widget.selectedModel,
                reasoningEffort: _currentReasoningEffort,
                cardBg: PromptTheme.cardBg(widget.isDark),
                textSecondary: widget.textSecondary,
                isDark: widget.isDark,
                onTap: () => _showModelReasoningModal(context),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

