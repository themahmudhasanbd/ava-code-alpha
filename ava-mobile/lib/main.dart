import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'models/app_models.dart';
import 'services/agent_core_service.dart';
import 'theme/app_theme.dart';
import 'widgets/header_bar.dart';
import 'widgets/network_status_bar.dart';
import 'config/app_config.dart';
import 'widgets/drawer_navigation.dart';
import 'widgets/main_splash_view.dart';
import 'widgets/main_tab_router.dart';
import 'screens/auth_screen.dart';
import 'screens/workspace_preference_screen.dart';
import 'services/push_notification_service.dart';
import 'services/native_agent_service.dart';
import 'widgets/permissions/permission_setup_sheet.dart';
import 'utils/app_toast.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppTheme.initTheme();
  runApp(const AvaCodeApp());
}

class AvaCodeApp extends StatelessWidget {
  const AvaCodeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AvaThemePreset>(
      valueListenable: AppTheme.currentThemeNotifier,
      builder: (context, activePreset, _) {
        return MaterialApp(
          navigatorKey: AppToast.navigatorKey,
          title: 'AvA Code',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.themeData,
          home: const MainHomeScreen(),
        );
      },
    );
  }
}

class MainHomeScreen extends StatefulWidget {
  const MainHomeScreen({super.key});

  @override
  State<MainHomeScreen> createState() => _MainHomeScreenState();
}

class _MainHomeScreenState extends State<MainHomeScreen> with WidgetsBindingObserver {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  bool _isAuthenticated = false; // Default requires authentication on startup
  bool _isCheckingSavedAuth = true; // Checking saved session in SharedPreferences
  String _serverUrl = AppConfig.defaultServerUrl;
  String _vpsWorkspacePath = AppConfig.defaultWorkspacePath;
  int _selectedNavIndex = 0; // 0: Agent Chat, 1: Files, 2: Models, 3: MCP, 4: Sessions, 5: System, 6: Settings, 7: Terminal
  String _selectedMode = 'workspace-write';
  String _reasoningEffort = 'medium';
  String _selectedAgent = 'build';

  late AvaAgentCoreService _agentCoreService;
  bool _isCoreConnected = false;
  bool _isReconnectingCore = false;

  // ─── Unique ID Generation (collision-proof prompt & turn IDs) ────────────
  static final Random _secureRandom = Random.secure();
  int _promptSequence = 0;

  /// Generates a collision-proof unique ID combining timestamp, sequence counter,
  /// and random hex suffix. Format: "msg_{timestamp}_{seq}_{hex8}"
  String _generateUniqueId() {
    _promptSequence++;
    final ts = DateTime.now().microsecondsSinceEpoch;
    final rand = _secureRandom.nextInt(0xFFFFFFFF).toRadixString(16).padLeft(8, '0');
    return 'msg_${ts}_${_promptSequence}_$rand';
  }

  List<AvaModelItem> _availableModels = [];
  AvaModelItem? _selectedModelItem;

  String? _activeSessionId;
  String? _currentSessionTitle;
  String? _pendingOpenFile;
  String? _pendingChatAttachment;

  // Clean empty initial chat messages (NO welcome greeting bubble)
  final List<ChatMessageModel> _chatMessages = [];
  bool get _isTurnRunning => _chatMessages.any((m) => m.isPending);

  // ─── Live Render Throttle (60fps coalescing for stream events) ────────────
  // Multiple SSE/poll events per frame are coalesced into a single setState
  // to avoid Markdown re-parsing storms during fast streaming (30-50 tok/s).
  Timer? _rebuildThrottleTimer;
  bool _rebuildScheduled = false;
  static const Duration _rebuildInterval = Duration(milliseconds: 16);

  /// Tracks whether the first event of a turn has been rendered immediately.
  /// First event bypasses throttling to show instant UI feedback.
  bool _firstEventReceived = false;

  /// Heartbeat timer to prevent UI freeze during active turns.
  /// Periodically refreshes UI even if SSE events stall.
  Timer? _heartbeatTimer;
  static const Duration _heartbeatInterval = Duration(milliseconds: 250);

  int _heartbeatTicksWithoutSubscription = 0;

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTicksWithoutSubscription = 0;
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (_) {
      if (!mounted || !_isTurnRunning) {
        _heartbeatTimer?.cancel();
        _heartbeatTimer = null;
        return;
      }

      // If turn is flagged running but no stream subscription is active for over 10 seconds, auto-finalize to prevent frozen UI
      if (_activePromptStreamSubscription == null && _activeSessionStreamSubscription == null) {
        _heartbeatTicksWithoutSubscription++;
        if (_heartbeatTicksWithoutSubscription > 40) { // 40 * 250ms = 10s
          _heartbeatTicksWithoutSubscription = 0;
          for (int i = 0; i < _chatMessages.length; i++) {
            if (_chatMessages[i].isPending) {
              final msg = _chatMessages[i];
              final finalizedParts = msg.parts.map((p) => p.status == 'running' ? p.copyWith(status: 'completed') : p).toList();
              final text = msg.text.trim().isNotEmpty ? msg.text : 'Response completed.';
              _chatMessages[i] = msg.copyWith(
                isPending: false,
                text: text,
                parts: finalizedParts,
              );
            }
          }
          setState(() {});
          return;
        }
      } else {
        _heartbeatTicksWithoutSubscription = 0;
      }

      setState(() {});
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  void _scheduleRebuild({bool immediate = false}) {
    if (!mounted) return;

    // First event of a turn: render immediately for instant feedback
    if (immediate && !_firstEventReceived) {
      _firstEventReceived = true;
      _rebuildThrottleTimer?.cancel();
      _rebuildScheduled = false;
      setState(() {});
      _startHeartbeat();
      return;
    }

    if (_rebuildScheduled) return;
    _rebuildScheduled = true;
    _rebuildThrottleTimer?.cancel();
    _rebuildThrottleTimer = Timer(_rebuildInterval, () {
      _rebuildScheduled = false;
      if (!mounted) return;
      setState(() {});
    });
  }

  /// Applies an update to the pending message in-place immediately and
  /// schedules a coalesced frame rebuild for high-frequency streaming events.
  void _applyPendingUpdate(String messageId, ChatMessageModel Function(ChatMessageModel current) update, {bool immediate = false}) {
    if (!mounted) return;
    final idx = _chatMessages.indexWhere((m) => m.id == messageId);
    if (idx == -1) return;
    final current = _chatMessages[idx];
    final next = update(current);
    if (identical(current, next)) return;
    _chatMessages[idx] = next;
    _scheduleRebuild(immediate: immediate);
  }

  /// For full replacement of a pending message (e.g. on `done` or error),
  /// cancels throttler and triggers immediate setState.
  void _replacePendingMessageImmediate(String messageId, ChatMessageModel replacement) {
    if (!mounted) return;
    final idx = _chatMessages.indexWhere((m) => m.id == messageId);
    if (idx == -1) return;
    _rebuildThrottleTimer?.cancel();
    _rebuildScheduled = false;
    _stopHeartbeat();
    _firstEventReceived = false;
    setState(() {
      _chatMessages[idx] = replacement;
    });
  }

  void _handleOpenFile(String filePath, {String? diffOrContent}) {
    setState(() {
      _pendingOpenFile = filePath;
    });
    _switchTab(1);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setupAgentCoreService();
    _setupPushNotifications();
    _restoreSavedAuth();
    _checkAndroidPermissions();
  }

  Future<void> _checkAndroidPermissions() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final hasPrompted = prefs.getBool('ava_permissions_prompted') ?? false;
      final perms = await NativeAgentService.instance.checkPermissions();
      final needsPrompt = perms['notifications'] != true || perms['microphone'] != true;
      if (needsPrompt && !hasPrompted && mounted) {
        await prefs.setBool('ava_permissions_prompted', true);
        Future.delayed(const Duration(milliseconds: 1400), () {
          if (mounted) {
            PermissionSetupSheet.show(
              context,
              isDark: AppTheme.isDark,
              cardBg: AppTheme.cardBg,
              borderColor: AppTheme.borderColor,
              textPrimary: AppTheme.textPrimary,
              textSecondary: AppTheme.textSecondary,
            );
          }
        });
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  List<ChatMessageModel> _mergeMessagesPreservingLocal(List<ChatMessageModel> existing, List<ChatMessageModel> incoming) {
    if (incoming.isEmpty) return existing;
    if (existing.isEmpty) {
      return incoming.map((m) => m.sender == 'user' ? m.copyWith(deliveryStatus: m.deliveryStatus ?? 'sent', isPending: false) : m).toList();
    }

    final cleanExisting = existing.where((m) => m.id != 'loading-hist').toList();
    if (cleanExisting.isEmpty) {
      return incoming.map((m) => m.sender == 'user' ? m.copyWith(deliveryStatus: m.deliveryStatus ?? 'sent', isPending: false) : m).toList();
    }

    final List<ChatMessageModel> incomingMerged = incoming.map((m) {
      if (m.sender == 'user') {
        return m.copyWith(deliveryStatus: m.deliveryStatus ?? 'sent', isPending: false);
      }
      return m;
    }).toList();

    bool matches(ChatMessageModel local, ChatMessageModel inc) {
      // 1. Exact ID match is always authoritative
      if (local.id.isNotEmpty && inc.id.isNotEmpty && local.id == inc.id) {
        return true;
      }
      if (local.sender != inc.sender) return false;

      // 2. Detect temporary/legacy timestamp-based IDs (pre-fix format)
      final bool localIsTemp = local.id.startsWith('pending') ||
          local.id.startsWith('active') ||
          local.id.startsWith('user_') ||
          RegExp(r'^\d{10,}$').hasMatch(local.id);
      final bool incIsTemp = inc.id.startsWith('pending') ||
          inc.id.startsWith('active') ||
          inc.id.startsWith('user_') ||
          RegExp(r'^\d{10,}$').hasMatch(inc.id);

      // 3. If both have real (non-temp) IDs and they differ, they are DIFFERENT messages
      if (local.id.isNotEmpty && inc.id.isNotEmpty && !localIsTemp && !incIsTemp && local.id != inc.id) {
        return false;
      }

      // 4. For user messages: match ONLY by exact text content (same prompt = same message)
      //    But do NOT merge if both have real IDs that differ (handled above)
      if (local.sender == 'user') {
        final localSanitized = sanitizeUserDisplayText(local.text).trim();
        final incSanitized = sanitizeUserDisplayText(inc.text).trim();
        if (localSanitized.isNotEmpty && incSanitized.isNotEmpty && localSanitized == incSanitized) return true;
        if (local.text.trim().isNotEmpty && inc.text.trim().isNotEmpty && local.text.trim() == inc.text.trim()) return true;
        // Different text = different messages (never merge)
        return false;
      }

      // 5. For agent messages: match by parentId first (links agent turn to its user prompt)
      if (local.sender == 'agent') {
        if (local.parentId != null && inc.parentId != null &&
            local.parentId!.isNotEmpty && local.parentId == inc.parentId) {
          return true;
        }
        // Fallback: text containment only for temp IDs
        final localTxt = local.text.trim();
        final incTxt = inc.text.trim();
        if (localIsTemp && localTxt.isNotEmpty && incTxt.isNotEmpty &&
            (localTxt == incTxt || localTxt.contains(incTxt) || incTxt.contains(localTxt))) {
          return true;
        }
        // Both have real IDs and different parentId — they are different turns
        if (!localIsTemp && !incIsTemp) return false;
      }
      return false;
    }

    // 1. Enrich incoming messages with local timeline events, questions, permissions, and reasoning
    for (int i = 0; i < incomingMerged.length; i++) {
      final inc = incomingMerged[i];
      final matchIdx = cleanExisting.indexWhere((e) => matches(e, inc));
      if (matchIdx != -1) {
        final local = cleanExisting[matchIdx];
        incomingMerged[i] = inc.copyWith(
          timelineEvents: inc.timelineEvents.isNotEmpty ? inc.timelineEvents : local.timelineEvents,
          questionData: inc.questionData ?? local.questionData,
          permissionData: inc.permissionData ?? local.permissionData,
          reasoningText: (inc.reasoningText != null && inc.reasoningText!.isNotEmpty) ? inc.reasoningText : local.reasoningText,
          attachments: inc.attachments.isNotEmpty ? inc.attachments : local.attachments,
          deliveryStatus: local.deliveryStatus ?? inc.deliveryStatus ?? 'sent',
        );
      }
    }

    // 2. Build aligned chronological sequence starting from cleanExisting order
    final List<ChatMessageModel> result = [];
    int incomingCursor = 0;

    for (int i = 0; i < cleanExisting.length; i++) {
      final local = cleanExisting[i];
      final incIdx = incomingMerged.indexWhere((inc) => matches(local, inc));

      if (incIdx != -1) {
        while (incomingCursor < incIdx) {
          if (!result.any((m) => matches(m, incomingMerged[incomingCursor]))) {
            result.add(incomingMerged[incomingCursor]);
          }
          incomingCursor++;
        }
        result.add(incomingMerged[incIdx]);
        incomingCursor = incIdx + 1;
      } else {
        // Keep local message in its exact chronological position (failed prompts, active streams, un-synced user messages)
        if (local.sender == 'user') {
          final isActivelyStreaming = _currentlyStreamingPendingId != null && _activePromptStreamSubscription != null;
          if (isActivelyStreaming) {
            result.add(local);
          } else {
            final status = local.deliveryStatus == 'failed' ? 'failed' : (local.deliveryStatus ?? 'sent');
            result.add(local.copyWith(deliveryStatus: status, isPending: false));
          }
        } else {
          if (local.isPending) {
            final isActivelyStreaming = _currentlyStreamingPendingId == local.id && _activePromptStreamSubscription != null;
            if (isActivelyStreaming) {
              result.add(local);
            }
          } else if (local.text.trim().isNotEmpty || local.parts.isNotEmpty || local.isError) {
            result.add(local);
          }
        }
      }
    }

    // Append any trailing incoming messages from server
    while (incomingCursor < incomingMerged.length) {
      if (!result.any((m) => matches(m, incomingMerged[incomingCursor]))) {
        result.add(incomingMerged[incomingCursor]);
      }
      incomingCursor++;
    }

    // Deduplicate by ID — if two messages share the same ID, keep the one with more content
    final Map<String, ChatMessageModel> dedupedById = {};
    for (final msg in result) {
      if (msg.id.isEmpty) {
        dedupedById['_${dedupedById.length}'] = msg;
        continue;
      }
      final existing = dedupedById[msg.id];
      if (existing == null) {
        dedupedById[msg.id] = msg;
      } else {
        // Keep the one with more content or the one that's not pending
        final existingLen = existing.text.length + existing.parts.length;
        final newLen = msg.text.length + msg.parts.length;
        if (newLen > existingLen || (msg.isError && !existing.isError)) {
          dedupedById[msg.id] = msg;
        }
      }
    }
    final deduped = dedupedById.values.toList();

    return ChatMessageModel.coalesceList(deduped);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      // 1. Immediately indicate smooth syncing state on app resume
      if (_agentCoreService.connectionStatusNotifier.value != CoreConnectionStatus.connected) {
        _agentCoreService.connectionStatusNotifier.value = CoreConnectionStatus.syncing;
      }

      // 2. Eagerly reconnect WebSocket / Core channel and check health
      _agentCoreService.ensureSseConnected();
      _agentCoreService.checkHealth().then((isHealthy) {
        if (mounted && isHealthy) {
          setState(() {
            _isCoreConnected = true;
          });
        }
      });

      if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
        final currentSessId = _activeSessionId!;
        // 1. Do NOT disrupt or overwrite active in-flight prompt stream!
        final bool isActivelyStreaming = _currentlyStreamingPendingId != null && _activePromptStreamSubscription != null;
        if (isActivelyStreaming) return;

        // 2. Fetch latest session state in background only when idle
        _agentCoreService.fetchSessionMessages(currentSessId).then((historyResult) {
          if (!mounted || _activeSessionId != currentSessId) return;
          if (_currentlyStreamingPendingId != null && _activePromptStreamSubscription != null) return;
          final historyMsgs = (historyResult['messages'] as List<ChatMessageModel>?) ?? [];
          if (historyMsgs.isNotEmpty) {
            setState(() {
              final merged = _mergeMessagesPreservingLocal(_chatMessages, historyMsgs);
              _chatMessages.clear();
              _chatMessages.addAll(merged);
            });
            unawaited(_agentCoreService.saveSessionMessagesToCache(currentSessId, _chatMessages));
          }
        }).catchError((_) {});

        // 3. Eagerly check if the server is still running a turn
        _agentCoreService.isSessionActive(currentSessId).then((isRunning) {
          if (!mounted || _activeSessionId != currentSessId) return;
          if (isRunning && _activeSessionStreamSubscription == null && _activePromptStreamSubscription == null) {
            _attachToActiveSessionExecution(currentSessId);
          }
        }).catchError((_) {});
      }
    }
  }

