import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../data/models/thread_model.dart';
import '../../data/models/turn_item_model.dart';

/// Manages threads, conversation turns, streaming tokens, and tool executions
class ThreadController extends ChangeNotifier {
  final List<ThreadModel> _threads = [];
  ThreadModel? _activeThread;
  final List<TurnItemModel> _items = [];
  bool _isStreaming = false;

  List<ThreadModel> get threads => List.unmodifiable(_threads);
  ThreadModel? get activeThread => _activeThread;
  List<TurnItemModel> get items => List.unmodifiable(_items);
  bool get isStreaming => _isStreaming;

  ThreadController() {
    _initializeDefaultThreads();
  }

  void _initializeDefaultThreads() {
    _threads.addAll([
      ThreadModel(
        id: 'th_01_core',
        title: 'AvA Code Alpha Core Architecture',
        workingDirectory: '/var/www/ava-code-alpha',
        model: 'gemini-3.7-flash-tiered',
        provider: 'antigravity',
        updatedAt: DateTime.now().subtract(const Duration(minutes: 15)),
        turnCount: 4,
      ),
      ThreadModel(
        id: 'th_02_auth',
        title: 'Flutter Native Mobile Client',
        workingDirectory: '/var/www/ava-code-alpha/apps/mobile',
        model: 'gemini-3.7-flash-tiered',
        provider: 'antigravity',
        updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
        turnCount: 7,
      ),
    ]);
    _activeThread = _threads.first;
    _loadSampleTurnItems();
  }

  void _loadSampleTurnItems() {
    _items.clear();
    _items.addAll([
      TurnItemModel(
        id: 'turn-1',
        type: TurnItemType.userPrompt,
        title: 'User Prompt',
        content: 'Configure Google Antigravity Provider and setup Flutter Mobile App for AvA Code Alpha.',
        timestamp: DateTime.now().subtract(const Duration(minutes: 12)),
      ),
      TurnItemModel(
        id: 'turn-2',
        type: TurnItemType.reasoning,
        title: 'Reasoning process',
        content: 'Analyzing AvA monorepo structure. Google Antigravity (Cloud Code PA) provider is configured with client ID 1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com. Setting up Flutter app with Clean Layered Architecture and Shadcn UI system.',
        timestamp: DateTime.now().subtract(const Duration(minutes: 11)),
      ),
      TurnItemModel(
        id: 'turn-3',
        type: TurnItemType.commandExecution,
        title: 'execute_command',
        content: 'cargo check -p codex-model-provider-info',
        secondaryContent: '   Compiling codex-model-provider-info v0.1.0\n   Finished dev [unoptimized + debuginfo] target(s) in 2.14s',
        status: ItemStatus.completed,
        timestamp: DateTime.now().subtract(const Duration(minutes: 10)),
      ),
      TurnItemModel(
        id: 'turn-4',
        type: TurnItemType.fileChange,
        title: 'Edited lib.rs',
        content: 'Registered ANTIGRAVITY_PROVIDER_ID and create_antigravity_provider()',
        secondaryContent: '@@ -638,6 +638,10 @@\n+pub const ANTIGRAVITY_PROVIDER_ID: &str = "antigravity";\n [OPENAI_PROVIDER_ID, openai_provider],\n+(ANTIGRAVITY_PROVIDER_ID, create_antigravity_provider()),',
        status: ItemStatus.completed,
        timestamp: DateTime.now().subtract(const Duration(minutes: 9)),
      ),
      TurnItemModel(
        id: 'turn-5',
        type: TurnItemType.agentMessage,
        title: 'AvA Agent',
        content: 'Google Antigravity Provider has been natively registered in `ava-rs/model-provider-info` and active model is set to `gemini-3.7-flash-tiered`. All tests passed.',
        timestamp: DateTime.now().subtract(const Duration(minutes: 8)),
      ),
    ]);
  }

  void selectThread(ThreadModel thread) {
    _activeThread = thread;
    _loadSampleTurnItems();
    notifyListeners();
  }

  void createNewThread({
    required String title,
    String? workingDirectory,
    String? model,
    String? provider,
  }) {
    final newThread = ThreadModel(
      id: 'th_${DateTime.now().millisecondsSinceEpoch}',
      title: title.isEmpty ? 'New Session' : title,
      workingDirectory: workingDirectory ?? '/var/www/ava-code-alpha',
      model: model ?? 'gemini-3.7-flash-tiered',
      provider: provider ?? 'antigravity',
      updatedAt: DateTime.now(),
      turnCount: 0,
    );
    _threads.insert(0, newThread);
    _activeThread = newThread;
    _items.clear();
    notifyListeners();
  }

  /// Sends a prompt and streams tokens simulating real-time turn execution
  Future<void> sendPrompt(String prompt) async {
    if (prompt.trim().isEmpty) return;

    final userItem = TurnItemModel(
      id: 'usr_${DateTime.now().millisecondsSinceEpoch}',
      type: TurnItemType.userPrompt,
      title: 'User',
      content: prompt.trim(),
      timestamp: DateTime.now(),
    );
    _items.add(userItem);
    _isStreaming = true;
    notifyListeners();

    // Add streaming reasoning thought
    final thoughtItem = TurnItemModel(
      id: 'thg_${DateTime.now().millisecondsSinceEpoch}',
      type: TurnItemType.reasoning,
      title: 'Reasoning process',
      content: 'Connecting to Google Antigravity (Cloud Code PA) via JSON-RPC v2...\nPlanning turn execution for request...',
      timestamp: DateTime.now(),
    );
    _items.add(thoughtItem);
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 700));

    // Add streaming agent response
    final agentMessageId = 'msg_${DateTime.now().millisecondsSinceEpoch}';
    final initialAgentMessage = TurnItemModel(
      id: agentMessageId,
      type: TurnItemType.agentMessage,
      title: 'AvA Agent',
      content: '',
      status: ItemStatus.inProgress,
      timestamp: DateTime.now(),
    );
    _items.add(initialAgentMessage);
    notifyListeners();

    final responseChunks = [
      'I am processing your instruction with **Google Antigravity** (`gemini-3.7-flash-tiered`).\n\n',
      '1. Verified native Rust engine status: **Active**\n',
      '2. Validated session authentication: `mahmudhasan`\n',
      '3. App Server JSON-RPC v2 streaming: **Connected**\n\n',
      'All systems are operational and ready for agentic execution.',
    ];

    String accumulated = '';
    for (final chunk in responseChunks) {
      await Future.delayed(const Duration(milliseconds: 250));
      accumulated += chunk;
      final idx = _items.indexWhere((i) => i.id == agentMessageId);
      if (idx != -1) {
        _items[idx] = _items[idx].copyWith(
          content: accumulated,
          status: ItemStatus.inProgress,
        );
        notifyListeners();
      }
    }

    final finalIdx = _items.indexWhere((i) => i.id == agentMessageId);
    if (finalIdx != -1) {
      _items[finalIdx] = _items[finalIdx].copyWith(status: ItemStatus.completed);
    }
    _isStreaming = false;
    notifyListeners();
  }

  void interruptTurn() {
    _isStreaming = false;
    notifyListeners();
  }
}
