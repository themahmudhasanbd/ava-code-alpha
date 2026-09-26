import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/app_models.dart';
import '../services/agent_core_service.dart';
import '../services/push_notification_service.dart';
import '../services/native_agent_service.dart';
import '../theme/app_theme.dart';
import '../widgets/model_selector_modal.dart';
import '../widgets/permissions/permission_setup_sheet.dart';
import '../utils/app_toast.dart';
import '../config/app_config.dart';

class SettingsScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String serverUrl;
  final ValueChanged<String> onUpdateServerUrl;
  final String vpsWorkspacePath;
  final ValueChanged<String> onUpdateWorkspacePath;
  final AvaAgentCoreService agentCoreService;
  final List<AvaModelItem> availableModels;
  final AvaModelItem? currentActiveModel;
  final ValueChanged<AvaModelItem>? onSelectPrimaryModel;
  final String currentActiveMode;
  final ValueChanged<String>? onSelectAgentMode;

  const SettingsScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.serverUrl,
    required this.onUpdateServerUrl,
    required this.vpsWorkspacePath,
    required this.onUpdateWorkspacePath,
    required this.agentCoreService,
    this.availableModels = const [],
    this.currentActiveModel,
    this.onSelectPrimaryModel,
    this.currentActiveMode = 'build',
    this.onSelectAgentMode,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _serverUrlCtrl;
  late TextEditingController _workspacePathCtrl;

  bool _isLoading = false;
  bool _isSaving = false;

  // AI Models: Synced with app's active model
  AvaModelItem? _primaryModel;
  AvaModelItem? _fallbackModel;
  late String _agentMode;

  // Audio & Voice Fallback Settings
  late TextEditingController _audioGeminiKeyCtrl;
  bool _audioFallbackEnabled = true;
  bool _audioLocalSttEnabled = true;
  String _audioPreferredFormat = 'webm';
  bool _isTestingAudioKey = false;
  bool _obscureAudioKey = true;

  // Permissions (allow / ask / deny)
  String _permEdit = 'allow';
  String _permBash = 'allow';
  String _permTask = 'allow';
  String _permBrowser = 'allow';
  String _permExternalDir = 'allow';

  // Memory (SQLite FTS5)
  bool _memoryEnabled = true;
  String _memoryScope = 'global';
  bool _memoryAutoGenerate = true;

  // Language Server Protocol (LSP)
  bool _lspEnabled = true;
  bool _lspAutoRootDisable = true;

  // Preferences
  bool _autoSync = true;
  bool _haptics = true;
  bool _autoScroll = true;

  // Push Notifications (FCM)
  bool _pushEnabled = true;
  bool _scheduledPushEnabled = true;
  bool _agentCompletionPushEnabled = true;
  bool _isSendingTestPush = false;
  Map<String, dynamic>? _fcmStatus;

  @override
  void initState() {
    super.initState();
    _serverUrlCtrl = TextEditingController(text: widget.serverUrl);
    _workspacePathCtrl = TextEditingController(text: widget.vpsWorkspacePath);
    _audioGeminiKeyCtrl = TextEditingController();

    // Sync directly from app's active state
    _primaryModel = widget.currentActiveModel;
    _agentMode = widget.currentActiveMode.toLowerCase();

    // Load instantly from encrypted cache before network
    _loadFromLocalCache().then((_) {
      // Default fast fallback model if cache was empty
      if (_fallbackModel == null) _initFallbackModel();
      // Fetch latest from server
      _loadRemotePermissionsAndMemory();
    });
  }

  Future<void> _loadFromLocalCache() async {
    final cached = await widget.agentCoreService.loadSettingsFromCache();
    if (cached != null && mounted) {
      setState(() => _applySettingsMap(cached));
    }
  }

  void _applySettingsMap(Map<String, dynamic> settings) {
    if (settings['permission'] is Map) {
      final p = settings['permission'] as Map;
      _permEdit = p['edit']?.toString() ?? 'allow';
      _permBash = p['bash']?.toString() ?? 'allow';
      _permTask = p['task']?.toString() ?? 'allow';
      _permBrowser = p['browser']?.toString() ?? 'allow';
      _permExternalDir = p['external_directory']?.toString() ?? 'allow';
    }

    if (settings['memory'] is Map) {
      final mem = settings['memory'] as Map;
      _memoryEnabled = mem['enabled'] == true;
      _memoryScope = mem['scope']?.toString() ?? 'global';
      _memoryAutoGenerate = mem['auto_generate'] == true;
    }

    if (settings['lsp'] is Map) {
      final lsp = settings['lsp'] as Map;
      _lspEnabled = lsp['enabled'] != false;
      _lspAutoRootDisable = lsp['auto_root_disable'] != false;
    } else if (settings['lsp'] is bool) {
      _lspEnabled = settings['lsp'] as bool;
    }

    if (settings['small_model'] != null && widget.availableModels.isNotEmpty) {
      final smId = settings['small_model'].toString();
      _fallbackModel = widget.availableModels.firstWhere(
        (m) => '${m.provider}/${m.id}' == smId || m.id == smId,
        orElse: () => _fallbackModel ?? widget.availableModels.first,
      );
    }

    if (settings['audio'] is Map) {
      final a = settings['audio'] as Map;
      _audioGeminiKeyCtrl.text = a['gemini_api_key']?.toString() ?? '';
      _audioFallbackEnabled = a['fallback_enabled'] != false;
      _audioLocalSttEnabled = a['local_stt_enabled'] != false;
      _audioPreferredFormat = a['format']?.toString() ?? 'webm';
    }
  }

  void _initFallbackModel() {
    if (widget.availableModels.isNotEmpty) {
      _fallbackModel = widget.availableModels.firstWhere(
        (m) => m.id.contains('fast') || m.id.contains('flash') || m.id.contains('mini'),
        orElse: () => widget.availableModels.first,
      );
    }
  }

  @override
  void didUpdateWidget(covariant SettingsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.currentActiveModel != null && widget.currentActiveModel != _primaryModel) {
      setState(() => _primaryModel = widget.currentActiveModel);
    }
    if (widget.currentActiveMode != oldWidget.currentActiveMode) {
      setState(() => _agentMode = widget.currentActiveMode.toLowerCase());
    }
  }

  Future<void> _loadRemotePermissionsAndMemory() async {
    setState(() => _isLoading = true);
    final settings = await widget.agentCoreService.fetchSettings();
    final fcm = await widget.agentCoreService.fetchFcmStatus();
    final sched = await widget.agentCoreService.fetchSchedulerSettings();

    if (mounted) {
      setState(() {
        if (settings != null) {
          _applySettingsMap(settings);
        }

        _fcmStatus = fcm.isNotEmpty ? fcm : _fcmStatus;
        if (sched.containsKey('globalPushNotifications')) {
          _scheduledPushEnabled = sched['globalPushNotifications'] != false;
        }

        _isLoading = false;
      });
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);

    // Apply immediate local changes
    final newUrl = _serverUrlCtrl.text.trim();
    final newPath = _workspacePathCtrl.text.trim();
    widget.onUpdateServerUrl(newUrl);
    widget.onUpdateWorkspacePath(newPath);

    if (_primaryModel != null && widget.onSelectPrimaryModel != null) {
      widget.onSelectPrimaryModel!(_primaryModel!);
    }
    if (widget.onSelectAgentMode != null) {
      widget.onSelectAgentMode!(_agentMode);
    }

    // Persist to server config (/root/.ava-code/ava-code.json)
    final payload = {
      'model': _primaryModel != null ? '${_primaryModel!.provider}/${_primaryModel!.id}' : 'omniroute/powerful-coding-combo',
      'small_model': _fallbackModel != null ? '${_fallbackModel!.provider}/${_fallbackModel!.id}' : 'omniroute/fast-combo',
      'default_agent': _agentMode,
      'workspacePath': newPath,
      'memory': {
        'enabled': _memoryEnabled,
        'scope': _memoryScope,
        'auto_generate': _memoryAutoGenerate,
      },
      'permission': {
        'edit': _permEdit,
        'bash': _permBash,
        'task': _permTask,
        'browser': _permBrowser,
        'external_directory': _permExternalDir,
        '*': 'allow',
      },
      'lsp': {
        'enabled': _lspEnabled,
        'auto_root_disable': _lspAutoRootDisable,
      },
      'audio': {
        'gemini_api_key': _audioGeminiKeyCtrl.text.trim(),
        'fallback_enabled': _audioFallbackEnabled,
        'local_stt_enabled': _audioLocalSttEnabled,
        'format': _audioPreferredFormat,
      },
    };

    final results = await Future.wait([
      widget.agentCoreService.updateSettings(payload),
      widget.agentCoreService.updateSchedulerSettings({
        'globalPushNotifications': _scheduledPushEnabled,
      }),
    ]);

    final ok = results.first;

    if (mounted) {
      setState(() => _isSaving = false);
      if (ok) {
        AppToast.success(context, 'Configuration saved and active!');
      } else {
        AppToast.warning(context, 'Saved locally (server sync notice).');
      }
    }
  }

  void _openPrimaryModelPicker() {
    showModelSelectorModal(
      context: context,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      availableModels: widget.availableModels,
      selectedModel: _primaryModel,
      onSelectModel: (m) {
        setState(() => _primaryModel = m);
        if (widget.onSelectPrimaryModel != null) {
          widget.onSelectPrimaryModel!(m);
        }
      },
    );
  }

  void _openFallbackModelPicker() {
    showModelSelectorModal(
      context: context,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      availableModels: widget.availableModels,
      selectedModel: _fallbackModel,
      onSelectModel: (m) {
        setState(() => _fallbackModel = m);
      },
    );
  }

  Future<void> _handleSendTestPush() async {
    setState(() => _isSendingTestPush = true);
    try {
      // 1. Ensure current device token is synced with active core service
      await PushNotificationService.instance.syncTokenWithService(widget.agentCoreService, force: true);

      // 2. Dispatch test notification from backend
      final res = await widget.agentCoreService.sendTestPushNotification();
      if (!mounted) return;

      final status = res['status']?.toString();
      final message = res['message']?.toString() ?? 'Test notification triggered.';

      if (status == 'ok') {
        AppToast.success(context, message);
      } else if (status == 'warning') {
        AppToast.warning(context, message);
      } else {
        AppToast.error(context, message);
      }

      // 3. Also trigger local test notification heads-up
      if (PushNotificationService.instance.isInitialized) {
        await PushNotificationService.instance.showLocalNotification(
          title: 'AvA Code Mobile',
          body: 'Push notification service test active on this device.',
        );
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Test failed: $e');
      }
    } finally {
      if (mounted) setState(() => _isSendingTestPush = false);
    }
  }

  Future<void> _showNativeDebugLog(BuildContext ctx) async {
    final log = await NativeAgentService.instance.getDebugLog();
    if (!mounted) return;
    // Use State's own context (guarded by mounted above) to avoid async gap lint
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            const Icon(LucideIcons.terminalSquare, size: 16, color: Color(0xFFF59E0B)),
            const SizedBox(width: 8),
            Text('Native Debug Log', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: widget.textPrimary)),
            const Spacer(),
            IconButton(
              icon: const Icon(LucideIcons.trash2, size: 14, color: Color(0xFFEF4444)),
              tooltip: 'Clear log',
              onPressed: () async {
                await NativeAgentService.instance.clearDebugLog();
                if (dialogCtx.mounted) Navigator.pop(dialogCtx);
                if (mounted) AppToast.success(context, 'Debug log cleared');
              },
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          height: 400,
          child: SingleChildScrollView(
            child: SelectableText(
              log,
              style: TextStyle(fontSize: 10.5, fontFamily: 'monospace', color: widget.textPrimary.withValues(alpha: 0.85)),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Close', style: TextStyle(color: Color(0xFF6366F1))),
          ),
        ],
      ),
    );
  }

  Future<void> _testGeminiAudioKey() async {
    final key = _audioGeminiKeyCtrl.text.trim();
    if (key.isEmpty) {
      AppToast.warning(context, 'Please enter a Gemini API key to test');
      return;
    }
    setState(() => _isTestingAudioKey = true);
    try {
      final res = await widget.agentCoreService.testGeminiAudioKey(key);
      if (!mounted) return;
      if (res['success'] == true) {
        AppToast.success(context, res['message'] ?? 'Gemini Audio Key verified successfully!');
      } else {
        AppToast.error(context, res['message'] ?? 'Gemini Audio Key test failed');
      }
    } finally {
      if (mounted) setState(() => _isTestingAudioKey = false);
    }
  }

  Future<void> _handlePurgeOldSessions() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            const Icon(LucideIcons.trash2, size: 18, color: Color(0xFFEF4444)),
            const SizedBox(width: 8),
            Text(
              'Remove 1 Month Old Data',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: widget.textPrimary),
            ),
          ],
        ),
        content: Text(
          'This will remove all locally stored session data and message history older than 30 days. Active sessions will not be affected.\n\nAre you sure you want to proceed?',
          style: TextStyle(fontSize: 12, color: widget.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: const Text('Delete Old Data', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      final purgedCount = await widget.agentCoreService.purgeSessionsOlderThanOneMonth();
      if (mounted) {
        AppToast.success(context, 'Successfully removed $purgedCount old session records/data (30+ days old)');
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to purge old sessions: $e');
      }
    }
  }

  @override
  void dispose() {
    _serverUrlCtrl.dispose();
    _workspacePathCtrl.dispose();
    _audioGeminiKeyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.transparent,
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Settings',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: widget.textPrimary,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Host environment, AI models, and execution guardrails',
                        style: TextStyle(fontSize: 12, color: widget.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (_isLoading)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
                  )
                else
                  IconButton(
                    icon: Icon(LucideIcons.refreshCw, size: 16, color: widget.textSecondary),
                    onPressed: _loadRemotePermissionsAndMemory,
                    tooltip: 'Reload Settings',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  ),
              ],
            ),
            const SizedBox(height: 18),

            // ── Section 1: AI Model Orchestration ─────────────────────────────
            _buildCategoryHeader('AI MODEL ORCHESTRATION'),
            const SizedBox(height: 8),
            _buildContainer([
              // Primary Model Selector Card
              _buildModelSelectorTile(
                title: 'Primary AI Model',
                subtitle: 'Active model for generation and tool orchestration',
                model: _primaryModel,
                badge: 'ACTIVE',
                onTap: _openPrimaryModelPicker,
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              // Fast Fallback Model Selector Card
              _buildModelSelectorTile(
                title: 'Fast / Fallback Model',
                subtitle: 'Subagents, title generation, and quick edits',
                model: _fallbackModel,
                badge: 'FAST',
                onTap: _openFallbackModelPicker,
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              // Agent Mode Selector
              _buildAgentModeTile(),
            ]),
            const SizedBox(height: 22),

            // ── Section 2: Autonomous Permissions & Guardrails ────────────────
            _buildCategoryHeader('AUTONOMOUS GUARDRAILS & PERMISSIONS'),
            const SizedBox(height: 8),
            _buildContainer([
              _buildPermissionTile('File System Modification', 'edit', _permEdit, (v) => setState(() => _permEdit = v)),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildPermissionTile('Bash Shell Execution', 'bash', _permBash, (v) => setState(() => _permBash = v)),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildPermissionTile('Background Tasks', 'task', _permTask, (v) => setState(() => _permTask = v)),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildPermissionTile('Headless Browser', 'browser', _permBrowser, (v) => setState(() => _permBrowser = v)),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildPermissionTile('External Directories', 'external_dir', _permExternalDir, (v) => setState(() => _permExternalDir = v)),
            ]),
            const SizedBox(height: 22),

            // ── Section 3: Host Environment & Workspace ───────────────────────
            _buildCategoryHeader('HOST ENVIRONMENT & WORKSPACE'),
            const SizedBox(height: 8),
            _buildContainer([
              _buildTextSettingTile(
                label: 'Core API Endpoint',
                controller: _serverUrlCtrl,
                hint: AppConfig.defaultProductionUrl,
                icon: LucideIcons.globe,
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildTextSettingTile(
                label: 'Default VPS Workspace',
                controller: _workspacePathCtrl,
                hint: AppConfig.defaultWorkspacePath,
                icon: LucideIcons.folder,
              ),
            ]),
            const SizedBox(height: 22),

            // ── Section 4: Persistent Memory Engine ───────────────────────────
            _buildCategoryHeader('PERSISTENT PROJECT MEMORY (SQLITE FTS5)'),
            const SizedBox(height: 8),
            _buildContainer([
              _buildSwitchTile(
                title: 'Memory Engine Enabled',
                subtitle: 'Cross-session recall of decisions and architectural rules',
                value: _memoryEnabled,
                onChanged: (v) => setState(() => _memoryEnabled = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildSwitchTile(
                title: 'Auto-Generate Learnings',
                subtitle: 'Automatically index bug fixes and conventions',
                value: _memoryAutoGenerate,
                onChanged: (v) => setState(() => _memoryAutoGenerate = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildScopeTile(),
            ]),
            const SizedBox(height: 22),

            // ── Section 5: Language Server Protocol (LSP) ────────────────────
            _buildCategoryHeader('LANGUAGE SERVER PROTOCOL (LSP)'),
            const SizedBox(height: 8),
            _buildContainer([
              _buildSwitchTile(
                title: 'Enable LSP Intelligence',
                subtitle: 'Provides real-time types, symbol search, definitions & diagnostics',
                value: _lspEnabled,
                onChanged: (v) => setState(() => _lspEnabled = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildSwitchTile(
                title: 'Auto-Disable in Root (/root, /)',
                subtitle: 'Keeps LSP off in root to prevent memory spikes & full-disk traversal; auto-enabled in other project folders',
                value: _lspAutoRootDisable,
                onChanged: (v) => setState(() => _lspAutoRootDisable = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.code,
                      size: 16,
                      color: (_lspEnabled && (!(_lspAutoRootDisable && (widget.vpsWorkspacePath == '/root' || widget.vpsWorkspacePath == '/'))))
                          ? const Color(0xFF10B981)
                          : const Color(0xFFF59E0B),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Active Workspace LSP Mode',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: widget.textPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            (_lspAutoRootDisable && (widget.vpsWorkspacePath == '/root' || widget.vpsWorkspacePath == '/'))
                                ? 'Off (Root Safety Mode Protected)'
                                : _lspEnabled
                                    ? 'Active (TypeScript, Pyright, Gopls, Rust)'
                                    : 'Disabled Globally in Settings',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: (_lspEnabled && (!(_lspAutoRootDisable && (widget.vpsWorkspacePath == '/root' || widget.vpsWorkspacePath == '/'))))
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFFF59E0B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ]),
            const SizedBox(height: 22),

            // ── Section 6: Audio & Voice Transcription ──────────────────────
            _buildCategoryHeader('AUDIO & VOICE TRANSCRIPTION (AI FALLBACK)'),
            const SizedBox(height: 8),
            _buildContainer([
              _buildAudioGeminiKeyTile(),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildSwitchTile(
                title: 'Gemini Audio Auto-Fallback',
                subtitle: 'If active AI model does not support audio input, auto-transcribes voice note using Gemini API',
                value: _audioFallbackEnabled,
                onChanged: (v) => setState(() => _audioFallbackEnabled = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildSwitchTile(
                title: 'Local STT Engine Fallback',
                subtitle: 'If Gemini API is unreachable, attempts local Whisper/STT engine on VPS host',
                value: _audioLocalSttEnabled,
                onChanged: (v) => setState(() => _audioLocalSttEnabled = v),
              ),
            ]),
            const SizedBox(height: 22),

            // ── Section 7: Interface & Preferences ────────────────────────────
            _buildCategoryHeader('INTERFACE & ERGONOMICS'),
            const SizedBox(height: 8),
            _buildContainer([
              _buildSwitchTile(
                title: 'Dark Theme',
                subtitle: 'Toggle dark mode appearance',
                value: widget.isDark,
                onChanged: (val) {
                  AppTheme.setTheme(val ? AvaThemePreset.openCodeDark : AvaThemePreset.openCodeLight);
                },
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildSwitchTile(
                title: 'Auto-Scroll Streaming',
                subtitle: 'Keep chat viewport anchored to latest output',
                value: _autoScroll,
                onChanged: (v) => setState(() => _autoScroll = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildSwitchTile(
                title: 'Haptic Feedback',
                subtitle: 'Vibration feedback on tap actions',
                value: _haptics,
                onChanged: (v) => setState(() => _haptics = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
              _buildSwitchTile(
                title: 'Auto-Sync on Launch',
                subtitle: 'Update models and catalog upon startup',
                value: _autoSync,
                onChanged: (v) => setState(() => _autoSync = v),
              ),
            ]),
            const SizedBox(height: 20),

            _buildCategoryHeader('PUSH NOTIFICATIONS (FIREBASE FCM)'),
            const SizedBox(height: 8),
            _buildContainer([
              // Master Push Notifications Switch
              _buildSwitchTile(
                title: 'Master Push Notifications',
                subtitle: 'Enable or disable all push notifications for this mobile device',
                icon: LucideIcons.bell,
                iconColor: const Color(0xFF6366F1),
                value: _pushEnabled,
                onChanged: (v) => setState(() => _pushEnabled = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),

              // Scheduled Task Alerts Switch
              _buildSwitchTile(
                title: 'Scheduled Task Alerts',
                subtitle: 'Receive push alerts when background scheduled jobs start, finish, or encounter errors',
                icon: LucideIcons.clock,
                iconColor: const Color(0xFFF59E0B),
                value: _scheduledPushEnabled,
                onChanged: (v) {
                  setState(() => _scheduledPushEnabled = v);
                  widget.agentCoreService.updateSchedulerSettings({'globalPushNotifications': v});
                },
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),

              // Agent Turn Completion Switch
              _buildSwitchTile(
                title: 'Agent Turn Completion',
                subtitle: 'Alert when an interactive agent session finishes execution or tool invocation',
                icon: LucideIcons.bot,
                iconColor: const Color(0xFF10B981),
                value: _agentCompletionPushEnabled,
                onChanged: (v) => setState(() => _agentCompletionPushEnabled = v),
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),

              // Ongoing Live Turn Notification Toggle
              _buildSwitchTile(
                title: 'Live Turn Notification',
                subtitle: 'Show ongoing notification in system tray with live timer and tool events while agent is running',
                icon: LucideIcons.activity,
                iconColor: const Color(0xFF6366F1),
                value: PushNotificationService.instance.ongoingNotificationsEnabled,
                onChanged: (v) async {
                  await PushNotificationService.instance.setOngoingNotificationsEnabled(v);
                  setState(() {});
                },
              ),
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),

              // FCM Device Status & Diagnostics Card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status Badge Row
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: (PushNotificationService.instance.fcmToken != null
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFF59E0B))
                                .withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            PushNotificationService.instance.fcmToken != null
                                ? LucideIcons.circleCheck
                                : LucideIcons.bellRing,
                            size: 15,
                            color: PushNotificationService.instance.fcmToken != null
                                ? const Color(0xFF10B981)
                                : const Color(0xFFF59E0B),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                PushNotificationService.instance.fcmToken != null
                                    ? 'FCM Device Token Active'
                                    : 'FCM Registration Pending',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                  color: widget.textPrimary,
                                ),
                              ),
                              Text(
                                PushNotificationService.instance.fcmToken != null
                                    ? 'Registered with AvA Core push gateway'
                                    : 'Awaiting device token sync from Firebase',
                                style: TextStyle(fontSize: 10.5, color: widget.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: (PushNotificationService.instance.fcmToken != null
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFF59E0B))
                                .withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            PushNotificationService.instance.fcmToken != null ? 'ACTIVE' : 'STANDBY',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: PushNotificationService.instance.fcmToken != null
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFFF59E0B),
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Token Snippet & Copy Action
                    if (PushNotificationService.instance.fcmToken != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: widget.borderColor.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: widget.borderColor.withValues(alpha: 0.5), width: 0.7),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.keyRound, size: 12, color: Color(0xFF6366F1)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                PushNotificationService.instance.fcmToken!,
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontFamily: 'monospace',
                                  color: widget.textPrimary.withValues(alpha: 0.85),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 4),
                            InkWell(
                              onTap: () {
                                final token = PushNotificationService.instance.fcmToken;
                                if (token != null) {
                                  Clipboard.setData(ClipboardData(text: token));
                                  AppToast.success(context, 'FCM device token copied to clipboard!');
                                }
                              },
                              borderRadius: BorderRadius.circular(4),
                              child: Padding(
                                padding: const EdgeInsets.all(4),
                                child: Icon(LucideIcons.copy, size: 12, color: widget.textSecondary),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Gateway Diagnostics Info
                    if (_fcmStatus != null && _fcmStatus!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Firebase: ${_fcmStatus!['projectId'] ?? 'ava-code'}',
                              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: widget.textSecondary),
                            ),
                            Text(
                              'Devices: ${_fcmStatus!['registeredDevices'] ?? 1}',
                              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: widget.textPrimary),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),

                    // Send Test Notification Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 38,
                      child: OutlinedButton.icon(
                        onPressed: _isSendingTestPush ? null : _handleSendTestPush,
                        icon: _isSendingTestPush
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
                              )
                            : const Icon(LucideIcons.bellRing, size: 14, color: Color(0xFF6366F1)),
                        label: Text(
                          _isSendingTestPush ? 'Sending Test Push...' : 'Send Test Push Notification',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF6366F1)),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: const Color(0xFF6366F1).withValues(alpha: 0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.05),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Manage Device Permissions & Background Stability
                    SizedBox(
                      width: double.infinity,
                      height: 38,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          PermissionSetupSheet.show(
                            context,
                            isDark: widget.isDark,
                            cardBg: widget.cardBg,
                            borderColor: widget.borderColor,
                            textPrimary: widget.textPrimary,
                            textSecondary: widget.textSecondary,
                          );
                        },
                        icon: const Icon(LucideIcons.shieldCheck, size: 14, color: Color(0xFF10B981)),
                        label: const Text(
                          'Device Permissions & Background Stability',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF10B981)),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          backgroundColor: const Color(0xFF10B981).withValues(alpha: 0.05),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // View Native Debug Log Button
                    SizedBox(
                      width: double.infinity,
                      height: 38,
                      child: OutlinedButton.icon(
                        onPressed: () => _showNativeDebugLog(context),
                        icon: const Icon(LucideIcons.terminalSquare, size: 14, color: Color(0xFFF59E0B)),
                        label: const Text(
                          'View Native Debug Log',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFF59E0B)),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          backgroundColor: const Color(0xFFF59E0B).withValues(alpha: 0.05),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ]),
            const SizedBox(height: 16),

            // ── Storage & Local Data Management ──────────────────────────────
            _buildCategoryHeader('STORAGE & LOCAL DATA (ENCRYPTED)'),
            const SizedBox(height: 8),
            _buildContainer([
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.shieldCheck, size: 16, color: Color(0xFF10B981)),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Encrypted Local Session Cache',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: widget.textPrimary),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'All session lists and message history are automatically stored with AES-CBC local encryption on disk.',
                      style: TextStyle(fontSize: 10.5, color: widget.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 38,
                      child: OutlinedButton.icon(
                        onPressed: _handlePurgeOldSessions,
                        icon: const Icon(LucideIcons.trash2, size: 14, color: Color(0xFFEF4444)),
                        label: const Text(
                          'Remove 1 Month Old Session Data',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFEF4444)),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: const Color(0xFFEF4444).withValues(alpha: 0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          backgroundColor: const Color(0xFFEF4444).withValues(alpha: 0.05),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ]),
            const SizedBox(height: 26),

            // ── Save & Apply Button ───────────────────────────────────────────
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                onPressed: _isSaving ? null : _saveSettings,
                icon: _isSaving
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(LucideIcons.check, size: 16, color: Colors.white),
                label: Text(
                  _isSaving ? 'Saving Changes...' : 'Save & Apply Configuration',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // ─── Reusable Components ───────────────────────────────────────────────────

  Widget _buildCategoryHeader(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: widget.textSecondary.withValues(alpha: 0.8),
        letterSpacing: 0.6,
      ),
    );
  }

  Widget _buildContainer(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: widget.borderColor, width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildModelSelectorTile({
    required String title,
    required String subtitle,
    required AvaModelItem? model,
    required String badge,
    required VoidCallback onTap,
  }) {
    final displayName = model?.name ?? 'Select Model';
    final provider = model?.provider ?? 'Provider';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: widget.textPrimary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          badge,
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 11, color: widget.textSecondary),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: widget.borderColor.withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          provider.toUpperCase(),
                          style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: widget.textSecondary),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          displayName,
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: widget.textPrimary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(LucideIcons.chevronRight, size: 16, color: widget.textSecondary),
          ],
        ),
      ),
    );
  }

  Widget _buildAgentModeTile() {
    final modes = ['build', 'plan', 'chat', 'general'];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Default Execution Mode',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: widget.textPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  'Standard workflow state on new conversations',
                  style: TextStyle(fontSize: 11, color: widget.textSecondary),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: widget.borderColor.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: modes.map((m) {
                final isSel = _agentMode == m;
                return InkWell(
                  onTap: () {
                    setState(() => _agentMode = m);
                    if (widget.onSelectAgentMode != null) widget.onSelectAgentMode!(m);
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isSel ? const Color(0xFF6366F1) : Colors.transparent,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      m.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: isSel ? Colors.white : widget.textSecondary,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionTile(
    String title,
    String key,
    String currentValue,
    ValueChanged<String> onChanged,
  ) {
    final options = ['allow', 'ask', 'deny'];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: widget.textPrimary),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: widget.borderColor.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(7),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: options.map((opt) {
                final isSel = currentValue == opt;
                Color activeBg = const Color(0xFF10B981);
                if (opt == 'ask') activeBg = const Color(0xFFF59E0B);
                if (opt == 'deny') activeBg = const Color(0xFFEF4444);

                return InkWell(
                  onTap: () => onChanged(opt),
                  borderRadius: BorderRadius.circular(5),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isSel ? activeBg : Colors.transparent,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      opt.toUpperCase(),
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: isSel ? Colors.white : widget.textSecondary,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextSettingTile({
    required String label,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: widget.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: widget.textSecondary),
                ),
                TextField(
                  controller: controller,
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: widget.textPrimary),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: const EdgeInsets.only(top: 3, bottom: 2),
                    border: InputBorder.none,
                    hintText: hint,
                    hintStyle: TextStyle(fontSize: 12, color: widget.textSecondary.withValues(alpha: 0.5)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    IconData? icon,
    Color? iconColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: (iconColor ?? const Color(0xFF6366F1)).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 15, color: iconColor ?? const Color(0xFF6366F1)),
            ),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: widget.textPrimary),
                ),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 10.5, color: widget.textSecondary),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: const Color(0xFF6366F1),
          ),
        ],
      ),
    );
  }

  Widget _buildScopeTile() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Memory Scope',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: widget.textPrimary),
                ),
                Text(
                  'Global (all projects) vs Project-isolated',
                  style: TextStyle(fontSize: 10.5, color: widget.textSecondary),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: widget.borderColor.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(7),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: ['global', 'project'].map((s) {
                final isSel = _memoryScope == s;
                return InkWell(
                  onTap: () => setState(() => _memoryScope = s),
                  borderRadius: BorderRadius.circular(5),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: isSel ? const Color(0xFF6366F1) : Colors.transparent,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      s.toUpperCase(),
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: isSel ? Colors.white : widget.textSecondary,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAudioGeminiKeyTile() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.sparkles, size: 16, color: Color(0xFFA855F7)),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Gemini Audio Fallback API Key',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: widget.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Dedicated key used for instant voice prompt transcription when model is text-only',
                      style: TextStyle(fontSize: 10.5, color: widget.textSecondary),
                    ),
                  ],
                ),
              ),
              if (_isTestingAudioKey)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFA855F7)),
                )
              else
                TextButton(
                  onPressed: _testGeminiAudioKey,
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text(
                    'TEST KEY',
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFFA855F7)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            decoration: BoxDecoration(
              color: widget.borderColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: widget.borderColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _audioGeminiKeyCtrl,
                    obscureText: _obscureAudioKey,
                    style: TextStyle(fontSize: 12, fontFamily: 'JetBrainsMono', color: widget.textPrimary),
                    decoration: InputDecoration(
                      isDense: true,
                      border: InputBorder.none,
                      hintText: 'AIzaSy... (Gemini Flash Audio API Key)',
                      hintStyle: TextStyle(fontSize: 11.5, color: widget.textSecondary.withValues(alpha: 0.4)),
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(
                    _obscureAudioKey ? LucideIcons.eye : LucideIcons.eyeOff,
                    size: 14,
                    color: widget.textSecondary,
                  ),
                  onPressed: () => setState(() => _obscureAudioKey = !_obscureAudioKey),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