  void _setupPushNotifications() {
    if (kIsWeb) return;
    // Initialize native layer first (registers MethodChannel handler)
    NativeAgentService.instance.initialize();
    NativeAgentService.instance.onBootRestore = (sessionId) {
      debugPrint('[Main] Boot restore: resuming session $sessionId');
      _handleSelectSession({'id': sessionId});
      _switchTab(0);
    };

    PushNotificationService.instance.initialize(agentService: _agentCoreService);
    PushNotificationService.instance.onSessionNotificationTapped = (sessionId) {
      if (sessionId.isNotEmpty) {
        _handleSelectSession({'id': sessionId});
        _switchTab(0);
      }
    };
    PushNotificationService.instance.latestNotificationNotifier
        .addListener(_onAgentExecutionNotificationReceived);

    // Sync server URL to native so debug logger can POST errors
    unawaited(NativeAgentService.instance.saveServerUrl(_serverUrl));
  }

  void _onAgentExecutionNotificationReceived() {
    final notif = PushNotificationService.instance.latestNotificationNotifier.value;
    if (notif == null || !mounted) return;
    final status = notif['status']?.toString() ?? 'success';
    final isError = status == 'error';
    final sessionId = notif['sessionId']?.toString() ?? '';

    AppToast.show(
      context,
      notif['body'] ?? '',
      title: notif['title'] ?? 'Agent Finished',
      type: isError ? ToastType.error : ToastType.success,
      actionLabel: sessionId.isNotEmpty ? 'View' : null,
      onAction: sessionId.isNotEmpty
          ? () {
              _handleSelectSession({'id': sessionId});
              _switchTab(0);
            }
          : null,
      duration: const Duration(seconds: 4),
    );
  }

  AvaModelItem? _findModelByIdOrName(dynamic query, {List<AvaModelItem>? models}) {
    if (query == null) return null;
    final list = models ?? _availableModels;
    if (list.isEmpty) return null;

    if (query is AvaModelItem) return query;

    String clean = '';
    String? explicitProvider;
    String? explicitModel;

    if (query is Map) {
      explicitProvider = query['providerID']?.toString() ?? query['provider']?.toString();
      explicitModel = query['modelID']?.toString() ?? query['id']?.toString() ?? query['model']?.toString() ?? query['name']?.toString();
      clean = (explicitModel ?? query.toString()).trim().toLowerCase();
    } else {
      final raw = query.toString().trim();
      if (raw.isEmpty) return null;
      if (raw.startsWith('{') && raw.endsWith('}')) {
        final idMatch = RegExp(r'(?:id|model|modelID)\s*:\s*([^,}]+)', caseSensitive: false).firstMatch(raw);
        final provMatch = RegExp(r'(?:providerID|provider)\s*:\s*([^,}]+)', caseSensitive: false).firstMatch(raw);
        if (idMatch != null) explicitModel = idMatch.group(1)?.trim();
        if (provMatch != null) explicitProvider = provMatch.group(1)?.trim();
        clean = (explicitModel ?? raw).trim().toLowerCase();
      } else {
        if (raw.startsWith("omniroute/") || raw.startsWith("custom/") || raw.startsWith("openai/") || raw.startsWith("anthropic/")) {
          final parts = raw.split("/");
          if (parts.length >= 2) {
            explicitProvider = parts[0].trim();
            explicitModel = parts.sublist(1).join("/").trim();
          }
        }
        clean = raw.toLowerCase();
      }
    }

    if (clean.isEmpty) return null;

    // 0. If explicit provider and model are known, match exact provider & model
    if (explicitProvider != null && explicitModel != null) {
      final expProv = explicitProvider.toLowerCase();
      final expMod = explicitModel.toLowerCase();
      for (final m in list) {
        final p = m.effectiveProviderKey.toLowerCase();
        final id = m.id.toLowerCase();
        final key = m.effectiveModelKey.toLowerCase();
        if (p == expProv && (id == expMod || key == expMod || id.endsWith('/$expMod') || id == '$expProv/$expMod' || key == '$expProv/$expMod')) {
          return m;
        }
      }
    }

    // 1. Exact ID match
    for (final m in list) {
      if (m.id.toLowerCase() == clean) return m;
    }
    // 2. Exact modelKey match
    for (final m in list) {
      if (m.modelKey.toLowerCase() == clean || m.effectiveModelKey.toLowerCase() == clean) return m;
    }
    // 3. Exact full provider/modelKey match
    for (final m in list) {
      final full = '${m.effectiveProviderKey}/${m.effectiveModelKey}'.toLowerCase();
      if (full == clean) return m;
    }
    // 4. Exact Name match
    for (final m in list) {
      if (m.name.toLowerCase() == clean) return m;
    }
    // 5. Ends with /clean
    for (final m in list) {
      if (m.id.toLowerCase().endsWith('/$clean') || m.effectiveModelKey.toLowerCase() == clean) {
        return m;
      }
    }
    // 6. Partial Name / ID / key match
    for (final m in list) {
      final idLower = m.id.toLowerCase();
      final keyLower = m.modelKey.toLowerCase();
      final nameLower = m.name.toLowerCase();
      if (idLower.contains(clean) || clean.contains(idLower) ||
          keyLower.contains(clean) || clean.contains(keyLower) ||
          nameLower.contains(clean) || clean.contains(nameLower)) {
        return m;
      }
    }
    return null;
  }

  AvaModelItem _createOrFindModel(dynamic query, {List<AvaModelItem>? models}) {
    final found = _findModelByIdOrName(query, models: models);
    if (found != null) return found;
    if (query is AvaModelItem) return query;
    if (query != null && query.toString().trim().isNotEmpty) {
      final raw = query.toString().trim();
      String pKey = "omniroute";
      String mKey = raw;
      String name = raw;
      if (query is Map) {
        pKey = query["providerID"]?.toString() ?? query["provider"]?.toString() ?? "omniroute";
        mKey = query["modelID"]?.toString() ?? query["id"]?.toString() ?? query["model"]?.toString() ?? raw;
        name = query["name"]?.toString() ?? mKey;
      } else if (raw.startsWith("omniroute/")) {
        pKey = "omniroute";
        mKey = raw.substring("omniroute/".length);
        name = mKey;
      } else if (raw.startsWith("custom/")) {
        pKey = "custom";
        mKey = raw.substring("custom/".length);
        name = mKey;
      } else if (raw.startsWith("openai/")) {
        pKey = "openai";
        mKey = raw.substring("openai/".length);
        name = mKey;
      } else if (raw.startsWith("anthropic/")) {
        pKey = "anthropic";
        mKey = raw.substring("anthropic/".length);
        name = mKey;
      } else {
        pKey = "omniroute";
        mKey = raw;
        name = raw;
      }
      return AvaModelItem(
        id: raw.startsWith("${pKey}/") ? raw : (pKey == "omniroute" ? raw : "${pKey}/${mKey}"),
        name: name,
        provider: pKey,
        providerKey: pKey,
        modelKey: mKey,
      );
    }
    final list = models ?? _availableModels;
    return list.isNotEmpty
        ? list.first
        : (AvaAgentCoreService.defaultModelList.isNotEmpty
            ? AvaAgentCoreService.defaultModelList.first
            : const AvaModelItem(
                id: "ultra-working-combo",
                name: "Ultra Working Combo",
                provider: "omniroute",
              ));
  }

  Future<AvaModelItem?> _resolveDefaultModel({List<AvaModelItem>? models}) async {
    final list = models ?? _availableModels;
    if (list.isEmpty) return null;

    final prefs = await SharedPreferences.getInstance();
    final savedDefaultId = prefs.getString('ava_default_model_id');
    if (savedDefaultId != null && savedDefaultId.isNotEmpty) {
      final m = _findModelByIdOrName(savedDefaultId, models: list);
      if (m != null) return m;
    }

    final cachedModelsData = await _agentCoreService.loadModelsFromCache();
    final cachedDefId = cachedModelsData?['defaultModelId']?.toString();
    if (cachedDefId != null && cachedDefId.isNotEmpty) {
      final m = _findModelByIdOrName(cachedDefId, models: list);
      if (m != null) return m;
    }

    final cachedSettings = await _agentCoreService.loadSettingsFromCache();
    final settingsModel = cachedSettings?['model']?.toString();
    if (settingsModel != null && settingsModel.isNotEmpty) {
      final m = _findModelByIdOrName(settingsModel, models: list);
      if (m != null) return m;
    }

    return _findModelByIdOrName("ultra-working-combo", models: list) ??
           _findModelByIdOrName("ultra-coding-combo", models: list) ??
           _findModelByIdOrName("powerful-coding-combo", models: list) ??
           _findModelByIdOrName("omni-codex-combo", models: list) ??
           _findModelByIdOrName("auto/best-coding", models: list) ??
           _findModelByIdOrName("gpt-6-astra", models: list) ??
           list.first;
  }

  String? _extractLastUsedModelFromMessages(List<ChatMessageModel> messages) {
    if (messages.isEmpty) return null;
    for (int i = messages.length - 1; i >= 0; i--) {
      final msg = messages[i];
      if (msg.modelName != null &&
          msg.modelName!.isNotEmpty &&
          msg.modelName != 'Session Manager' &&
          msg.modelName != 'compaction' &&
          msg.modelName != 'AvA Assistant' &&
          !msg.modelName!.startsWith('Loading history')) {
        return msg.modelName;
      }
    }
    return null;
  }

