import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../core/network/json_rpc_client.dart';
import '../../data/models/thread_model.dart';
import '../../data/models/turn_item_model.dart';

/// Manages threads, conversation turns, streaming tokens, and live agent executions
class ThreadController extends ChangeNotifier {
  final JsonRpcClient? _rpcClient;
  final List<ThreadModel> _threads = [];
  ThreadModel? _activeThread;
  final List<TurnItemModel> _items = [];
  bool _isStreaming = false;

  List<ThreadModel> get threads => List.unmodifiable(_threads);
  ThreadModel? get activeThread => _activeThread;
  List<TurnItemModel> get items => List.unmodifiable(_items);
  bool get isStreaming => _isStreaming;

  ThreadController({JsonRpcClient? rpcClient}) : _rpcClient = rpcClient;

  Future<void> init() async {
    await loadThreadsFromApi();
  }

  Future<void> loadThreadsFromApi() async {
    final rpc = _rpcClient;
    if (rpc == null) return;
    try {
      final list = await rpc.getThreads();
      if (list != null) {
        _threads.clear();
        for (final item in list) {
          if (item is Map<String, dynamic>) {
            _threads.add(ThreadModel.fromJson(item));
          }
        }
        if (_threads.isNotEmpty) {
          _activeThread = _threads.first;
          await _loadThreadMessages(_activeThread!.id);
        } else {
          _activeThread = null;
          _items.clear();
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> _loadThreadMessages(String threadId) async {
    final rpc = _rpcClient;
    if (rpc == null) return;
    try {
      final res = await rpc.call('thread/read', {'threadId': threadId});
      if (res.isSuccess && res.result is Map<String, dynamic>) {
        final rawMessages = res.result['messages'];
        _items.clear();
        if (rawMessages is List) {
          for (final msg in rawMessages) {
            if (msg is Map<String, dynamic>) {
              final role = msg['role']?.toString() ?? 'agent';
              final content = msg['content']?.toString() ?? '';
              _items.add(
                TurnItemModel(
                  id: 'msg_${DateTime.now().millisecondsSinceEpoch}_${_items.length}',
                  type: role == 'user' ? TurnItemType.userPrompt : TurnItemType.agentMessage,
                  title: role == 'user' ? 'User' : 'AvA Agent',
                  content: content,
                  timestamp: msg['timestamp'] != null
                      ? DateTime.tryParse(msg['timestamp'].toString()) ?? DateTime.now()
                      : DateTime.now(),
                  status: ItemStatus.completed,
                ),
              );
            }
          }
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> selectThread(ThreadModel thread) async {
    _activeThread = thread;
    _items.clear();
    notifyListeners();
    await _loadThreadMessages(thread.id);
  }

  Future<void> createNewThread({
    required String title,
    String? workingDirectory,
    String? model,
    String? provider,
  }) async {
    final cleanTitle = title.trim().isEmpty ? 'New Session' : title.trim();
    final rpc = _rpcClient;

    if (rpc != null) {
      try {
        final res = await rpc.createThread(
          title: cleanTitle,
          provider: provider ?? 'antigravity',
          model: model ?? 'gemini-3.7-flash',
          workingDirectory: workingDirectory ?? '/var/www/ava-code-alpha',
        );

        if (res != null && res['thread'] is Map<String, dynamic>) {
          final created = ThreadModel.fromJson(res['thread'] as Map<String, dynamic>);
          _threads.insert(0, created);
          _activeThread = created;
          _items.clear();
          notifyListeners();
          return;
        }
      } catch (_) {}
    }

    // Local fallback creation
    final newThread = ThreadModel(
      id: 'th_${DateTime.now().millisecondsSinceEpoch}',
      title: cleanTitle,
      workingDirectory: workingDirectory ?? '/var/www/ava-code-alpha',
      model: model ?? 'gemini-3.7-flash',
      provider: provider ?? 'antigravity',
      updatedAt: DateTime.now(),
      turnCount: 0,
    );
    _threads.insert(0, newThread);
    _activeThread = newThread;
    _items.clear();
    notifyListeners();
  }

  Future<void> deleteThread(String threadId) async {
    _threads.removeWhere((t) => t.id == threadId);
    if (_activeThread?.id == threadId) {
      _activeThread = _threads.isNotEmpty ? _threads.first : null;
      _items.clear();
      if (_activeThread != null) {
        await _loadThreadMessages(_activeThread!.id);
      }
    }
    notifyListeners();

    final rpc = _rpcClient;
    if (rpc != null) {
      try {
        await rpc.deleteThread(threadId);
      } catch (_) {}
    }
  }

  /// Sends a prompt and executes turn on the server
  Future<void> sendPrompt(String prompt) async {
    if (prompt.trim().isEmpty) return;

    // Auto-create thread if none is active
    if (_activeThread == null) {
      await createNewThread(title: prompt.trim().split('\n').first);
    }

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

    // Add streaming reasoning thought indicator
    final thoughtItem = TurnItemModel(
      id: 'thg_${DateTime.now().millisecondsSinceEpoch}',
      type: TurnItemType.reasoning,
      title: 'Reasoning process',
      content: 'Dispatching turn execution to AvA Engine...',
      timestamp: DateTime.now(),
      status: ItemStatus.inProgress,
    );
    _items.add(thoughtItem);
    notifyListeners();

    // Add agent message container
    final agentMessageId = 'msg_${DateTime.now().millisecondsSinceEpoch}';
    final agentMessage = TurnItemModel(
      id: agentMessageId,
      type: TurnItemType.agentMessage,
      title: 'AvA Agent',
      content: '',
      status: ItemStatus.inProgress,
      timestamp: DateTime.now(),
    );
    _items.add(agentMessage);
    notifyListeners();

    final rpc = _rpcClient;
    final active = _activeThread;

    if (rpc != null && active != null) {
      try {
        final res = await rpc.sendTurn(
          threadId: active.id,
          prompt: prompt.trim(),
        );

        if (res != null) {
          final responseText = res['response']?.toString() ?? 'Operation completed.';
          final reasoningText = res['reasoning']?.toString();

          // Update thought
          final tIdx = _items.indexWhere((i) => i.id == thoughtItem.id);
          if (tIdx != -1) {
            _items[tIdx] = _items[tIdx].copyWith(
              content: reasoningText ?? 'Turn executed successfully.',
              status: ItemStatus.completed,
            );
          }

          // Update agent message
          final msgIdx = _items.indexWhere((i) => i.id == agentMessageId);
          if (msgIdx != -1) {
            _items[msgIdx] = _items[msgIdx].copyWith(
              content: responseText,
              status: ItemStatus.completed,
            );
          }

          // Update active thread turn count
          final thIdx = _threads.indexWhere((t) => t.id == active.id);
          if (thIdx != -1) {
            _threads[thIdx] = ThreadModel(
              id: active.id,
              title: active.title,
              workingDirectory: active.workingDirectory,
              model: res['model']?.toString() ?? active.model,
              provider: active.provider,
              updatedAt: DateTime.now(),
              turnCount: (res['turnCount'] as int?) ?? (active.turnCount + 1),
            );
            _activeThread = _threads[thIdx];
          }

          _isStreaming = false;
          notifyListeners();
          return;
        }
      } catch (err) {
        final msgIdx = _items.indexWhere((i) => i.id == agentMessageId);
        if (msgIdx != -1) {
          _items[msgIdx] = _items[msgIdx].copyWith(
            content: 'Error communicating with engine: $err',
            status: ItemStatus.failed,
          );
        }
      }
    }

    final tIdx = _items.indexWhere((i) => i.id == thoughtItem.id);
    if (tIdx != -1) {
      _items[tIdx] = _items[tIdx].copyWith(status: ItemStatus.completed);
    }
    final msgIdx = _items.indexWhere((i) => i.id == agentMessageId);
    if (msgIdx != -1) {
      _items[msgIdx] = _items[msgIdx].copyWith(status: ItemStatus.completed);
    }
    _isStreaming = false;
    notifyListeners();
  }

  void interruptTurn() {
    _isStreaming = false;
    notifyListeners();
  }
}