  Future<void> _restoreSavedAuth() async {
    // Fail-safe timer to guarantee UI never gets stuck in splash/loading state
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted && _isCheckingSavedAuth) {
        setState(() => _isCheckingSavedAuth = false);
      }
    });

    try {
      final prefs = await SharedPreferences.getInstance().timeout(const Duration(milliseconds: 800));
      final secureStorage = const FlutterSecureStorage();
      
      final isAuth = prefs.getBool('ava_is_authenticated') ?? false;
      final email = await secureStorage
              .read(key: 'ava_auth_email')
              .timeout(const Duration(milliseconds: 600), onTimeout: () => null) ??
          prefs.getString('ava_auth_email');
      final password = await secureStorage
              .read(key: 'ava_auth_password')
              .timeout(const Duration(milliseconds: 600), onTimeout: () => null) ??
          prefs.getString('ava_auth_password');
      final token = await secureStorage
              .read(key: 'ava_auth_token')
              .timeout(const Duration(milliseconds: 600), onTimeout: () => null) ??
          prefs.getString('ava_auth_token');

      final savedWs = prefs.getString('ava_selected_workspace');
      if (savedWs != null && savedWs.isNotEmpty) {
        _vpsWorkspacePath = savedWs;
        _agentCoreService.setWorkspacePath(savedWs);
      }
      final savedEffort = prefs.getString('ava_reasoning_effort');
      if (savedEffort != null && savedEffort.isNotEmpty) {
        _reasoningEffort = savedEffort;
      }

      final savedSessId = prefs.getString('ava_last_active_session_id');
      List<ChatMessageModel> cachedMsgs = [];
      if (savedSessId != null && savedSessId.isNotEmpty) {
        _activeSessionId = savedSessId;
        _agentCoreService.setLastActiveSessionId(savedSessId);
        // Immediately load cached messages from local storage (0ms wait)
        try {
          cachedMsgs = await _agentCoreService
              .loadSessionMessagesFromCache(savedSessId)
              .timeout(const Duration(milliseconds: 800), onTimeout: () => []);
          if (mounted && cachedMsgs.isNotEmpty) {
            setState(() {
              _chatMessages.clear();
              _chatMessages.addAll(cachedMsgs);
            });
          }
        } catch (e) { print('Ignored error: $e'); }
        // Also fetch session details to ensure workspace path & model are synchronized
        unawaited(_agentCoreService.fetchSession(savedSessId).then((sess) {
          if (sess != null && mounted) {
            final sessModel = sess['model'] ?? (sess['data'] is Map ? sess['data']['model'] : null);
            if (sessModel != null) {
              final m = _createOrFindModel(sessModel, models: _availableModels);
              setState(() => _selectedModelItem = m);
              prefs.setString('ava_session_model_$savedSessId', m.id);
              prefs.setString('ava_last_selected_model_id', m.id);
            }
            final dir = (sess['directory'] ??
                    sess['workspacePath'] ??
                    (sess['location'] is Map ? sess['location']['directory'] : null) ??
                    (sess['project'] is Map ? sess['project']['worktree'] : null) ??
                    '')
                .toString()
                .trim();
            if (dir.isNotEmpty && dir != '/' && dir != '/root' && dir != _vpsWorkspacePath) {
              setState(() {
                _vpsWorkspacePath = dir;
                _agentCoreService.setWorkspacePath(dir);
              });
              prefs.setString('ava_selected_workspace', dir);
            }
          }
        }).catchError((_) {}));
      }

      // ── Eagerly load cached models & session-specific model before network resolves ──
      try {
        final cachedModelsData = await _agentCoreService
            .loadModelsFromCache()
            .timeout(const Duration(milliseconds: 600), onTimeout: () => null);
        if (cachedModelsData != null && cachedModelsData['models'] is List) {
          final list = (cachedModelsData['models'] as List)
              .map((e) => AvaModelItem.fromJson(Map<String, dynamic>.from(e)))
              .toList();
          if (list.isNotEmpty && mounted) {
            String? targetQuery;
            bool isExplicitSessionChoice = false;
            if (savedSessId != null && savedSessId.isNotEmpty) {
              final sModel = prefs.getString('ava_session_model_$savedSessId');
              if (sModel != null && sModel.isNotEmpty) {
                targetQuery = sModel;
                isExplicitSessionChoice = true;
              } else {
                final extracted = _extractLastUsedModelFromMessages(cachedMsgs);
                if (extracted != null && extracted.isNotEmpty) {
                  targetQuery = extracted;
                  isExplicitSessionChoice = true;
                }
              }
            }
            if (targetQuery == null || targetQuery.isEmpty) {
              final lastSelected = prefs.getString('ava_last_selected_model_id');
              if (lastSelected != null && lastSelected.isNotEmpty) {
                targetQuery = lastSelected;
                isExplicitSessionChoice = true;
              }
            }
            targetQuery ??= cachedModelsData['defaultModelId']?.toString();
            targetQuery ??= list.first.id;

            final chosen = _createOrFindModel(targetQuery, models: list);

            setState(() {
              _availableModels = list;
              _selectedModelItem = chosen;
            });
            if (savedSessId != null && savedSessId.isNotEmpty && isExplicitSessionChoice) {
              unawaited(prefs.setString('ava_session_model_$savedSessId', chosen.id));
            }
          }
        }
      } catch (e) { print('Ignored error: $e'); }

      // ── Eagerly load cached settings before network resolves ──
      try {
        final cachedSettings = await _agentCoreService
            .loadSettingsFromCache()
            .timeout(const Duration(milliseconds: 600), onTimeout: () => null);
        if (cachedSettings != null) {
          if (cachedSettings['default_agent'] != null) {
            _selectedAgent = cachedSettings['default_agent'].toString();
          }
        }
      } catch (e) { print('Ignored error: $e'); }

      if (isAuth && ((email != null && password != null) || token != null)) {
        if (email != null && password != null) {
          _agentCoreService.setAuthCredentials(email, password);
        } else if (token != null) {
          _agentCoreService.setAuthToken(token);
        }
        if (mounted) {
          setState(() {
            _isAuthenticated = true;
            _isCheckingSavedAuth = false;
          });
        }
        await _initializeAgentCoreConnection();
        return;
      }
    } catch (e) { print('Ignored error: $e'); }

    if (mounted) {
      setState(() {
        _isAuthenticated = false;
        _isCheckingSavedAuth = false;
      });
    }
  }

  void _setupAgentCoreService() {
    _agentCoreService = AvaAgentCoreService(
      baseUrl: _serverUrl,
      workspacePath: _vpsWorkspacePath,
    );
    _isCoreConnected = _agentCoreService.isConnectedNotifier.value;
    _agentCoreService.isConnectedNotifier.addListener(_onCoreConnectionStateChanged);
    _globalEventStreamSubscription?.cancel();
    _globalEventStreamSubscription = _agentCoreService.eventStream.listen(_handleGlobalEngineEvent);
    _activeSessionPollTimer?.cancel();
    _activeSessionPollTimer = null;
    _initializeAgentCoreConnection();
  }

  void _onCoreConnectionStateChanged() {
    if (mounted) {
      final connected = _agentCoreService.isConnectedNotifier.value;
      if (_isCoreConnected != connected) {
        setState(() {
          _isCoreConnected = connected;
        });
      }
      if (connected) {
        PushNotificationService.instance.syncTokenWithService(_agentCoreService);

        // Post-reconnect active turn recovery:
        // If we had an active turn when the connection dropped, the server may have
        // already completed it while we were disconnected. Poll the session to sync.
        if (_currentlyStreamingPendingId != null && _activeSessionId != null && _activeSessionId!.isNotEmpty) {
          _recoverActiveTurnAfterReconnect(_activeSessionId!);
        }
      }
    }
  }

  /// After WebSocket reconnection, check if the active turn completed server-side
  /// while we were disconnected. If so, sync the final state to the UI.
  Future<void> _recoverActiveTurnAfterReconnect(String sessId) async {
    try {
      // Give the server a moment to send any queued events on the new connection
      await Future.delayed(const Duration(milliseconds: 800));
      if (!mounted || _activeSessionId != sessId) return;

      // If the stream is still flowing (we received events after reconnect), no recovery needed
      if (_firstEventReceived) return;

      // Fetch latest session messages from server
      final res = await _agentCoreService.fetchSessionMessages(sessId, limit: 100);
      if (!mounted || _activeSessionId != sessId) return;

      final serverMsgs = (res['messages'] as List<ChatMessageModel>?) ?? [];
      if (serverMsgs.isEmpty) return;

      // Check if the last server message indicates the turn completed
      final lastServerMsg = serverMsgs.last;
      final pendingIdx = _chatMessages.indexWhere((m) => m.id == _currentlyStreamingPendingId);

      // If the server has a newer agent message (not pending), the turn completed while we were disconnected
      if (!lastServerMsg.isPending && lastServerMsg.sender == 'agent' && pendingIdx != -1) {
        final currentPending = _chatMessages[pendingIdx];
        // Only finalize if our local message is still pending
        if (currentPending.isPending) {
          final merged = _mergeMessagesPreservingLocal(_chatMessages, serverMsgs);
          setState(() {
            _chatMessages.clear();
            _chatMessages.addAll(merged);
          });
          _currentlyStreamingPendingId = null;
          _activePromptStreamSubscription?.cancel();
          _activePromptStreamSubscription = null;
          _stopHeartbeat();
          _firstEventReceived = false;

          unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, _chatMessages));
          unawaited(PushNotificationService.instance.finishOngoingTurnNotification(
            sessionId: sessId,
            isSuccess: !lastServerMsg.isError,
            completionMessage: lastServerMsg.text.isNotEmpty ? lastServerMsg.text : 'Agent turn completed.',
          ));
        }
      }
    } catch (e) {
      AgentCoreBase.addDebugLog('Active turn recovery after reconnect failed: $e');
    }
  }

  Future<void> _updateCoreService({String? newUrl, String? newPath}) async {
    final pathChanged = newPath != null && newPath.isNotEmpty && newPath != _vpsWorkspacePath;
    final urlChanged = newUrl != null && newUrl.isNotEmpty && newUrl != _serverUrl;

    if (urlChanged) {
      _serverUrl = newUrl;
      final savedToken = _agentCoreService.authToken;
      _agentCoreService.isConnectedNotifier.removeListener(_onCoreConnectionStateChanged);
      _agentCoreService.dispose();
      _agentCoreService = AvaAgentCoreService(
        baseUrl: _serverUrl,
        workspacePath: _vpsWorkspacePath,
      );
      if (savedToken != null && savedToken.isNotEmpty) {
        _agentCoreService.setAuthToken(savedToken);
      }
      _isCoreConnected = _agentCoreService.isConnectedNotifier.value;
      _agentCoreService.isConnectedNotifier.addListener(_onCoreConnectionStateChanged);
      _globalEventStreamSubscription?.cancel();
      _globalEventStreamSubscription = _agentCoreService.eventStream.listen(_handleGlobalEngineEvent);
      unawaited(_initializeAgentCoreConnection());
      PushNotificationService.instance.syncTokenWithService(_agentCoreService, force: true);
      // Keep native debug logger in sync with updated server URL
      unawaited(NativeAgentService.instance.saveServerUrl(_serverUrl));
    }

    if (pathChanged) {
      _vpsWorkspacePath = newPath;
      _agentCoreService.setWorkspacePath(newPath);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('ava_selected_workspace', newPath);

      _activeSessionStreamSubscription?.cancel();
      _activeSessionStreamSubscription = null;

      final wsSessions = await _agentCoreService.fetchSessions();
      final matchedSession = wsSessions.where((s) {
        final sDir = s['directory']?.toString() ?? s['workspacePath']?.toString() ?? '';
        return sDir == newPath || sDir.startsWith(newPath);
      }).firstOrNull;

      if (matchedSession != null && matchedSession['id'] != null) {
        final sessId = matchedSession['id'].toString();
        _setActiveSessionId(sessId);
        final cached = await _agentCoreService.loadSessionMessagesFromCache(sessId);
        if (mounted) {
          setState(() {
            _chatMessages.clear();
            if (cached.isNotEmpty) _chatMessages.addAll(cached);
          });
        }
        final historyResult = await _agentCoreService.fetchSessionMessages(sessId, limit: 100);
        final historyMsgs = (historyResult['messages'] as List<ChatMessageModel>?) ?? [];
        if (mounted && historyMsgs.isNotEmpty) {
          setState(() {
            _chatMessages.clear();
            _chatMessages.addAll(historyMsgs);
          });
          unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, historyMsgs));
        }
        final isRunning = await _agentCoreService.isSessionActive(sessId);
        if (isRunning && mounted) {
          _attachToActiveSessionExecution(sessId);
        }
      } else {
        _setActiveSessionId(null);
        if (mounted) {
          setState(() {
            _chatMessages.clear();
          });
        }
        await _handleCreateNewSession(workspacePath: newPath);
      }

      if (mounted) {
        AppToast.success(context, 'Workspace switched to $newPath');
        setState(() {});
      }
    } else if (mounted) {
      setState(() {});
    }
  }

  StreamSubscription<Map<String, dynamic>>? _activeSessionStreamSubscription;
  StreamSubscription<Map<String, dynamic>>? _activePromptStreamSubscription;
  StreamSubscription<Map<String, dynamic>>? _globalEventStreamSubscription;
  String? _currentlyStreamingPendingId;
  Timer? _refreshMessagesDebounceTimer;
  Timer? _activeSessionPollTimer;

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _rebuildThrottleTimer?.cancel();
    _refreshMessagesDebounceTimer?.cancel();
    _activeSessionPollTimer?.cancel();
    _stopHeartbeat();
    _globalEventStreamSubscription?.cancel();
    _activeSessionStreamSubscription?.cancel();
    _activePromptStreamSubscription?.cancel();
    NativeAgentService.instance.onBootRestore = null;
    PushNotificationService.instance.onSessionNotificationTapped = null;
    PushNotificationService.instance.latestNotificationNotifier
        .removeListener(_onAgentExecutionNotificationReceived);
    _agentCoreService.isConnectedNotifier.removeListener(_onCoreConnectionStateChanged);
    _agentCoreService.dispose();
    super.dispose();
  }

  void _handleGlobalEngineEvent(Map<String, dynamic> event) {
    if (!mounted) return;
    try {
      final rawType = event['type']?.toString() ?? '';
      final type = AvaAgentCoreService.normalizeEventType(rawType);

      final data = (event['data'] is Map)
          ? Map<String, dynamic>.from(event['data'] as Map)
          : ((event['properties'] is Map)
              ? Map<String, dynamic>.from(event['properties'] as Map)
              : event);
      final info = (data['info'] is Map) ? Map<String, dynamic>.from(data['info'] as Map) : data;

      final targetSessionId = data['sessionID']?.toString() ??
          data['sessionId']?.toString() ??
          data['session_id']?.toString() ??
          info['sessionID']?.toString() ??
          info['sessionId']?.toString() ??
          info['id']?.toString() ??
          event['sessionID']?.toString() ??
          event['sessionId']?.toString();

      if (targetSessionId != null &&
          targetSessionId.isNotEmpty &&
          _activeSessionId != null &&
          _activeSessionId != targetSessionId) {
        return;
      }

      if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
        final currentSess = _activeSessionId!;
        final lowerType = type.toLowerCase();

        // 1. Auto-attach to live background execution if a prompt/turn starts running
        final bool isTurnExecutionEvent = lowerType.contains('prompt') ||
            lowerType.contains('step') ||
            lowerType.contains('turn') ||
            lowerType.contains('text') ||
            lowerType.contains('reasoning') ||
            lowerType.contains('tool') ||
            lowerType.startsWith('session.next.') ||
            lowerType.startsWith('task.');

        if (isTurnExecutionEvent &&
            _activePromptStreamSubscription == null &&
            _activeSessionStreamSubscription == null) {
          _attachToActiveSessionExecution(currentSess);
        }

        // 2. Refresh persisted messages on any session/message/task updates
        final bool isSessionRefreshEvent = lowerType.contains('session') ||
            lowerType.contains('message') ||
            lowerType.contains('task') ||
            lowerType == 'done' ||
            lowerType.contains('status');

        if (isSessionRefreshEvent && _activePromptStreamSubscription == null) {
          _debouncedRefreshActiveSessionMessages(currentSess);
        }
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  void _debouncedRefreshActiveSessionMessages(String currentSess) {
    _refreshMessagesDebounceTimer?.cancel();
    _refreshMessagesDebounceTimer = Timer(const Duration(milliseconds: 350), () async {
      if (!mounted || _activeSessionId != currentSess || _activePromptStreamSubscription != null) return;
      try {
        final historyResult = await _agentCoreService.fetchSessionMessages(currentSess, limit: 100);
        final historyMsgs = (historyResult['messages'] as List<ChatMessageModel>?) ?? [];
        if (mounted && historyMsgs.isNotEmpty && _activeSessionId == currentSess && _activePromptStreamSubscription == null) {
          setState(() {
            final merged = _mergeMessagesPreservingLocal(_chatMessages, historyMsgs);
            _chatMessages.clear();
            _chatMessages.addAll(merged);
          });
          unawaited(_agentCoreService.saveSessionMessagesToCache(currentSess, _chatMessages));
        }
      } catch (e) { print('Ignored error: $e'); }
    });
  }

  void _setActiveSessionId(String? sessId, {String? title}) {
    final cleanId = (sessId != null && sessId.isNotEmpty) ? sessId : null;
    _activeSessionId = cleanId;
    if (title != null && title.isNotEmpty) {
      _currentSessionTitle = title;
    } else if (cleanId == null) {
      _currentSessionTitle = 'New Session';
    }
    _agentCoreService.setLastActiveSessionId(cleanId);
    SharedPreferences.getInstance().then((prefs) {
      if (cleanId != null) {
        prefs.setString('ava_last_active_session_id', cleanId);
        if (_currentSessionTitle != null) {
          prefs.setString('ava_session_title_' + cleanId, _currentSessionTitle!);
        }
      } else {
        prefs.remove('ava_last_active_session_id');
      }
    });
  }

  Future<void> _restoreOrCreateActiveSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_activeSessionId == null || _activeSessionId!.isEmpty) {
        final savedSessId = prefs.getString('ava_last_active_session_id');
        if (savedSessId != null && savedSessId.isNotEmpty) {
          final savedTitle = prefs.getString('ava_session_title_' + savedSessId);
          _setActiveSessionId(savedSessId, title: savedTitle);
        }
      }

      if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
        final currentSessId = _activeSessionId!;
        AvaModelItem? sessionModel;

        // 1. Session specific preference
        final savedSessModel = prefs.getString('ava_session_model_$currentSessId');
        if (savedSessModel != null && savedSessModel.isNotEmpty) {
          sessionModel = _createOrFindModel(savedSessModel);
        }

        // 2. Immediately display cached messages from LocalStorage (0ms wait)
        final cached = await _agentCoreService.loadSessionMessagesFromCache(currentSessId);
        if (sessionModel == null && cached.isNotEmpty) {
          final msgModel = _extractLastUsedModelFromMessages(cached);
          if (msgModel != null) {
            sessionModel = _createOrFindModel(msgModel);
          }
        }

        if (sessionModel != null && mounted) {
          setState(() => _selectedModelItem = sessionModel);
          unawaited(prefs.setString('ava_session_model_$currentSessId', sessionModel.id));
          unawaited(prefs.setString('ava_last_selected_model_id', sessionModel.id));
        }

        if (mounted && cached.isNotEmpty) {
          setState(() {
            _chatMessages.clear();
            _chatMessages.addAll(cached);
          });
        }

        // 3. Authoritatively fetch session metadata from backend only if not yet set locally
        if (sessionModel == null) {
          try {
            final sessDetails = await _agentCoreService.fetchSession(currentSessId);
            if (sessDetails != null && mounted) {
              final rawSessModel = sessDetails["model"] ?? (sessDetails["data"] is Map ? sessDetails["data"]["model"] : null);
              if (rawSessModel != null) {
                final resolvedFromBackend = _createOrFindModel(rawSessModel);
                sessionModel = resolvedFromBackend;
                setState(() => _selectedModelItem = resolvedFromBackend);
                unawaited(prefs.setString("ava_session_model_$currentSessId", resolvedFromBackend.id));
                unawaited(prefs.setString("ava_last_selected_model_id", resolvedFromBackend.id));
              }
            }
          } catch (e) { print("Ignored error: $e"); }
        }

        // 4. Fetch latest messages (limit: 100)
        final historyResult = await _agentCoreService.fetchSessionMessages(currentSessId, limit: 100);
        final historyMsgs = (historyResult['messages'] as List<ChatMessageModel>?) ?? [];
        if (mounted && historyMsgs.isNotEmpty) {
          if (sessionModel == null) {
            final msgModel = _extractLastUsedModelFromMessages(historyMsgs);
            if (msgModel != null) {
              final m = _createOrFindModel(msgModel);
              sessionModel = m;
              setState(() => _selectedModelItem = m);
              unawaited(prefs.setString('ava_session_model_$currentSessId', m.id));
              unawaited(prefs.setString('ava_last_selected_model_id', m.id));
            }
          }
          setState(() {
            final merged = _mergeMessagesPreservingLocal(_chatMessages, historyMsgs);
            _chatMessages.clear();
            _chatMessages.addAll(merged);
          });
          unawaited(_agentCoreService.saveSessionMessagesToCache(currentSessId, _chatMessages));
        }

        // 5. If session has no prior model anywhere, resolve default model
        if (_selectedModelItem == null) {
          final defModel = await _resolveDefaultModel();
          if (defModel != null && mounted) {
            setState(() => _selectedModelItem = defModel);
            unawaited(prefs.setString('ava_session_model_$currentSessId', defModel.id));
          }
        }

        // 6. Check if session is actively executing on the server (session recovery)
        final bool hasPendingLocalMsg = _chatMessages.any((m) => m.isPending || (m.sender == 'agent' && m.parts.any((p) => p.status == 'running')));
        final isRunning = await _agentCoreService.isSessionActive(currentSessId);
        if ((isRunning || hasPendingLocalMsg) && mounted) {
          _attachToActiveSessionExecution(currentSessId);
        } else if (mounted) {
          setState(() {
            bool changed = false;
            for (int i = 0; i < _chatMessages.length; i++) {
              if (_chatMessages[i].isPending) {
                _chatMessages[i] = _chatMessages[i].copyWith(isPending: false);
                changed = true;
              }
            }
            if (changed) {
              unawaited(_agentCoreService.saveSessionMessagesToCache(currentSessId, _chatMessages));
            }
          });
        }
        return;
      }

      // If no saved session or saved session was empty, check cached sessions list or backend catalog
      List<Map<String, dynamic>> sessions = await _agentCoreService.loadSessionsListFromCache();
      if (sessions.isEmpty) {
        sessions = await _agentCoreService.fetchSessions();
      } else {
        unawaited(_agentCoreService.fetchSessions());
      }

      if (sessions.isNotEmpty) {
        final firstSess = sessions.first;
        final firstId = firstSess['id']?.toString();
        if (firstId != null && firstId.isNotEmpty) {
          _setActiveSessionId(firstId);
          final cached = await _agentCoreService.loadSessionMessagesFromCache(firstId);
          if (mounted && cached.isNotEmpty) {
            setState(() {
              _chatMessages.clear();
              _chatMessages.addAll(cached);
            });
          }
          final historyResult = await _agentCoreService.fetchSessionMessages(firstId, limit: 100);
          final historyMsgs = (historyResult['messages'] as List<ChatMessageModel>?) ?? [];
          if (mounted && historyMsgs.isNotEmpty) {
            setState(() {
              final merged = _mergeMessagesPreservingLocal(_chatMessages, historyMsgs);
              _chatMessages.clear();
              _chatMessages.addAll(merged);
            });
            unawaited(_agentCoreService.saveSessionMessagesToCache(firstId, _chatMessages));
          }

          final isRunning = await _agentCoreService.isSessionActive(firstId);
          if (isRunning && mounted) {
            _attachToActiveSessionExecution(firstId);
          } else if (mounted) {
            setState(() {
              bool changed = false;
              for (int i = 0; i < _chatMessages.length; i++) {
                if (_chatMessages[i].isPending) {
                  _chatMessages[i] = _chatMessages[i].copyWith(isPending: false);
                  changed = true;
                }
              }
              if (changed) {
                unawaited(_agentCoreService.saveSessionMessagesToCache(firstId, _chatMessages));
              }
            });
          }
        }
      }
    } catch (e) {
      debugPrint("Error restoring active session: $e");
    }
  }

  Future<void> _handleCreateNewSession({String? workspacePath, String? mode, String? title}) async {
    final targetWorkspace = (workspacePath != null && workspacePath.isNotEmpty)
        ? workspacePath
        : _vpsWorkspacePath;
    final targetMode = (mode != null && mode.isNotEmpty) ? mode : _selectedMode;

    _activeSessionStreamSubscription?.cancel();
    _activeSessionStreamSubscription = null;

    if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
      unawaited(_agentCoreService.interruptSession(_activeSessionId!));
    }
    _currentSessionTitle = title ?? 'New Session';
    _setActiveSessionId(null, title: _currentSessionTitle);

    // Only resolve default model for new session if no model is currently selected
    if (_selectedModelItem == null) {
      final defaultModel = await _resolveDefaultModel();
      if (defaultModel != null && mounted) {
        setState(() {
          _selectedModelItem = defaultModel;
        });
      }
    }

    final newId = await _agentCoreService.createSession(
      directory: targetWorkspace,
      agent: targetMode,
      model: _selectedModelItem?.effectiveModelKey ?? _selectedModelItem?.id,
      provider: _selectedModelItem?.effectiveProviderKey ?? _selectedModelItem?.provider,
      title: title,
    );
    _setActiveSessionId(newId);
    _agentCoreService.setWorkspacePath(targetWorkspace);

    if (newId != null && _selectedModelItem != null) {
      final prefs = await SharedPreferences.getInstance();
      unawaited(prefs.setString('ava_session_model_$newId', _selectedModelItem!.id));
      unawaited(prefs.setString('ava_last_selected_model_id', _selectedModelItem!.id));
    }

    if (mounted) {
      _switchTab(0);
      setState(() {
        _vpsWorkspacePath = targetWorkspace;
        _selectedMode = targetMode;
        _chatMessages.clear();
      });
      AppToast.info(
        context,
        'Started fresh session in $targetWorkspace${newId != null ? " ($newId)" : ""}',
      );
    }
  }

  String _sanitizeAgentReply(String rawText, String userPrompt) {
    String clean = rawText.trim();
    final cleanPrompt = userPrompt.trim();
    if (cleanPrompt.isNotEmpty && clean.startsWith(cleanPrompt)) {
      clean = clean.substring(cleanPrompt.length).trim();
    }
    return clean;
  }

  Future<void> _handleSelectSession(Map<String, dynamic> session) async {
    final sessId = session['id']?.toString() ?? '';
    final sessTitle = session['name']?.toString() ?? session['title']?.toString() ?? 'Active Session';
    _currentSessionTitle = sessTitle;
    var targetWorkspace = session['workspacePath']?.toString() ?? session['directory']?.toString() ?? '';
    final targetMode = session['mode']?.toString() ?? session['agent']?.toString() ?? 'build';

    if (sessId.isEmpty) return;

    if (targetWorkspace.isEmpty || targetWorkspace == '/' || targetWorkspace == '/root') {
      final sessDetails = await _agentCoreService.fetchSession(sessId);
      if (sessDetails != null) {
        final dir = (sessDetails['directory'] ??
                sessDetails['workspacePath'] ??
                (sessDetails['location'] is Map ? sessDetails['location']['directory'] : null) ??
                (sessDetails['project'] is Map ? sessDetails['project']['worktree'] : null) ??
                '')
            .toString()
            .trim();
        if (dir.isNotEmpty && dir != '/' && dir != '/root') {
          targetWorkspace = dir;
        }
      }
    }
    if (targetWorkspace.isEmpty) {
      targetWorkspace = _vpsWorkspacePath;
    }

    _activeSessionStreamSubscription?.cancel();
    _activeSessionStreamSubscription = null;

    _setActiveSessionId(sessId);
    _agentCoreService.setWorkspacePath(targetWorkspace);
    unawaited(SharedPreferences.getInstance().then((p) => p.setString('ava_selected_workspace', targetWorkspace)));

    _switchTab(0);

    // 1. Immediately check and display cached messages from LocalStorage (0ms wait)
    final cached = await _agentCoreService.loadSessionMessagesFromCache(sessId);
    final prefs = await SharedPreferences.getInstance();
    final savedModelId = prefs.getString('ava_session_model_$sessId');
    AvaModelItem? modelToApply;
    if (savedModelId != null && savedModelId.isNotEmpty) {
      modelToApply = _createOrFindModel(savedModelId);
    }
    if (modelToApply == null && session['model'] != null) {
      modelToApply = _createOrFindModel(session['model']);
    }
    if (modelToApply == null && cached.isNotEmpty) {
      final msgModel = _extractLastUsedModelFromMessages(cached);
      if (msgModel != null) {
        modelToApply = _createOrFindModel(msgModel);
      }
    }

    if (mounted) {
      setState(() {
        _vpsWorkspacePath = targetWorkspace;
        _selectedMode = targetMode;
        if (modelToApply != null) {
          _selectedModelItem = modelToApply;
        }
        _chatMessages.clear();
        if (cached.isNotEmpty) {
          _chatMessages.addAll(cached);
        } else {
          _chatMessages.add(ChatMessageModel(
            id: 'loading-hist',
            sender: 'agent',
            text: 'Loading history for "$sessTitle"...',
            timestamp: TimeOfDay.now().format(context),
            isPending: true,
          ));
        }
      });
      if (modelToApply != null) {
        unawaited(prefs.setString('ava_session_model_$sessId', modelToApply.id));
        unawaited(prefs.setString('ava_last_selected_model_id', modelToApply.id));
      }
    }

    // 2. Dynamically fetch session messages (limit: 100)
    final historyResult = await _agentCoreService.fetchSessionMessages(sessId, limit: 100);
    final historyMsgs = (historyResult['messages'] as List<ChatMessageModel>?) ?? [];

    if (mounted) {
      AvaModelItem? updatedModel = modelToApply;
      if (updatedModel == null && historyMsgs.isNotEmpty) {
        final msgModel = _extractLastUsedModelFromMessages(historyMsgs);
        if (msgModel != null) {
          final resolved = _createOrFindModel(msgModel);
          updatedModel = resolved;
          unawaited(prefs.setString('ava_session_model_$sessId', resolved.id));
          unawaited(prefs.setString('ava_last_selected_model_id', resolved.id));
        }
      }
      if (updatedModel == null && _selectedModelItem == null) {
        updatedModel = await _resolveDefaultModel();
        if (updatedModel != null) {
          unawaited(prefs.setString('ava_session_model_$sessId', updatedModel.id));
        }
      }

      setState(() {
        if (updatedModel != null) {
          _selectedModelItem = updatedModel;
        }
        if (historyMsgs.isNotEmpty) {
          final merged = _mergeMessagesPreservingLocal(_chatMessages, historyMsgs);
          _chatMessages.clear();
          _chatMessages.addAll(merged);
          unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, merged));
        } else if (cached.isNotEmpty) {
          if (_chatMessages.isEmpty || _chatMessages.every((m) => m.id == 'loading-hist')) {
            _chatMessages.clear();
            _chatMessages.addAll(cached);
          }
        } else {
          _chatMessages.removeWhere((m) => m.id == 'loading-hist');
          if (_chatMessages.isEmpty) {
            _chatMessages.add(ChatMessageModel(
              id: 'sess-header-${DateTime.now().millisecondsSinceEpoch}',
              sender: 'agent',
              text: '### Resumed Session: **$sessTitle**\n- **Session ID**: `$sessId`\n- **Workspace**: `$targetWorkspace`\n- **Agent Mode**: `${targetMode.toUpperCase()}`',
              timestamp: TimeOfDay.now().format(context),
              modelName: 'Session Manager',
            ));
          }
        }
      });

      // 3. Check if session is actively executing on the server (session recovery)
      final isRunning = await _agentCoreService.isSessionActive(sessId);
      if (isRunning && mounted) {
        _attachToActiveSessionExecution(sessId);
      } else if (mounted) {
        setState(() {
          bool changed = false;
          for (int i = 0; i < _chatMessages.length; i++) {
            if (_chatMessages[i].isPending) {
              _chatMessages[i] = _chatMessages[i].copyWith(isPending: false);
              changed = true;
            }
          }
          if (changed) {
            unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, _chatMessages));
          }
        });
      }
    }
  }

  Future<void> _attachToActiveSessionExecution(String sessId) async {
    _activeSessionStreamSubscription?.cancel();
    _activeSessionStreamSubscription = null;

    final selectedModelName = _selectedModelItem?.name ??
        (_availableModels.isNotEmpty ? _availableModels.first.name : 'AvA Model');

    String pendingId;
    if (_chatMessages.isNotEmpty && _chatMessages.last.isPending) {
      pendingId = _chatMessages.last.id;
    } else if (_chatMessages.isNotEmpty && _chatMessages.last.sender == 'agent') {
      pendingId = _chatMessages.last.id;
      final lastIdx = _chatMessages.length - 1;
      _chatMessages[lastIdx] = _chatMessages[lastIdx].copyWith(isPending: true);
    } else {
      pendingId = _generateUniqueId();
      // Find the last user message to link parentId
      String? lastUserMsgId;
      for (int i = _chatMessages.length - 1; i >= 0; i--) {
        if (_chatMessages[i].sender == 'user') {
          lastUserMsgId = _chatMessages[i].id;
          break;
        }
      }
      setState(() {
        _chatMessages.add(ChatMessageModel(
          id: pendingId,
          sender: 'agent',
          text: '',
          timestamp: TimeOfDay.now().format(context),
          isPending: true,
          modelName: selectedModelName,
          parentId: lastUserMsgId,
        ));
      });
    }

    String accumulatedText = '';
    String accumulatedReasoning = '';
    final List<AgentTimelineEvent> accumulatedTimeline = [];

    // Seed from existing message if any
    final existingIdx = _chatMessages.indexWhere((m) => m.id == pendingId);
    if (existingIdx != -1) {
      accumulatedText = _chatMessages[existingIdx].text;
      accumulatedReasoning = _chatMessages[existingIdx].reasoningText ?? '';
      accumulatedTimeline.addAll(_chatMessages[existingIdx].timelineEvents);
    }

    final stream = _agentCoreService.attachToActiveSession(sessId);
    _activeSessionStreamSubscription = stream.listen(
      (event) {
        if (!mounted || _activeSessionId != sessId) return;
        final rawType = event['type']?.toString() ?? '';
        final type = AvaAgentCoreService.normalizeEventType(rawType);

        if (type == 'parts_update') {
          final rawParts = event['parts'] as List<MessagePartModel>? ?? [];
          final textPayload = event['text']?.toString() ?? '';
          final reasoningPayload = event['reasoning']?.toString() ?? '';

          if (textPayload.trim().isNotEmpty) {
            accumulatedText = textPayload.trim();
          }
          if (reasoningPayload.trim().isNotEmpty) {
            accumulatedReasoning = reasoningPayload.trim();
          }

          if (rawParts.isNotEmpty) {
            _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
              parts: rawParts,
              text: accumulatedText.isNotEmpty ? accumulatedText : textPayload,
              reasoningText: accumulatedReasoning.isNotEmpty ? accumulatedReasoning : msg.reasoningText,
              isPending: true,
            ));
          }
        } else if (type == 'text' ||
            type == 'message.part.updated' ||
            type == 'message.part.delta' ||
            type == 'session.next.text.delta') {
          final delta = event['delta']?.toString() ?? '';
          final textVal = event['text']?.toString() ?? '';
          if (delta.isNotEmpty) {
            accumulatedText += delta;
          } else if (textVal.isNotEmpty && textVal.length > accumulatedText.length) {
            accumulatedText = textVal;
          }
          if (accumulatedText.isNotEmpty) {
            _applyPendingUpdate(pendingId, (msg) => msg.copyWith(text: accumulatedText.trim(), isPending: true));
          }
        } else if (type == 'reasoning' || type == 'session.next.reasoning.delta') {
          final chunk = event['delta']?.toString() ?? event['text']?.toString() ?? '';
          final rId = event['id']?.toString() ?? event['partID']?.toString() ?? event['reasoningID']?.toString();
          if (chunk.isNotEmpty) {
            accumulatedReasoning += chunk;
            final rText = accumulatedReasoning;
            _applyPendingUpdate(pendingId, (msg) {
              final updatedParts = List<MessagePartModel>.from(msg.parts);
              final rIdx = rId != null && rId.isNotEmpty
                  ? updatedParts.indexWhere((p) => p.id == rId)
                  : updatedParts.lastIndexWhere((p) => p.type == 'reasoning');
              if (rIdx != -1) {
                final cur = updatedParts[rIdx];
                updatedParts[rIdx] = cur.copyWith(
                  messageId: pendingId,
                  turnId: pendingId,
                  text: (rId != null && rId.isNotEmpty) ? (cur.text + chunk) : rText,
                  status: 'running',
                );
              } else {
                updatedParts.add(MessagePartModel(
                  id: rId ?? 'reasoning_${DateTime.now().millisecondsSinceEpoch}',
                  messageId: pendingId,
                  turnId: pendingId,
                  type: 'reasoning',
                  text: chunk,
                  status: 'running',
                  timestamp: DateTime.now(),
                ));
              }
              return msg.copyWith(
                reasoningText: rText,
                parts: updatedParts,
                isPending: true,
              );
            });
          }
        } else if (type == 'ask_question' || type == 'Question.Event.Asked' || type == 'question.asked') {
          final qId = event['requestID']?.toString() ?? event['id']?.toString() ?? 'q-${DateTime.now().millisecondsSinceEpoch}';
          final qText = event['question']?.toString() ?? 'Question from agent';
          final rawOpts = event['options'] is List ? (event['options'] as List) : [];
          final opts = rawOpts.map((o) => o is Map ? (o['label']?.toString() ?? o['description']?.toString() ?? o.toString()) : o.toString()).toList();

          final questionData = {
            'requestID': qId,
            'id': qId,
            'sessionID': sessId,
            'question': qText,
            'options': opts,
            'rawQuestions': event['questions'] ?? [event],
            'answered': event['answered'] == true,
          };

          _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
            questionData: questionData,
            isPending: true,
          ));
        } else if (type == 'permission_request' || type == 'Permission.Event.Asked' || type == 'permission.asked') {
          final permData = Map<String, dynamic>.from(event);
          accumulatedTimeline.add(AgentTimelineEvent(
            id: 'ev-${DateTime.now().microsecondsSinceEpoch}',
            type: 'permission_request',
            title: event['command']?.toString() ?? 'Permission Request',
            command: event['command']?.toString(),
            details: event['description']?.toString(),
          ));
          _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
            timelineEvents: List.from(accumulatedTimeline),
            permissionData: permData,
            isPending: true,
          ));
        } else if (type == 'tool_use' ||
            type == 'tool_start' ||
            type == 'tool_finish' ||
            type == 'tool_result' ||
            type == 'session.next.tool.called' ||
            type == 'session.next.tool.progress' ||
            type == 'session.next.tool.success' ||
            type == 'session.next.tool.failed' ||
            type == 'session.next.tool.ended') {
          final tool = event['tool']?.toString() ?? 'tool';
          final command = event['command']?.toString();
          final output = event['output']?.toString();
          final status = event['status']?.toString() ?? 'completed';
          final evId = event['id']?.toString() ?? 'ev-${accumulatedTimeline.length}';
          final title = command != null && command.isNotEmpty ? '$tool: $command' : tool;
          final DateTime eventTime = DateTime.now();

          final rawCallId = event['callID']?.toString();
          final tIdx = accumulatedTimeline.indexWhere((e) =>
              (evId.isNotEmpty && e.id == evId) ||
              (rawCallId != null && rawCallId.isNotEmpty && e.id == rawCallId)
          );
          if (tIdx != -1) {
            accumulatedTimeline[tIdx] = AgentTimelineEvent(
              id: accumulatedTimeline[tIdx].id,
              type: 'tool_use',
              title: title,
              details: output ?? accumulatedTimeline[tIdx].details,
              status: status,
              timestamp: accumulatedTimeline[tIdx].timestamp,
            );
          } else {
            accumulatedTimeline.add(AgentTimelineEvent(
              id: evId,
              type: 'tool_use',
              title: title,
              details: output,
              status: status,
              timestamp: eventTime,
            ));
          }

          _applyPendingUpdate(pendingId, (msg) {
            final existingParts = List<MessagePartModel>.from(msg.parts);
            final pIdx = existingParts.indexWhere((p) =>
                (evId.isNotEmpty && p.id == evId) ||
                (rawCallId != null && rawCallId.isNotEmpty && (p.id == rawCallId || p.callId == rawCallId))
            );
            if (pIdx != -1) {
              existingParts[pIdx] = existingParts[pIdx].copyWith(
                messageId: pendingId,
                turnId: pendingId,
                status: status,
                output: output ?? existingParts[pIdx].output,
              );
            } else {
              existingParts.add(MessagePartModel(
                id: evId,
                callId: rawCallId,
                messageId: pendingId,
                turnId: pendingId,
                type: 'tool',
                tool: tool,
                status: status,
                input: event['input'],
                output: output,
                timestamp: eventTime,
              ));
            }
            existingParts.sort((a, b) => a.timestamp.compareTo(b.timestamp));
            return msg.copyWith(
              parts: existingParts,
              timelineEvents: List.from(accumulatedTimeline),
              isPending: true,
            );
          });
        } else if (type == 'done') {
          final rawParts = event['parts'] as List<MessagePartModel>?;
          final idx = _chatMessages.indexWhere((m) => m.id == pendingId);
          if (idx != -1) {
            final sourceParts = rawParts ?? _chatMessages[idx].parts;
            final finalizedParts = sourceParts
                .map((p) => p.status == 'running' ? p.copyWith(status: 'completed') : p)
                .toList();

            _replacePendingMessageImmediate(pendingId, ChatMessageModel(
              id: pendingId,
              sender: 'agent',
              text: accumulatedText.isNotEmpty ? accumulatedText : (event['reply']?.toString() ?? 'Task completed.'),
              timestamp: TimeOfDay.now().format(context),
              isPending: false,
              modelName: selectedModelName,
              reasoningText: accumulatedReasoning.isNotEmpty ? accumulatedReasoning : null,
              parts: finalizedParts,
              timelineEvents: List.from(accumulatedTimeline),
            ));
          }
          setState(() {
            for (int i = 0; i < _chatMessages.length; i++) {
              if (_chatMessages[i].isPending) {
                _chatMessages[i] = _chatMessages[i].copyWith(isPending: false);
              }
            }
          });
          _activeSessionStreamSubscription?.cancel();
          _activeSessionStreamSubscription = null;
          unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, _chatMessages));
          unawaited(_agentCoreService.fetchSession(sessId));
          unawaited(Future.delayed(const Duration(milliseconds: 500), () {
            _agentCoreService.fetchSessionMessages(sessId, limit: 100).then((res) {
              if (!mounted || _activeSessionId != sessId) return;
              final msgs = (res['messages'] as List<ChatMessageModel>?) ?? [];
              if (msgs.isNotEmpty) {
                setState(() {
                  final merged = _mergeMessagesPreservingLocal(_chatMessages, msgs);
                  _chatMessages.clear();
                  _chatMessages.addAll(merged);
                });
                unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, _chatMessages));
              }
            });
          }));
        }
      },
      onError: (err) {
        if (!mounted) return;
        _activeSessionStreamSubscription?.cancel();
        _activeSessionStreamSubscription = null;
        final errStr = err.toString();
        setState(() {
          for (int i = 0; i < _chatMessages.length; i++) {
            if (_chatMessages[i].isPending) {
              final msg = _chatMessages[i];
              final finalizedParts = msg.parts.map((p) => p.status == 'running' ? p.copyWith(status: 'failed') : p).toList();
              _chatMessages[i] = msg.copyWith(
                isPending: false,
                isError: true,
                errorMessage: 'Session connection error: $errStr',
                parts: finalizedParts,
              );
            }
          }
        });
        unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, _chatMessages));
      },
      onDone: () {
        if (!mounted) return;
        _activeSessionStreamSubscription?.cancel();
        _activeSessionStreamSubscription = null;
        // Stream closed without a proper 'done' event — mark as error
        setState(() {
          for (int i = 0; i < _chatMessages.length; i++) {
            if (_chatMessages[i].isPending) {
              final msg = _chatMessages[i];
              final finalizedParts = msg.parts.map((p) => p.status == 'running' ? p.copyWith(status: 'failed') : p).toList();
              _chatMessages[i] = msg.copyWith(
                isPending: false,
                isError: true,
                errorMessage: 'Session stream closed unexpectedly.',
                parts: finalizedParts,
              );
            }
          }
        });
        unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, _chatMessages));
      },
    );
  }

  Future<void> _initializeAgentCoreConnection() async {
    final isHealthy = await _agentCoreService.checkHealth();
    unawaited(_agentCoreService.fetchUserProfile());

    // Dynamically check native VPS workspace path if not saved in SharedPreferences
    final prefs = await SharedPreferences.getInstance();
    final savedWs = prefs.getString('ava_selected_workspace');
    if (savedWs == null || savedWs.isEmpty) {
      final nativePaths = await _agentCoreService.fetchNativePath();
      final defaultWs = nativePaths['worktree'] ?? nativePaths['directory'] ?? AppConfig.defaultWorkspacePath;
      if (defaultWs.isNotEmpty && defaultWs != _vpsWorkspacePath) {
        if (mounted) {
          setState(() {
            _vpsWorkspacePath = defaultWs;
            _agentCoreService.setWorkspacePath(defaultWs);
          });
        }
      }
    }

    final catalogInfo = await _agentCoreService.fetchCatalogInfo(forceRefresh: true);
    final models = (catalogInfo['models'] as List<AvaModelItem>?) ?? <AvaModelItem>[];

    if (mounted) {
      final prefs = await SharedPreferences.getInstance();
      AvaModelItem? targetModel;

      final currentSess = _activeSessionId ?? prefs.getString('ava_last_active_session_id');
      if (currentSess != null && currentSess.isNotEmpty) {
        final savedSessModel = prefs.getString('ava_session_model_$currentSess');
        if (savedSessModel != null && savedSessModel.isNotEmpty) {
          targetModel = _createOrFindModel(savedSessModel, models: models);
        }
        if (targetModel == null && _chatMessages.isNotEmpty) {
          final msgModel = _extractLastUsedModelFromMessages(_chatMessages);
          if (msgModel != null) {
            targetModel = _createOrFindModel(msgModel, models: models);
          }
        }
      }
      if (targetModel == null) {
        final savedLast = prefs.getString("ava_last_selected_model_id");
        if (savedLast != null && savedLast.isNotEmpty) {
          targetModel = _createOrFindModel(savedLast, models: models);
        }
      }
      if (targetModel == null && _selectedModelItem != null) {
        targetModel = _findModelByIdOrName(_selectedModelItem!.id, models: models) ??
                      _findModelByIdOrName(_selectedModelItem!.name, models: models) ??
                      _selectedModelItem;
      }
      if (targetModel == null && models.isNotEmpty) {
        targetModel = await _resolveDefaultModel(models: models) ?? models.first;
      }

      setState(() {
        _isCoreConnected = isHealthy;
        if (models.isNotEmpty) {
          _availableModels = models;
        }
        if (targetModel != null) {
          _selectedModelItem = targetModel;
        }
      });

      if (isHealthy) {
        // Automatically restore previous active session or latest session on successful core connection
        await _restoreOrCreateActiveSession();
      }
    }
  }

  Future<void> _handleReconnectCore() async {
    if (_isReconnectingCore) return;
    setState(() => _isReconnectingCore = true);

    AppToast.info(context, 'Connecting to AvA Core Engine...');

    try {
      final isHealthy = await _agentCoreService.checkHealth();
      final catalogInfo = await _agentCoreService.fetchCatalogInfo(forceRefresh: true);
      final models = (catalogInfo['models'] as List<AvaModelItem>?) ?? <AvaModelItem>[];

      if (mounted) {
        final prefs = await SharedPreferences.getInstance();
        AvaModelItem? targetModel;

        final currentSess = _activeSessionId ?? prefs.getString('ava_last_active_session_id');
        if (currentSess != null && currentSess.isNotEmpty) {
          final savedSessModel = prefs.getString('ava_session_model_$currentSess');
          if (savedSessModel != null && savedSessModel.isNotEmpty) {
            targetModel = _createOrFindModel(savedSessModel, models: models);
          }
          if (targetModel == null && _chatMessages.isNotEmpty) {
            final msgModel = _extractLastUsedModelFromMessages(_chatMessages);
            if (msgModel != null) {
              targetModel = _createOrFindModel(msgModel, models: models);
            }
          }
        }
        if (targetModel == null) {
          final savedLast = prefs.getString("ava_last_selected_model_id");
          if (savedLast != null && savedLast.isNotEmpty) {
            targetModel = _createOrFindModel(savedLast, models: models);
          }
        }
        if (targetModel == null && _selectedModelItem != null) {
          targetModel = _findModelByIdOrName(_selectedModelItem!.id, models: models) ??
                        _findModelByIdOrName(_selectedModelItem!.name, models: models) ??
                        _selectedModelItem;
        }
        if (targetModel == null && models.isNotEmpty) {
          targetModel = await _resolveDefaultModel(models: models) ?? models.first;
        }

        setState(() {
          _isCoreConnected = isHealthy;
          if (models.isNotEmpty) {
            _availableModels = models;
          }
          if (targetModel != null) {
            _selectedModelItem = targetModel;
          }
          _isReconnectingCore = false;
        });

        if (isHealthy) {
          await _restoreOrCreateActiveSession();
          if (mounted) {
            AppToast.success(context, 'Connected to AvA Core Engine ($_serverUrl)');
          }
        } else if (mounted) {
          AppToast.error(
            context,
            'Failed to connect to AvA Core. Tap Reconnect to retry.',
            actionLabel: 'Retry',
            onAction: _handleReconnectCore,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCoreConnected = false;
          _isReconnectingCore = false;
        });
        AppToast.error(
          context,
          'Core connection error: $e',
          actionLabel: 'Retry',
          onAction: _handleReconnectCore,
        );
      }
    }
  }

  bool _isHandlingSendPrompt = false;

  Future<void> _handleSendPrompt(String promptText, {List<String>? attachments, String? userDisplayText}) async {
    if (_isHandlingSendPrompt) return;
    _isHandlingSendPrompt = true;
    Future.delayed(const Duration(milliseconds: 400), () {
      _isHandlingSendPrompt = false;
    });
    final now = DateTime.now();
    final timeStr = TimeOfDay.now().format(context);
    final selectedModelName = _selectedModelItem?.name ?? (_availableModels.isNotEmpty ? _availableModels.first.name : 'AvA Model');

    // A session is truly fresh only if there's NO active session ID at all
    // (not based on chatMessages.isEmpty, which is briefly true while history loads)
    final bool isFreshSession = (_activeSessionId == null || _activeSessionId!.isEmpty);
    final String? sessionToSend = isFreshSession ? null : _activeSessionId;

    if (isFreshSession) {
      _setActiveSessionId(null);
    }

    // Reset first event flag for new turn - ensures immediate UI feedback
    _firstEventReceived = false;

    final userMsgId = _generateUniqueId();
    final userMsg = ChatMessageModel(
      id: userMsgId,
      sender: 'user',
      text: sanitizeUserDisplayText(userDisplayText ?? promptText),
      timestamp: timeStr,
      deliveryStatus: 'sending',
      attachments: attachments != null ? List<String>.from(attachments) : [],
    );

    final pendingId = _generateUniqueId();
    final pendingAgentMsg = ChatMessageModel(
      id: pendingId,
      sender: 'agent',
      text: '',
      timestamp: timeStr,
      isPending: true,
      modelName: selectedModelName,
      reasoningText: '',
      parentId: userMsgId,
    );

    setState(() {
      _chatMessages.add(userMsg);
      _chatMessages.add(pendingAgentMsg);
    });

    // Start heartbeat immediately to show working indicator even before first SSE event
    _startHeartbeat();

    final targetTurnSession = sessionToSend ?? _activeSessionId ?? 'session_${now.millisecondsSinceEpoch}';
    unawaited(PushNotificationService.instance.startOngoingTurnNotification(
      sessionId: targetTurnSession,
      initialPrompt: promptText,
      modelName: selectedModelName,
    ));

    if (sessionToSend != null && sessionToSend.isNotEmpty && _selectedModelItem != null) {
      unawaited(SharedPreferences.getInstance().then((p) {
        p.setString('ava_session_model_$sessionToSend', _selectedModelItem!.id);
        p.setString('ava_last_selected_model_id', _selectedModelItem!.id);
      }));
      unawaited(_agentCoreService.saveSessionMessagesToCache(sessionToSend, _chatMessages));
    }

   bool promptMarkedSent = false;
   void markPromptSent() {
     if (promptMarkedSent) return;
     promptMarkedSent = true;
      bool changed = false;
      for (int i = 0; i < _chatMessages.length; i++) {
        if (_chatMessages[i].sender == 'user' &&
            (_chatMessages[i].id == userMsgId || _chatMessages[i].deliveryStatus == 'sending' || _chatMessages[i].isPending)) {
          _chatMessages[i] = _chatMessages[i].copyWith(deliveryStatus: 'sent', isPending: false);
          changed = true;
        }
      }
      if (changed) {
        _scheduleRebuild();
      }
    }

    void markPromptFailed(String errReason) {
      final uIdx = _chatMessages.indexWhere((m) => m.id == userMsgId);
      if (uIdx != -1) {
        _chatMessages[uIdx] = _chatMessages[uIdx].copyWith(
          deliveryStatus: 'failed',
          isError: true,
          errorMessage: errReason,
        );
        _scheduleRebuild();
      }
    }

    String accumulatedText = '';
    String accumulatedReasoning = '';
    final List<AgentTimelineEvent> accumulatedTimeline = [];
    Map<String, dynamic>? currentQuestion;
    Map<String, dynamic>? currentPermission;
    bool turnCompletedSuccessfully = false;
    final completer = Completer<void>();
    _activePromptStreamSubscription?.cancel();
    _activePromptStreamSubscription = null;
    _activeSessionStreamSubscription?.cancel();
    _activeSessionStreamSubscription = null;

    try {
      _currentlyStreamingPendingId = pendingId;
      final stream = _agentCoreService.sendPromptStream(
        prompt: promptText,
        modelId: _selectedModelItem?.effectiveModelKey ?? (_availableModels.isNotEmpty ? _availableModels.first.effectiveModelKey : ''),
        provider: _selectedModelItem?.effectiveProviderKey ?? (_availableModels.isNotEmpty ? _availableModels.first.effectiveProviderKey : 'omniroute'),
        mode: _selectedMode,
        agent: _selectedAgent,
        sessionId: sessionToSend,
        attachments: attachments,
        reasoningEffort: _reasoningEffort,
      );

      _activePromptStreamSubscription = stream.listen(
        (event) {
          if (!mounted) {
            if (!completer.isCompleted) completer.complete();
            return;
          }

          markPromptSent();

          final rawType = event['type']?.toString() ?? '';
          final type = AvaAgentCoreService.normalizeEventType(rawType);

          // ── Session bootstrap & Turn Start ───────────────────────────────
          if (type == 'session_id' || type == 'sessionId') {
            final returnedSessId = event['sessionId']?.toString();
            if (returnedSessId != null && returnedSessId.isNotEmpty) {
              _setActiveSessionId(returnedSessId);
              if (_selectedModelItem != null) {
                unawaited(SharedPreferences.getInstance().then((p) {
                  p.setString('ava_session_model_' + returnedSessId, _selectedModelItem!.id);
                  p.setString('ava_last_selected_model_id', _selectedModelItem!.id);
                }));
              }
              // ── Start live ongoing turn banner & system notification ──
              unawaited(PushNotificationService.instance.startOngoingTurnNotification(
                sessionId: returnedSessId,
                initialPrompt: promptText,
                modelName: selectedModelName,
              ));
            }

          } else if (type == 'turn_started') {
            markPromptSent();
            _applyPendingUpdate(pendingId, (msg) => msg.copyWith(isPending: true), immediate: true);
            _scheduleRebuild(immediate: true);

          // ── Step lifecycle (session-usecase.js: type=="step") ─────────────
          } else if (type == 'step') {
            final stepType = event['stepType']?.toString() ?? '';
            if (stepType == 'step_start') {
              _scheduleRebuild();
            } else if (stepType == 'step_finish') {
              if (accumulatedText.trim().isNotEmpty) {
                _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
                  text: accumulatedText.trim(),
                  timelineEvents: List.from(accumulatedTimeline),
                ));
              }
            }

          // ── Chronological Parts Update (Real-time sequential streaming) ──
          } else if (type == 'parts_update') {
            final rawParts = event['parts'] as List<MessagePartModel>? ?? [];
            final textPayload = event['text']?.toString() ?? '';
            final reasoningPayload = event['reasoning']?.toString() ?? '';

            if (textPayload.trim().isNotEmpty) {
              accumulatedText = _sanitizeAgentReply(textPayload, promptText);
              accumulatedText = accumulatedText.replaceAll('Connection lost — retrying…', '').trim();
            }
            if (reasoningPayload.trim().isNotEmpty) {
              accumulatedReasoning = reasoningPayload.trim();
            }

            final cleanParts = rawParts.where((p) => !(p.type == 'text' && p.text.trim() == promptText.trim())).toList();
            final hasContent = accumulatedText.isNotEmpty || accumulatedReasoning.isNotEmpty;
            _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
              parts: cleanParts.isNotEmpty ? cleanParts : msg.parts,
              text: accumulatedText.isNotEmpty ? accumulatedText : _sanitizeAgentReply(textPayload, promptText),
              reasoningText: accumulatedReasoning.isNotEmpty ? accumulatedReasoning : msg.reasoningText,
              isPending: true,
              isError: false,
              errorMessage: null,
            ), immediate: !hasContent);

          // ── Text & Reasoning Real-Time Streaming Deltas (EventV2 & SSE) ──
          } else if (type == 'text' ||
              type == 'message.part.updated' ||
              type == 'message.part.delta' ||
              type == 'message.updated' ||
              type == 'part.updated' ||
              type == 'part.delta' ||
              type == 'session.next.text.delta') {

            final Map<String, dynamic> props = (event['properties'] is Map)
                ? Map<String, dynamic>.from(event['properties'] as Map)
                : (event['data'] is Map ? Map<String, dynamic>.from(event['data'] as Map) : event);

            final partObj = props['part'] is Map ? Map<String, dynamic>.from(props['part'] as Map) : props;
            final pType = partObj['type']?.toString() ?? props['pType']?.toString() ?? 'text';

            final delta = props['delta']?.toString() ?? partObj['delta']?.toString() ?? event['delta']?.toString() ?? '';
            final textVal = partObj['text']?.toString() ?? props['text']?.toString() ?? event['text']?.toString() ?? '';

            final bool isToolPartType = pType == 'tool' ||
                pType == 'tool-call' ||
                pType == 'tool_call' ||
                pType == 'tool_use' ||
                pType == 'tool-use' ||
                pType == 'function_call' ||
                pType == 'function' ||
                partObj['tool'] != null ||
                pType == 'action';

            if (isToolPartType) {
              final toolCallId = partObj['callID']?.toString() ?? partObj['id']?.toString() ?? 'tool_${DateTime.now().millisecondsSinceEpoch}';
              final toolName = partObj['tool']?.toString() ?? partObj['name']?.toString() ?? 'tool';
              final toolStatus = partObj['status']?.toString() ?? 'running';
              final toolInput = partObj['input'] ?? props['input'];
              final toolOutput = partObj['output']?.toString() ?? props['output']?.toString();

              final existingIdx = accumulatedTimeline.indexWhere((e) =>
                  (toolCallId.isNotEmpty && e.id == toolCallId) ||
                  (partObj['callID'] != null && e.id == partObj['callID'].toString())
              );
              if (existingIdx != -1) {
                accumulatedTimeline[existingIdx] = AgentTimelineEvent(
                  id: accumulatedTimeline[existingIdx].id,
                  type: 'tool_use',
                  title: toolName,
                  details: toolOutput ?? accumulatedTimeline[existingIdx].details,
                  status: toolStatus,
                  timestamp: accumulatedTimeline[existingIdx].timestamp,
                );
              } else {
                accumulatedTimeline.add(AgentTimelineEvent(
                  id: toolCallId,
                  type: 'tool_use',
                  title: toolName,
                  details: toolOutput,
                  status: toolStatus,
                  timestamp: DateTime.now(),
                ));
              }

              _applyPendingUpdate(pendingId, (msg) {
                final existingParts = List<MessagePartModel>.from(msg.parts);
                final pIdx = existingParts.indexWhere((p) =>
                    (toolCallId.isNotEmpty && p.id == toolCallId) ||
                    (p.callId != null && p.callId!.isNotEmpty && p.callId == toolCallId)
                );
                if (pIdx != -1) {
                  existingParts[pIdx] = existingParts[pIdx].copyWith(
                    messageId: pendingId,
                    turnId: pendingId,
                    status: toolStatus,
                    output: toolOutput ?? existingParts[pIdx].output,
                  );
                } else {
                  existingParts.add(MessagePartModel(
                    id: toolCallId,
                    callId: toolCallId,
                    messageId: pendingId,
                    turnId: pendingId,
                    type: 'tool',
                    tool: toolName,
                    status: toolStatus,
                    input: toolInput,
                    output: toolOutput,
                    timestamp: DateTime.now(),
                  ));
                }
                existingParts.sort((a, b) => a.timestamp.compareTo(b.timestamp));
                return msg.copyWith(
                  parts: existingParts,
                  timelineEvents: List.from(accumulatedTimeline),
                  isPending: true,
                  isError: false,
                  errorMessage: null,
                );
              });
            } else {
              // Text or Reasoning delta
              final isReasoning = pType == 'reasoning' || pType == 'thinking' || pType == 'thought';
              if (delta.isNotEmpty) {
                if (isReasoning) {
                  accumulatedReasoning += delta;
                } else {
                  accumulatedText += delta;
                }
              } else if (textVal.isNotEmpty) {
                if (isReasoning) {
                  if (textVal.length > accumulatedReasoning.length) accumulatedReasoning = textVal;
                } else {
                  if (textVal.length > accumulatedText.length) accumulatedText = textVal;
                }
              }

              final sanitized = _sanitizeAgentReply(accumulatedText, promptText).replaceAll('Connection lost — retrying…', '').trim();
              _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
                text: sanitized.isNotEmpty ? sanitized : msg.text,
                reasoningText: accumulatedReasoning.isNotEmpty ? accumulatedReasoning : msg.reasoningText,
                timelineEvents: List.from(accumulatedTimeline),
                isPending: true,
                isError: false,
                errorMessage: null,
              ));
            }

          // ── Reasoning streaming ───────────────────────────────────────────
          } else if (type == 'reasoning' || type == 'session.next.reasoning.delta') {
            final chunk = event['delta']?.toString() ?? event['text']?.toString() ?? '';
            final rId = event['id']?.toString() ?? event['partID']?.toString() ?? event['reasoningID']?.toString();
            if (chunk.isNotEmpty) {
              accumulatedReasoning += chunk;
              final rText = accumulatedReasoning;
              _applyPendingUpdate(pendingId, (msg) {
                final updatedParts = List<MessagePartModel>.from(msg.parts);
                final rIdx = rId != null && rId.isNotEmpty
                    ? updatedParts.indexWhere((p) => p.id == rId)
                    : updatedParts.lastIndexWhere((p) => p.type == 'reasoning');
                if (rIdx != -1) {
                  final cur = updatedParts[rIdx];
                  updatedParts[rIdx] = cur.copyWith(
                    messageId: pendingId,
                    turnId: pendingId,
                    text: (rId != null && rId.isNotEmpty) ? (cur.text + chunk) : rText,
                    status: 'running',
                  );
                } else {
                  updatedParts.add(MessagePartModel(
                    id: rId ?? 'reasoning_${DateTime.now().millisecondsSinceEpoch}',
                    messageId: pendingId,
                    turnId: pendingId,
                    type: 'reasoning',
                    text: chunk,
                    status: 'running',
                    timestamp: DateTime.now(),
                  ));
                }
                return msg.copyWith(
                  reasoningText: rText,
                  parts: updatedParts,
                  timelineEvents: List.from(accumulatedTimeline),
                  isPending: true,
                  isError: false,
                  errorMessage: null,
                );
              });
            }

          // ── Tool use / progress / questions ──────────────────────────────
          } else if (type == 'tool_use' ||
                     type == 'tool_start' ||
                     type == 'tool_finish' ||
                     type == 'tool_result' ||
                     type == 'tool_call' ||
                     type == 'session.next.tool.called' ||
                     type == 'session.next.tool.progress' ||
                     type == 'session.next.tool.success' ||
                     type == 'session.next.tool.failed' ||
                     type == 'session.next.tool.ended') {

            final tool = event['tool']?.toString() ?? event['name']?.toString() ?? 'tool';
            final evId = event['id']?.toString() ?? event['callID']?.toString() ?? 'ev-${DateTime.now().microsecondsSinceEpoch}';
            final title = event['title']?.toString() ?? tool;
            final status = event['status']?.toString() ?? (type == 'tool_finish' || type == 'tool_result' || type == 'session.next.tool.success' ? 'completed' : 'running');
            final output = event['output']?.toString() ?? event['result']?.toString();

            if (status == 'running' || status == 'started' || status == '') {
              unawaited(PushNotificationService.instance.updateOngoingTurnNotification(
                currentAction: 'Running tool: $title',
                toolName: tool,
              ));
            }
            final DateTime eventTime = event['timestamp'] is DateTime
                ? (event['timestamp'] as DateTime)
                : DateTime.now();

            final tLower = tool.toLowerCase();
            if (tLower == 'question' || tLower == 'ask_question' || tLower == 'default_api:ask_question' || tLower.contains('question')) {
              final input = event['input'] is Map ? (event['input'] as Map) : {};
              final qList = input['questions'] is List ? (input['questions'] as List) : [];
              final firstQ = qList.isNotEmpty && qList.first is Map ? (qList.first as Map) : null;
              final qText = firstQ?['question']?.toString() ?? firstQ?['header']?.toString() ?? input['question']?.toString() ?? 'Question';
              final rawOpts = firstQ?['options'] is List ? (firstQ!['options'] as List) : (input['options'] is List ? (input['options'] as List) : []);
              final opts = rawOpts.map((o) => o is Map ? (o['label']?.toString() ?? o['description']?.toString() ?? o.toString()) : o.toString()).toList();

              currentQuestion = {
                'requestID': evId,
                'id': evId,
                'sessionID': _activeSessionId,
                'question': qText,
                'options': opts,
                'rawQuestions': qList,
                'answered': status == 'completed',
              };
            }

            final rawCallId = event['callID']?.toString();
            final existingIdx = accumulatedTimeline.indexWhere(
              (e) => (evId.isNotEmpty && e.id == evId) ||
                     (rawCallId != null && rawCallId.isNotEmpty && e.id == rawCallId),
            );
            if (existingIdx != -1) {
              accumulatedTimeline[existingIdx] = AgentTimelineEvent(
                id: accumulatedTimeline[existingIdx].id,
                type: tLower.contains('question') ? 'ask_question' : 'tool_use',
                title: title,
                details: output ?? accumulatedTimeline[existingIdx].details,
                status: status,
                timestamp: accumulatedTimeline[existingIdx].timestamp,
              );
            } else {
              accumulatedTimeline.add(AgentTimelineEvent(
                id: evId,
                type: tLower.contains('question') ? 'ask_question' : 'tool_use',
                title: title,
                details: output,
                status: status,
                timestamp: eventTime,
              ));
            }
            _applyPendingUpdate(pendingId, (msg) {
              final existingParts = List<MessagePartModel>.from(msg.parts);
              final pIdx = existingParts.indexWhere(
                (p) => (evId.isNotEmpty && p.id == evId) ||
                       (rawCallId != null && rawCallId.isNotEmpty && (p.id == rawCallId || p.callId == rawCallId)),
              );
              if (pIdx != -1) {
                existingParts[pIdx] = existingParts[pIdx].copyWith(
                  messageId: pendingId,
                  turnId: pendingId,
                  status: status,
                  output: output ?? existingParts[pIdx].output,
                );
              } else {
                existingParts.add(MessagePartModel(
                  id: evId,
                  callId: rawCallId,
                  messageId: pendingId,
                  turnId: pendingId,
                  type: 'tool',
                  tool: tool,
                  status: status,
                  input: event['input'],
                  output: output,
                  timestamp: eventTime,
                ));
              }
              existingParts.sort((a, b) => a.timestamp.compareTo(b.timestamp));
              return msg.copyWith(
                parts: existingParts,
                timelineEvents: List.from(accumulatedTimeline),
                questionData: currentQuestion ?? msg.questionData,
                isPending: true,
                isError: false,
                errorMessage: null,
              );
            });

          // ── Session status & Idle indicator ──────────────────────────────
          } else if (type == 'session.status' || type == 'session.idle' || type == 'session.finished') {
            // Keep stream active; agent completion lifecycle is handled authoritatively by type == 'done'
            _scheduleRebuild();

          } else if (type == 'error') {
            final bool isTransient = event['recoverable'] == true ||
                event['transient'] == true ||
                (event['error']?.toString().toLowerCase().contains('connection lost') ?? false);
            if (!isTransient) {
              final errText = event['error']?.toString() ?? event['message']?.toString() ?? 'An error occurred.';
              _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
                isError: true,
                errorMessage: errText,
              ));
            }

          } else if (type == 'done') {
            final status = event['status']?.toString() ?? 'success';
            final isSuccess = status != 'error' && status != 'failed';
            final isInterrupted = status == 'interrupted';
            if (isSuccess) turnCompletedSuccessfully = true;
            final finalReply = event['reply']?.toString() ?? '';
            final finalReasoning = event['reasoning']?.toString();
            // ── Finish ongoing turn notification on completion ──
            final completedSessId = _activeSessionId ?? '';
            if (completedSessId.isNotEmpty) {
              unawaited(PushNotificationService.instance.finishOngoingTurnNotification(
                sessionId: completedSessId,
                isSuccess: isSuccess,
                completionMessage: isSuccess ? 'Agent turn completed.' : (isInterrupted ? 'Agent stopped by user.' : (finalReply.isNotEmpty ? finalReply : 'Agent turn ended with an error.')),
              ));
            }
            final rawParts = event['parts'] as List<MessagePartModel>?;

            String finalText = _sanitizeAgentReply(accumulatedText.trim(), promptText);
            finalText = finalText.replaceAll('Connection lost — retrying…', '').trim();
            final currentMsgIdx = _chatMessages.indexWhere((m) => m.id == pendingId);
            if (finalText.isEmpty && currentMsgIdx != -1 && _chatMessages[currentMsgIdx].text.trim().isNotEmpty) {
              finalText = _sanitizeAgentReply(_chatMessages[currentMsgIdx].text.trim(), promptText).replaceAll('Connection lost — retrying…', '').trim();
            }
            if (finalText.isEmpty && rawParts != null && rawParts.isNotEmpty) {
              final textParts = rawParts.where((p) => p.type == 'text' && p.text.trim().isNotEmpty && p.text.trim() != promptText.trim()).map((p) => p.text.trim()).join('\n\n');
              if (textParts.isNotEmpty) finalText = _sanitizeAgentReply(textParts, promptText).replaceAll('Connection lost — retrying…', '').trim();
            }
            if (finalText.isEmpty) {
              final sanitizedReply = _sanitizeAgentReply(finalReply, promptText).replaceAll('Connection lost — retrying…', '').trim();
              if (sanitizedReply.isNotEmpty) {
                finalText = sanitizedReply;
              } else {
                finalText = isSuccess ? 'Task completed successfully.' : (isInterrupted ? 'Turn stopped by user.' : 'An error occurred.');
              }
            }
            final cleanReply = _sanitizeAgentReply(finalReply, promptText).replaceAll('Connection lost — retrying…', '').trim();
            if (!isSuccess && !isInterrupted && cleanReply.isNotEmpty && !finalText.contains(cleanReply)) {
              finalText = finalText.isNotEmpty ? '$finalText\n\n$cleanReply' : cleanReply;
            }

            final finalReason = accumulatedReasoning.trim().isNotEmpty
                ? accumulatedReasoning.trim()
                : finalReasoning;

            final cleanParts = rawParts
                ?.where((p) => !(p.type == 'text' && p.text.trim() == promptText.trim()))
                .toList();

            final idx = _chatMessages.indexWhere((m) => m.id == pendingId);
            if (idx != -1) {
              final sourceParts = cleanParts ?? _chatMessages[idx].parts;
              final finalizedParts = sourceParts.map((p) => p.status == 'running' ? (isSuccess ? p.copyWith(status: 'completed') : p.copyWith(status: 'failed')) : p).toList();

             final isTurnFailed = !isSuccess && !isInterrupted;
             final dynamicErr = isTurnFailed ? (finalReply.isNotEmpty ? finalReply : 'Task ended with an error.') : null;
             if (isTurnFailed) {
               markPromptFailed(dynamicErr ?? 'Execution failed');
              } else {
                markPromptSent();
              }

              // Ensure all preceding user messages are confirmed sent
              for (int i = 0; i < _chatMessages.length; i++) {
                if (_chatMessages[i].sender == 'user' && (_chatMessages[i].deliveryStatus == 'sending' || _chatMessages[i].isPending)) {
                  _chatMessages[i] = _chatMessages[i].copyWith(deliveryStatus: 'sent', isPending: false);
                }
              }

              _replacePendingMessageImmediate(pendingId, ChatMessageModel(
                id: pendingId,
                sender: 'agent',
                text: finalText,
                timestamp: TimeOfDay.now().format(context),
                isPending: false,
                isError: isTurnFailed,
                modelName: selectedModelName,
                errorMessage: dynamicErr,
                reasoningText: finalReason,
                parts: finalizedParts,
                timelineEvents: List.from(accumulatedTimeline),
                questionData: currentQuestion,
                permissionData: currentPermission,
              ));
              if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
                final currentSessionId = _activeSessionId!;
                unawaited(_agentCoreService.saveSessionMessagesToCache(currentSessionId, _chatMessages));
                unawaited(Future.delayed(const Duration(milliseconds: 1200), () {
                  if (!mounted || _activeSessionId != currentSessionId) return;
                  if (_currentlyStreamingPendingId != null && _activePromptStreamSubscription != null) return;
                  _agentCoreService.fetchSession(currentSessionId);
                  _agentCoreService.fetchSessionMessages(currentSessionId, limit: 100).then((res) {
                    if (!mounted || _activeSessionId != currentSessionId) return;
                    if (_currentlyStreamingPendingId != null && _activePromptStreamSubscription != null) return;
                    final msgs = (res['messages'] as List<ChatMessageModel>?) ?? [];
                    if (msgs.isNotEmpty) {
                      setState(() {
                        final merged = _mergeMessagesPreservingLocal(_chatMessages, msgs);
                        _chatMessages.clear();
                        _chatMessages.addAll(merged);
                      });
                      unawaited(_agentCoreService.saveSessionMessagesToCache(currentSessionId, _chatMessages));
                    }
                  });
                }));
              }
              final finishedSess = _activeSessionId ?? sessionToSend ?? '';
              unawaited(PushNotificationService.instance.finishOngoingTurnNotification(
                sessionId: finishedSess,
                isSuccess: isSuccess,
                completionMessage: finalText.isNotEmpty ? finalText : (finalReply.isNotEmpty ? finalReply : 'Agent turn completed.'),
              ));
            }
            _currentlyStreamingPendingId = null;
            _activePromptStreamSubscription?.cancel();
            _activePromptStreamSubscription = null;
            if (!completer.isCompleted) completer.complete();

          // ── Session Title Updated by AvA Core ─────────────────────────────
          } else if (type == 'session_updated' || type == 'session.updated') {
            final sId = event['sessionId']?.toString() ?? event['sessionID']?.toString();
            final updatedTitle = event['title']?.toString();
            if (sId != null && updatedTitle != null && updatedTitle.isNotEmpty) {
              unawaited(_agentCoreService.updateCachedSessionTitle(sId, updatedTitle));
            }
          // ── Questions & Permissions ───────────────────────────────────────
          } else if (type == 'ask_question' || type == 'question.asked' || type == 'question.v2.asked' || type == 'Question.Event.Asked' || type.startsWith('question.')) {
            final rawQuestions = event['questions'] ?? event['properties']?['questions'] ?? event['info']?['questions'] ?? event['input']?['questions'];
            String questionText = 'Question';
            List<String> optionsList = [];
            if (rawQuestions is List && rawQuestions.isNotEmpty) {
              final firstQ = rawQuestions.first;
              if (firstQ is Map) {
                questionText = firstQ['question']?.toString() ?? firstQ['header']?.toString() ?? 'Question';
                final rawOpts = firstQ['options'] ?? event['options'] ?? event['properties']?['options'] ?? event['input']?['options'];
                if (rawOpts is List) {
                  for (final opt in rawOpts) {
                    if (opt is Map) {
                      optionsList.add(opt['label']?.toString() ?? opt['description']?.toString() ?? opt.toString());
                    } else if (opt != null) {
                      optionsList.add(opt.toString());
                    }
                  }
                }
              }
            }
            if (optionsList.isEmpty) {
              questionText = event['question']?.toString() ?? event['title']?.toString() ?? (questionText != 'Question' ? questionText : 'Question');
              final rawOpts = event['options'] ?? event['properties']?['options'] ?? event['input']?['options'];
              if (rawOpts is List) {
                for (final opt in rawOpts) {
                  if (opt is Map) {
                    optionsList.add(opt['label']?.toString() ?? opt['description']?.toString() ?? opt.toString());
                  } else if (opt != null) {
                    optionsList.add(opt.toString());
                  }
                }
              }
            }

            final reqId = event['id']?.toString() ?? event['requestID']?.toString() ?? 'que_${DateTime.now().millisecondsSinceEpoch}';
            currentQuestion = {
              'requestID': reqId,
              'id': reqId,
              'sessionID': event['sessionID']?.toString() ?? _activeSessionId,
              'question': questionText,
              'options': optionsList,
              'rawQuestions': rawQuestions,
              'answered': false,
            };

            accumulatedTimeline.add(AgentTimelineEvent(
              id: 'ev-${DateTime.now().microsecondsSinceEpoch}',
              type: 'ask_question',
              title: questionText,
              options: optionsList.isNotEmpty ? optionsList : null,
            ));
            _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
              timelineEvents: List.from(accumulatedTimeline),
              questionData: currentQuestion,
            ));

          } else if (type == 'permission_request' || type == 'permission.asked') {
            currentPermission = Map<String, dynamic>.from(event);
            accumulatedTimeline.add(AgentTimelineEvent(
              id: 'ev-${DateTime.now().microsecondsSinceEpoch}',
              type: 'permission_request',
              title: event['command']?.toString() ?? 'Permission Request',
              command: event['command']?.toString(),
              details: event['description']?.toString(),
            ));
            _applyPendingUpdate(pendingId, (msg) => msg.copyWith(
              timelineEvents: List.from(accumulatedTimeline),
              permissionData: currentPermission,
            ));

          // ── Forward-compat: session.next.* protocol events ─────────────────
          } else if (type == 'session.next.text.delta') {
            final delta = event['delta']?.toString() ?? '';
            if (delta.isNotEmpty) {
              accumulatedText += delta;
              _applyPendingUpdate(pendingId, (msg) => msg.copyWith(text: accumulatedText));
            }
          } else if (type == 'session.next.text.ended') {
            final fullText = event['text']?.toString() ?? '';
            if (fullText.isNotEmpty) {
              accumulatedText = fullText;
              _applyPendingUpdate(pendingId, (msg) => msg.copyWith(text: accumulatedText));
            }
          } else if (type == 'session.next.reasoning.delta') {
            final delta = event['delta']?.toString() ?? '';
            if (delta.isNotEmpty) {
              accumulatedReasoning += delta;
              final rText = accumulatedReasoning;
              _applyPendingUpdate(pendingId, (msg) {
                final updatedParts = List<MessagePartModel>.from(msg.parts);
                final rIdx = updatedParts.indexWhere((p) => p.type == 'reasoning' || p.type == 'thinking' || p.type == 'thought');
                if (rIdx != -1) {
                  updatedParts[rIdx] = updatedParts[rIdx].copyWith(text: rText, status: 'running');
                }
                return msg.copyWith(
                  reasoningText: rText,
                  parts: updatedParts,
                  isPending: true,
                );
              });
            }
          } else if (type == 'session.next.step.ended') {
            // Sub-step completed. Keep turn active as agent engine may be running tools
            // or preparing the continuation step.
          } else if (type == 'error' || type.toLowerCase().contains('error') || type == 'session.failed') {
            final errMsg = event['error']?.toString() ?? event['message']?.toString() ?? 'Agent execution error encountered.';
            markPromptFailed(errMsg);
            // ── Finish ongoing turn notification on error ──
            final errSessId = _activeSessionId ?? '';
            if (errSessId.isNotEmpty) {
              unawaited(PushNotificationService.instance.finishOngoingTurnNotification(
                sessionId: errSessId,
                isSuccess: false,
                completionMessage: errMsg,
              ));
            }
            if (mounted) {
              AppToast.error(context, 'AvA Core Error: $errMsg');
            }
            final errIdx = _chatMessages.indexWhere((m) => m.id == pendingId);
            if (errIdx != -1) {
              final currentMsg = _chatMessages[errIdx];
              final sourceParts = currentMsg.parts;
              final finalizedParts = sourceParts.map((p) => p.status == 'running' ? p.copyWith(status: 'failed') : p).toList();
              _replacePendingMessageImmediate(pendingId, ChatMessageModel(
                id: pendingId,
                sender: 'agent',
                text: accumulatedText.trim().isNotEmpty ? accumulatedText.trim() : (currentMsg.text.isNotEmpty ? currentMsg.text : errMsg),
                timestamp: TimeOfDay.now().format(context),
                isPending: false,
                isError: true,
                modelName: selectedModelName,
                errorMessage: errMsg,
                reasoningText: accumulatedReasoning.isNotEmpty ? accumulatedReasoning : currentMsg.reasoningText,
                parts: finalizedParts,
                timelineEvents: List.from(accumulatedTimeline),
                questionData: currentQuestion ?? currentMsg.questionData,
                permissionData: currentPermission ?? currentMsg.permissionData,
              ));
            }
            _currentlyStreamingPendingId = null;
            _activePromptStreamSubscription?.cancel();
            _activePromptStreamSubscription = null;
            if (!completer.isCompleted) completer.complete();

          } else if (type == 'session.next.step.failed') {
            final errMap = event['error'];
            final errMsg = errMap is Map ? (errMap['message']?.toString() ?? 'Step failed.') : (errMap?.toString() ?? 'Step failed.');
            markPromptFailed(errMsg);
            if (mounted) {
              AppToast.error(context, 'AvA Step Failed: $errMsg');
            }
            final failIdx = _chatMessages.indexWhere((m) => m.id == pendingId);
            if (failIdx != -1) {
              final currentMsg = _chatMessages[failIdx];
              final sourceParts = currentMsg.parts;
              final finalizedParts = sourceParts.map((p) => p.status == 'running' ? p.copyWith(status: 'failed') : p).toList();
              _replacePendingMessageImmediate(pendingId, ChatMessageModel(
                id: pendingId,
                sender: 'agent',
                text: accumulatedText.trim().isNotEmpty ? accumulatedText.trim() : (currentMsg.text.isNotEmpty ? currentMsg.text : errMsg),
                timestamp: TimeOfDay.now().format(context),
                isPending: false,
                isError: true,
                modelName: selectedModelName,
                errorMessage: errMsg,
                reasoningText: accumulatedReasoning.isNotEmpty ? accumulatedReasoning : currentMsg.reasoningText,
                parts: finalizedParts,
                timelineEvents: List.from(accumulatedTimeline),
                // Preserve question/permission data so sticky docks stay visible
                questionData: currentQuestion ?? currentMsg.questionData,
                permissionData: currentPermission ?? currentMsg.permissionData,
              ));
            }
            _currentlyStreamingPendingId = null;
            _activePromptStreamSubscription?.cancel();
            _activePromptStreamSubscription = null;
            if (!completer.isCompleted) completer.complete();
          }
        },
        onError: (err) {
          _currentlyStreamingPendingId = null;
          if (!mounted) {
            if (!completer.isCompleted) completer.complete();
            return;
          }
          final errStr = err.toString();
          markPromptFailed('Network error or connection dropped: $errStr');
          final catchSessId = _activeSessionId ?? '';
          if (catchSessId.isNotEmpty) {
            unawaited(PushNotificationService.instance.finishOngoingTurnNotification(
              sessionId: catchSessId,
              isSuccess: false,
              completionMessage: 'Connection dropped: $errStr',
            ));
          }
          AppToast.error(context, 'Network error or connection dropped: $err');
          final errFinalIdx = _chatMessages.indexWhere((m) => m.id == pendingId);
          if (errFinalIdx != -1) {
            final currentMsg = _chatMessages[errFinalIdx];
            final sourceParts = currentMsg.parts;
            final finalizedParts = sourceParts.map((p) => p.status == 'running' ? p.copyWith(status: 'failed') : p).toList();
            _replacePendingMessageImmediate(pendingId, ChatMessageModel(
              id: pendingId,
              sender: 'agent',
              text: accumulatedText.trim().isNotEmpty ? accumulatedText.trim() : (currentMsg.text.isNotEmpty ? currentMsg.text : 'Failed to communicate with agent server.'),
              timestamp: TimeOfDay.now().format(context),
              isPending: false,
              isError: true,
              modelName: selectedModelName,
              errorMessage: 'Network error or connection dropped: ${err.toString()}',
              reasoningText: accumulatedReasoning.isNotEmpty ? accumulatedReasoning : currentMsg.reasoningText,
              parts: finalizedParts,
              timelineEvents: List.from(accumulatedTimeline),
              // Preserve question/permission data so sticky docks stay visible after disconnect
              questionData: currentQuestion ?? currentMsg.questionData,
              permissionData: currentPermission ?? currentMsg.permissionData,
            ));
          }
          setState(() {
            for (int i = 0; i < _chatMessages.length; i++) {
              if (_chatMessages[i].isPending) {
                _chatMessages[i] = _chatMessages[i].copyWith(isPending: false);
              }
            }
          });
          if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
            unawaited(_agentCoreService.saveSessionMessagesToCache(_activeSessionId!, _chatMessages));
          }
          if (!completer.isCompleted) completer.complete();
        },
        onDone: () {
          if (mounted) {
            final idx = _chatMessages.indexWhere((m) => m.id == pendingId);
            if (idx != -1 && _chatMessages[idx].isPending) {
              final currentMsg = _chatMessages[idx];
              // If the turn didn't complete successfully (stream closed abnormally),
              // treat it as an error — the server may have crashed or the connection dropped.
              final bool incompleteTurn = !turnCompletedSuccessfully;
              final finalText = accumulatedText.trim().isNotEmpty
                  ? accumulatedText.trim()
                  : (currentMsg.text.isNotEmpty ? currentMsg.text : (incompleteTurn ? 'Response incomplete — connection may have dropped.' : 'Response completed.'));
              final finalizedParts = currentMsg.parts.map((p) => p.status == 'running' ? p.copyWith(status: incompleteTurn ? 'failed' : 'completed') : p).toList();
              _replacePendingMessageImmediate(pendingId, currentMsg.copyWith(
                isPending: false,
                isError: incompleteTurn,
                errorMessage: incompleteTurn ? 'Turn ended without completion signal — possible connection drop or server error.' : null,
                text: finalText,
                parts: finalizedParts,
                timelineEvents: List.from(accumulatedTimeline),
                reasoningText: accumulatedReasoning.trim().isNotEmpty ? accumulatedReasoning.trim() : currentMsg.reasoningText,
              ));
            }
            setState(() {
              for (int i = 0; i < _chatMessages.length; i++) {
                if (_chatMessages[i].isPending) {
                  _chatMessages[i] = _chatMessages[i].copyWith(isPending: false);
                }
              }
            });
            if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
              unawaited(_agentCoreService.saveSessionMessagesToCache(_activeSessionId!, _chatMessages));
            }
          }
          if (!completer.isCompleted) completer.complete();
        },
      );

      try {
        await completer.future.timeout(const Duration(minutes: 10), onTimeout: () {
          if (!completer.isCompleted) completer.complete();
        });
      } catch (e) { print('Ignored error: $e'); }

    } catch (err) {
      // ── Finish ongoing turn notification on exception ──
      final catchSessId = _activeSessionId ?? '';
      if (catchSessId.isNotEmpty) {
        unawaited(PushNotificationService.instance.finishOngoingTurnNotification(
          sessionId: catchSessId,
          isSuccess: false,
          completionMessage: 'Connection dropped: ${err.toString()}',
        ));
      }
      markPromptFailed('Network error: ${err.toString()}');
      if (mounted) {
        AppToast.error(context, 'Network error or connection dropped: $err');
        final errFinalIdx = _chatMessages.indexWhere((m) => m.id == pendingId);
        if (errFinalIdx != -1) {
          final currentMsg = _chatMessages[errFinalIdx];
          final sourceParts = currentMsg.parts;
          final finalizedParts = sourceParts.map((p) => p.status == 'running' ? p.copyWith(status: 'failed') : p).toList();
          _replacePendingMessageImmediate(pendingId, ChatMessageModel(
            id: pendingId,
            sender: 'agent',
            text: accumulatedText.trim().isNotEmpty ? accumulatedText.trim() : (currentMsg.text.isNotEmpty ? currentMsg.text : 'Failed to communicate with agent server.'),
            timestamp: TimeOfDay.now().format(context),
            isPending: false,
            isError: true,
            modelName: selectedModelName,
            errorMessage: 'Network error or connection dropped: ${err.toString()}',
            reasoningText: accumulatedReasoning.isNotEmpty ? accumulatedReasoning : currentMsg.reasoningText,
            parts: finalizedParts,
            timelineEvents: List.from(accumulatedTimeline),
            // Preserve question/permission data so sticky docks stay visible after disconnect
            questionData: currentQuestion ?? currentMsg.questionData,
            permissionData: currentPermission ?? currentMsg.permissionData,
          ));
        }
        setState(() {
          for (int i = 0; i < _chatMessages.length; i++) {
            if (_chatMessages[i].isPending) {
              _chatMessages[i] = _chatMessages[i].copyWith(isPending: false);
            }
          }
        });
        if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
          unawaited(_agentCoreService.saveSessionMessagesToCache(_activeSessionId!, _chatMessages));
        }
      }
    } finally {
      _isHandlingSendPrompt = false;
    }
  }

  Future<void> _handleSelectMode(String mode) async {
    final cleanMode = mode.trim().toUpperCase();
    if (cleanMode.isNotEmpty) {
      setState(() {
        _selectedMode = cleanMode;
      });
      // Surface a warning if the server rejected the change — previously this
      // was fire-and-forget and the UI showed the new mode regardless.
      final ok = await _agentCoreService.updateSandboxMode(cleanMode, sessionId: _activeSessionId);
      if (!ok && mounted) {
        AppToast.warning(context, 'Could not sync sandbox mode to server');
      }
    }
  }

  Future<void> _handlePermissionDecision(bool approved, String command, {String? requestId}) async {
    String? reqId = requestId;
    if (reqId == null || reqId.isEmpty) {
      for (int i = _chatMessages.length - 1; i >= 0; i--) {
        final perm = _chatMessages[i].permissionData;
        if (perm != null && perm['answered'] != true) {
          reqId = (perm['requestID'] ?? perm['id'])?.toString();
          break;
        }
      }
    }
    reqId ??= 'perm_${DateTime.now().millisecondsSinceEpoch}';

    await _agentCoreService.replyPermission(reqId, approved, sessionId: _activeSessionId, command: command);

    // If permission was approved, dynamically elevate the active sandbox permission in UI & context
    if (approved) {
      final cmdLower = command.toLowerCase();
      String targetMode = _selectedMode;
      if (cmdLower.contains('full_access') ||
          cmdLower.contains('full access') ||
          cmdLower.contains('sudo') ||
          cmdLower.contains('bash') ||
          cmdLower.contains('terminal') ||
          cmdLower.contains('apt') ||
          cmdLower.contains('systemctl') ||
          cmdLower.contains('pm2') ||
          cmdLower.contains('chmod') ||
          cmdLower.contains('install') ||
          _selectedMode == 'WORKSPACE_WRITE') {
        targetMode = 'FULL_ACCESS';
      } else if (_selectedMode == 'READ_ONLY') {
        targetMode = 'WORKSPACE_WRITE';
      }

      if (targetMode != _selectedMode) {
        setState(() {
          _selectedMode = targetMode;
        });
        final ok = await _agentCoreService.updateSandboxMode(targetMode, sessionId: _activeSessionId);
        if (!ok && mounted) {
          AppToast.warning(context, 'Could not sync sandbox mode to server');
        }
        if (mounted) {
          final modeName = targetMode == 'FULL_ACCESS' ? 'Full Access' : (targetMode == 'WORKSPACE_WRITE' ? 'Workspace Write' : 'Read Only');
          AppToast.success(context, 'Sandbox permission elevated to $modeName');
        }
      }
    }

    if (mounted) {
      setState(() {
        for (int i = 0; i < _chatMessages.length; i++) {
          final p = _chatMessages[i].permissionData;
          if (p != null && (p['requestID'] == reqId || p['id'] == reqId || p['command'] == command)) {
            final updated = Map<String, dynamic>.from(p);
            updated['answered'] = true;
            updated['decision'] = approved ? 'approved' : 'denied';
            _chatMessages[i] = _chatMessages[i].copyWith(permissionData: updated);
          }
        }
        if (_chatMessages.isNotEmpty) {
          final lastMsg = _chatMessages.last;
          if (lastMsg.sender != 'user' && !lastMsg.isPending && approved) {
            _chatMessages[_chatMessages.length - 1] = lastMsg.copyWith(isPending: true);
          }
        }
      });

      if (approved) {
        final partsCountSnapshot = _chatMessages.fold<int>(0, (acc, m) => acc + m.parts.length);
        Future.delayed(const Duration(milliseconds: 5000), () {
          if (!mounted) return;
          final stillActive = _chatMessages.any((m) => m.isPending);
          final partsCountNow = _chatMessages.fold<int>(0, (acc, m) => acc + m.parts.length);
          if (stillActive && partsCountNow == partsCountSnapshot) {
            _agentCoreService.sendPrompt(
              prompt: '[User approved permission for: "$command"] Please proceed with execution.',
              sessionId: _activeSessionId,
              mode: _selectedMode,
              agent: _selectedAgent,
            ).catchError((_) => null);
          }
        });
      }
    }
  }

  Future<void> _handleQuestionReplied(String requestId, String answer) async {
    // 1. Reply to the server question with session context
    await _agentCoreService.replyQuestion(requestId, answer, sessionId: _activeSessionId);

    // 2. Check if answer specifies or accepts a sandbox permission switch
    final ansLower = answer.trim().toLowerCase();
    String? targetMode;
    if (ansLower.contains('full access') || ansLower.contains('full_access')) {
      targetMode = 'FULL_ACCESS';
    } else if (ansLower.contains('workspace write') || ansLower.contains('workspace_write')) {
      targetMode = 'WORKSPACE_WRITE';
    } else if (ansLower.contains('read only') || ansLower.contains('read_only')) {
      targetMode = 'READ_ONLY';
    } else if (ansLower == 'allow' || ansLower == 'yes' || ansLower == 'approve') {
      // If user accepted a permission prompt question
      if (_selectedMode != 'FULL_ACCESS') {
        targetMode = 'FULL_ACCESS';
      }
    }

    if (targetMode != null && targetMode != _selectedMode) {
      setState(() {
        _selectedMode = targetMode!;
      });
      final ok = await _agentCoreService.updateSandboxMode(targetMode, sessionId: _activeSessionId);
      if (!ok && mounted) {
        AppToast.warning(context, 'Could not sync sandbox mode to server');
      }
      if (mounted) {
        final modeName = targetMode == 'FULL_ACCESS' ? 'Full Access' : (targetMode == 'WORKSPACE_WRITE' ? 'Workspace Write' : 'Read Only');
        AppToast.success(context, 'Sandbox permission switched to $modeName');
      }
    }

    // 3. Mark the question as answered in state
    if (mounted) {
      setState(() {
        bool found = false;
        for (int i = 0; i < _chatMessages.length; i++) {
          final q = _chatMessages[i].questionData;
          if (q != null && (q['requestID'] == requestId || q['id'] == requestId || _chatMessages[i].parts.any((p) => p.id == requestId))) {
            final updated = Map<String, dynamic>.from(q);
            updated['answered'] = true;
            updated['submittedAnswer'] = answer;
            final updatedParts = _chatMessages[i].parts.map((p) {
              final toolName = (p.tool ?? p.type).toLowerCase();
              if (p.id == requestId || toolName.contains('question')) {
                return p.copyWith(status: 'completed', output: answer);
              }
              return p;
            }).toList();
            _chatMessages[i] = _chatMessages[i].copyWith(questionData: updated, parts: updatedParts);
            found = true;
          }
        }
        if (!found) {
          for (int i = _chatMessages.length - 1; i >= 0; i--) {
            final q = _chatMessages[i].questionData;
            if (q != null && q['answered'] != true) {
              final updated = Map<String, dynamic>.from(q);
              updated['answered'] = true;
              updated['submittedAnswer'] = answer;
              final updatedParts = _chatMessages[i].parts.map((p) {
                final toolName = (p.tool ?? p.type).toLowerCase();
                if (p.id == requestId || toolName.contains('question')) {
                  return p.copyWith(status: 'completed', output: answer);
                }
                return p;
              }).toList();
              _chatMessages[i] = _chatMessages[i].copyWith(questionData: updated, parts: updatedParts);
              break;
            }
          }
        }
        // Keep assistant message active / pending so cooking animation displays while agent processes the answer
        if (_chatMessages.isNotEmpty) {
          final lastMsg = _chatMessages.last;
          if (lastMsg.sender != 'user' && !lastMsg.isPending) {
            _chatMessages[_chatMessages.length - 1] = lastMsg.copyWith(isPending: true);
          }
        }
      });

      // Guarantee agent resumes cooking with active UI streaming listener:
      _handleSendPrompt('[User answered question: "$answer"] Please continue and finish the task.');
    }
  }

  void _switchTab(int idx) {
    FocusScope.of(context).unfocus();
    FocusManager.instance.primaryFocus?.unfocus();
    if (_selectedNavIndex != idx) {
      setState(() => _selectedNavIndex = idx);
    }
  }

  void _showWorkspacePreferenceModal() {
    final isDark = AppTheme.isDark;
    final cardBg = AppTheme.cardBg;
    final borderColor = AppTheme.borderColor;
    final textPrimary = AppTheme.textPrimary;
    final textSecondary = AppTheme.textSecondary;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.90,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0C0C12) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(
            color: isDark ? Colors.white.withValues(alpha: 0.12) : Colors.black.withValues(alpha: 0.08),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: WorkspacePreferenceScreen(
          isDark: isDark,
          cardBg: cardBg,
          borderColor: borderColor,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
          vpsWorkspacePath: _vpsWorkspacePath,
          onUpdateWorkspacePath: (path) => _updateCoreService(newPath: path),
          agentCoreService: _agentCoreService,
          availableModels: _availableModels,
          selectedModel: _selectedModelItem,
          onSelectModel: _handleSelectModel,
          selectedMode: _selectedMode,
          onSelectMode: _handleSelectMode,
          onBackToChat: () => Navigator.of(ctx).pop(),
          onNewSession: ({workspacePath, mode}) {
            Navigator.of(ctx).pop();
            _handleCreateNewSession(mode: mode ?? _selectedMode, workspacePath: workspacePath ?? _vpsWorkspacePath);
          },
          onSelectFileForChat: (filePath) {
            Navigator.of(ctx).pop();
            setState(() => _pendingChatAttachment = filePath);
            _switchTab(0);
          },
          initialOpenFile: _pendingOpenFile,
          serverUrl: _serverUrl,
          activeSessionId: _activeSessionId,
          chatMessages: _chatMessages,
          onNavigateTab: (tab) {
            Navigator.of(ctx).pop();
            _switchTab(tab);
          },
          onSelectSession: (sess) {
            Navigator.of(ctx).pop();
            _handleSelectSession(sess);
          },
        ),
      ),
    );
  }

  void _showTerminalModal() {
    _switchTab(7);
  }

  void _handleSelectModel(AvaModelItem? m) async {
    if (m == null) return;
    setState(() => _selectedModelItem = m);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('ava_last_selected_model_id', m.id);
    if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
      final currentSess = _activeSessionId!;
      await prefs.setString('ava_session_model_$currentSess', m.id);
      unawaited(_agentCoreService.switchSessionModel(
        sessionId: currentSess,
        modelId: m.effectiveModelKey,
        providerId: m.effectiveProviderKey,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark;
    final cardBg = AppTheme.cardBg;
    final borderColor = AppTheme.borderColor;
    final textPrimary = AppTheme.textPrimary;
    final textSecondary = AppTheme.textSecondary;

    // Show branded splash screen while checking saved auth session
    if (_isCheckingSavedAuth) {
      return const MainSplashView();
    }

    // Render AuthScreen if user needs to authenticate or sign out
    if (!_isAuthenticated) {
      return AuthScreen(
        currentServerUrl: _serverUrl,
        currentWorkspacePath: _vpsWorkspacePath,
        onAuthenticateSuccess: (email, password, {serverUrl, workspacePath}) async {
          if (serverUrl != null && serverUrl.isNotEmpty && serverUrl != _serverUrl) {
            _serverUrl = serverUrl;
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('ava_custom_server_url', serverUrl);
          }
          if (workspacePath != null && workspacePath.isNotEmpty && workspacePath != _vpsWorkspacePath) {
            _vpsWorkspacePath = workspacePath;
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('ava_selected_workspace', workspacePath);
          }
          await _updateCoreService(newUrl: _serverUrl, newPath: _vpsWorkspacePath);
          _agentCoreService.setAuthCredentials(email, password);
          try {
            final prefs = await SharedPreferences.getInstance();
            final secureStorage = const FlutterSecureStorage();
            await prefs.setBool('ava_is_authenticated', true);
            
            // Clean up old plain-text credentials if they exist
            await prefs.remove('ava_auth_email');
            await prefs.remove('ava_auth_password');
            await prefs.remove('ava_auth_token');

            await secureStorage.write(key: 'ava_auth_email', value: email);
            await secureStorage.write(key: 'ava_auth_password', value: password);
            final token = _agentCoreService.authToken;
            if (token != null) {
              await secureStorage.write(key: 'ava_auth_token', value: token);
            }
          } catch (e) { print('Ignored error: $e'); }
          if (mounted) {
            setState(() {
              _isAuthenticated = true;
            });
          }
          await _initializeAgentCoreConnection();
        },
      );
    }

    return Scaffold(
      key: _scaffoldKey,
      resizeToAvoidBottomInset: true,
      drawerScrimColor: Colors.black.withValues(alpha: isDark ? 0.60 : 0.40),
      drawerEdgeDragWidth: 35.0,
      drawerEnableOpenDragGesture: true,
      drawer: DrawerNavigation(
        isDark: isDark,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        selectedNavIndex: _selectedNavIndex,
        onSelectNav: _switchTab,
        vpsWorkspacePath: _vpsWorkspacePath,
        onSelectWorkspacePath: (newPath) => _updateCoreService(newPath: newPath),
        onSignOut: () async {
          try {
            final prefs = await SharedPreferences.getInstance();
            final secureStorage = const FlutterSecureStorage();
            await prefs.remove('ava_is_authenticated');
            // Remove from both old SharedPreferences and new Secure Storage
            await prefs.remove('ava_auth_email');
            await prefs.remove('ava_auth_password');
            await prefs.remove('ava_auth_token');
            await secureStorage.delete(key: 'ava_auth_email');
            await secureStorage.delete(key: 'ava_auth_password');
            await secureStorage.delete(key: 'ava_auth_token');
          } catch (e) { print('Ignored error: $e'); }
          _agentCoreService.setAuthToken(null);
          _switchTab(0);
          if (mounted) {
            setState(() => _isAuthenticated = false);
          }
        },
        agentCoreService: _agentCoreService,
        activeSessionId: _activeSessionId,
        isTurnRunning: _isTurnRunning,
        onSelectSession: _handleSelectSession,
        onCreateNewSession: _handleCreateNewSession,
      ),
      body: SafeArea(
        bottom: false,
        child: GestureDetector(
          onTap: () {
            FocusScope.of(context).unfocus();
            FocusManager.instance.primaryFocus?.unfocus();
          },
          behavior: HitTestBehavior.translucent,
          child: Stack(
            children: [
              // ── Active Tab Content (Scrolls full height underneath floating glass header) ──
              Positioned.fill(
                child: _buildActiveTabContent(isDark, cardBg, borderColor, textPrimary, textSecondary),
              ),

              // ── Top Floating Glass Header Bar & Network Status ───────────────
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    HeaderBar(
                      isDark: isDark,
                      cardBg: cardBg,
                      borderColor: borderColor,
                      textPrimary: textPrimary,
                      textSecondary: textSecondary,
                      selectedModel: _selectedModelItem,
                      availableModels: _availableModels,
                      onSelectModel: _handleSelectModel,
                      onRefreshModels: _initializeAgentCoreConnection,
                      onNewSession: () => _handleCreateNewSession(mode: _selectedMode, workspacePath: _vpsWorkspacePath),
                      isCoreConnected: _isCoreConnected,
                      isReconnecting: _isReconnectingCore,
                      statusNotifier: _agentCoreService.connectionStatusNotifier,
                      onReconnectCore: _handleReconnectCore,
                      chatMessages: _chatMessages,
                      activeSessionId: _activeSessionId,
                      activeSessionTitle: _currentSessionTitle,
                      serverUrl: _agentCoreService.baseUrl,
                      onCompactSession: (_activeSessionId != null && _activeSessionId!.isNotEmpty)
                          ? () async {
                              final ok = await _agentCoreService.compactSession(
                                _activeSessionId!,
                                providerId: _selectedModelItem?.effectiveProviderKey,
                                modelId: _selectedModelItem?.effectiveModelKey,
                              );
                              if (ok) {
                                await _handleSelectSession({'id': _activeSessionId});
                              }
                            }
                          : null,
                      onOpenDrawer: () {
                        FocusScope.of(context).unfocus();
                        _scaffoldKey.currentState?.openDrawer();
                      },
                      onOpenWorkspacePreferences: _showWorkspacePreferenceModal,
                      onOpenTerminal: _showTerminalModal,
                      onOpenSystemHealth: () => _switchTab(5),
                    ),
                    NetworkStatusBar(
                      statusNotifier: _agentCoreService.connectionStatusNotifier,
                      onRetry: _handleReconnectCore,
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveTabContent(bool isDark, Color cardBg, Color borderColor, Color textPrimary, Color textSecondary) {
    return MainTabRouter(
      selectedNavIndex: _selectedNavIndex,
      isDark: isDark,
      cardBg: cardBg,
      borderColor: borderColor,
      textPrimary: textPrimary,
      textSecondary: textSecondary,
      serverUrl: _serverUrl,
      vpsWorkspacePath: _vpsWorkspacePath,
      agentCoreService: _agentCoreService,
      activeSessionId: _activeSessionId,
      isTurnRunning: _isTurnRunning,
      chatMessages: _chatMessages,
      selectedMode: _selectedMode,
      onSelectMode: _handleSelectMode,
      selectedAgent: _selectedAgent,
      onSelectAgent: (agent) => setState(() => _selectedAgent = agent),
      onNewSession: () => _handleCreateNewSession(mode: _selectedMode, workspacePath: _vpsWorkspacePath),
      onSendPrompt: _handleSendPrompt,
      onInterrupt: () {
        final sessId = _activeSessionId;
        _activePromptStreamSubscription?.cancel();
        _activePromptStreamSubscription = null;
        _activeSessionStreamSubscription?.cancel();
        _activeSessionStreamSubscription = null;
        _currentlyStreamingPendingId = null;
        _stopHeartbeat();
        _firstEventReceived = false;
        _rebuildThrottleTimer?.cancel();
        _rebuildScheduled = false;

        if (sessId != null && sessId.isNotEmpty) {
          unawaited(PushNotificationService.instance.finishOngoingTurnNotification(
            sessionId: sessId,
            isSuccess: false,
            completionMessage: 'Agent turn stopped by user.',
          ));
          unawaited(_agentCoreService.interruptSession(sessId));
        }

        setState(() {
          for (int i = 0; i < _chatMessages.length; i++) {
            if (_chatMessages[i].isPending) {
              final msg = _chatMessages[i];
              final finalizedParts = msg.parts.map((p) => p.status == 'running' ? p.copyWith(status: 'completed') : p).toList();
              final text = msg.text.trim().isNotEmpty ? msg.text : 'Turn stopped by user.';
              _chatMessages[i] = msg.copyWith(
                isPending: false,
                isError: false,
                errorMessage: null,
                text: text,
                parts: finalizedParts,
              );
            }
          }
        });

        if (sessId != null && sessId.isNotEmpty) {
          unawaited(_agentCoreService.saveSessionMessagesToCache(sessId, _chatMessages));
        }
      },
      onQuestionReplied: _handleQuestionReplied,
      onPermissionDecision: _handlePermissionDecision,
      onSwitchTab: _switchTab,
      onClearMessages: () {
        _activePromptStreamSubscription?.cancel();
        _activePromptStreamSubscription = null;
        _activeSessionStreamSubscription?.cancel();
        _activeSessionStreamSubscription = null;
        if (_activeSessionId != null && _activeSessionId!.isNotEmpty) {
          unawaited(_agentCoreService.interruptSession(_activeSessionId!));
        }
        _setActiveSessionId(null);
        setState(() => _chatMessages.clear());
      },
      onOpenFile: _handleOpenFile,
      onSelectSession: _handleSelectSession,
      selectedModel: _selectedModelItem,
      availableModels: _availableModels,
      onSelectModel: _handleSelectModel,
      reasoningEffort: _reasoningEffort,
      onSelectReasoningEffort: (effort) {
        setState(() => _reasoningEffort = effort);
        SharedPreferences.getInstance().then((p) => p.setString('ava_reasoning_effort', effort)).catchError((_) => false);
      },
      onRefreshModels: _initializeAgentCoreConnection,
      onUpdateCoreService: _updateCoreService,
      pendingOpenFile: _pendingOpenFile,
      pendingChatAttachment: _pendingChatAttachment,
      onSelectChatAttachment: (path) => setState(() => _pendingChatAttachment = path),
      onClearInitialAttachment: () {
        if (_pendingChatAttachment != null) {
          setState(() => _pendingChatAttachment = null);
        }
      },
    );
  }
}
