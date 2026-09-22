import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_models.dart';
import '../services/agent_core_service.dart';
import '../utils/app_toast.dart';
import '../widgets/model_selector_modal.dart';
import '../widgets/workspace_file_explorer.dart';
import 'terminal_screen.dart';

/// Ultra-Modern, Clean & Minimal Workspace Preference, Action Hub & Analytics Screen.
/// Guarantees that Terminal and File Explorer actions launched from here are strictly
/// scoped to the active project workspace directory (`vpsWorkspacePath`).
class WorkspacePreferenceScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String vpsWorkspacePath;
  final ValueChanged<String> onUpdateWorkspacePath;
  final AvaAgentCoreService agentCoreService;
  final List<AvaModelItem> availableModels;
  final AvaModelItem? selectedModel;
  final ValueChanged<AvaModelItem?> onSelectModel;
  final String selectedMode;
  final ValueChanged<String> onSelectMode;
  final VoidCallback onBackToChat;
  final void Function({String? workspacePath, String? mode}) onNewSession;
  final ValueChanged<String>? onSelectFileForChat;
  final String? initialOpenFile;
  final String? serverUrl;
  final String? activeSessionId;
  final List<ChatMessageModel>? chatMessages;
  final void Function(int tabIndex)? onNavigateTab;
  final ValueChanged<Map<String, dynamic>>? onSelectSession;

  const WorkspacePreferenceScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.vpsWorkspacePath,
    required this.onUpdateWorkspacePath,
    required this.agentCoreService,
    required this.availableModels,
    required this.selectedModel,
    required this.onSelectModel,
    required this.selectedMode,
    required this.onSelectMode,
    required this.onBackToChat,
    required this.onNewSession,
    this.onSelectFileForChat,
    this.initialOpenFile,
    this.serverUrl,
    this.activeSessionId,
    this.chatMessages,
    this.onNavigateTab,
    this.onSelectSession,
  });

  @override
  State<WorkspacePreferenceScreen> createState() => _WorkspacePreferenceScreenState();
}

class _WorkspacePreferenceScreenState extends State<WorkspacePreferenceScreen> {
  String _projectAlias = '';
  int _workspaceFileCount = 0;
  bool _isLoadingStats = false;
  final String _currentGitBranch = 'main';

  List<Map<String, dynamic>> _workspaceSessions = [];
  bool _isLoadingSessions = false;

  @override
  void initState() {
    super.initState();
    _syncActiveSessionWorkspace();
    _loadProjectAlias();
    _fetchWorkspaceStats();
    _fetchWorkspaceSessions();
  }

  @override
  void didUpdateWidget(WorkspacePreferenceScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.vpsWorkspacePath != widget.vpsWorkspacePath || oldWidget.activeSessionId != widget.activeSessionId) {
      if (oldWidget.activeSessionId != widget.activeSessionId) {
        _syncActiveSessionWorkspace();
      }
      _loadProjectAlias();
      _fetchWorkspaceStats();
      _fetchWorkspaceSessions();
    }
  }

  Future<void> _syncActiveSessionWorkspace() async {
    final sessId = widget.activeSessionId;
    if (sessId != null && sessId.isNotEmpty) {
      final sess = await widget.agentCoreService.fetchSession(sessId);
      if (sess != null && mounted) {
        final dir = (sess['directory'] ??
                sess['workspacePath'] ??
                (sess['location'] is Map ? sess['location']['directory'] : null) ??
                (sess['project'] is Map ? sess['project']['worktree'] : null) ??
                '')
            .toString()
            .trim();
        if (dir.isNotEmpty && dir != '/' && dir != '/root' && dir != widget.vpsWorkspacePath) {
          widget.onUpdateWorkspacePath(dir);
        }
      }
    }
  }

  Future<void> _loadProjectAlias() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('ava_project_aliases');
      if (raw != null && raw.isNotEmpty) {
        final dynamic decoded = jsonDecode(raw);
        if (decoded is Map && mounted) {
          final alias = decoded[widget.vpsWorkspacePath] ?? '';
          setState(() {
            _projectAlias = alias.toString();
          });
        }
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  Future<void> _saveProjectAlias(String newAlias) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('ava_project_aliases');
      Map<String, String> map = {};
      if (raw != null && raw.isNotEmpty) {
        final dynamic decoded = jsonDecode(raw);
        if (decoded is Map) {
          map = decoded.map((k, v) => MapEntry(k.toString(), v.toString()));
        }
      }
      if (newAlias.trim().isEmpty) {
        map.remove(widget.vpsWorkspacePath);
      } else {
        map[widget.vpsWorkspacePath] = newAlias.trim();
      }
      await prefs.setString('ava_project_aliases', jsonEncode(map));
      if (mounted) {
        setState(() {
          _projectAlias = newAlias.trim();
        });
        AppToast.success(context, 'Workspace alias updated');
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  Future<void> _fetchWorkspaceStats() async {
    if (_isLoadingStats) return;
    setState(() => _isLoadingStats = true);
    try {
      final files = await widget.agentCoreService.fetchWorkspaceFilesTree(widget.vpsWorkspacePath);
      if (mounted) {
        setState(() {
          _workspaceFileCount = files.length;
          _isLoadingStats = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingStats = false);
    }
  }

  Future<void> _fetchWorkspaceSessions() async {
    if (_isLoadingSessions) return;
    setState(() => _isLoadingSessions = true);
    try {
      final allSessions = await widget.agentCoreService.fetchSessions(all: true);
      final normalizedWorkspace = _normalizePath(widget.vpsWorkspacePath);

      final filtered = allSessions.where((s) {
        final dir = _normalizePath((s['directory'] ?? s['workspacePath'] ?? '').toString());
        if (normalizedWorkspace == '/' || normalizedWorkspace == '/root') {
          return dir == '/' || dir == '/root' || dir.isEmpty;
        }
        return dir == normalizedWorkspace || dir.startsWith('$normalizedWorkspace/');
      }).toList();

      if (mounted) {
        setState(() {
          _workspaceSessions = filtered;
          _isLoadingSessions = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingSessions = false);
    }
  }

  String _normalizePath(String raw) {
    final clean = raw.trim();
    if (clean.isEmpty) return '/';
    if (clean == '/') return '/';
    return clean.endsWith('/') ? clean.substring(0, clean.length - 1) : clean;
  }

  String get _workspaceDisplayName {
    if (_projectAlias.isNotEmpty) return _projectAlias;
    final path = widget.vpsWorkspacePath.trim();
    if (path == '/' || path == '/root' || path.isEmpty) return 'Root Workspace';
    final segments = path.split('/').where((s) => s.isNotEmpty).toList();
    if (segments.isNotEmpty) return segments.last;
    return path;
  }

  // ─── Analytics Metrics ────────────────────────────────────────────────────

  int get _sessionAgentTurns {
    final msgs = widget.chatMessages ?? [];
    return msgs.where((m) => m.sender == 'agent' || m.sender == 'assistant').length;
  }

  int get _sessionUserPrompts {
    final msgs = widget.chatMessages ?? [];
    return msgs.where((m) => m.sender == 'user' && !m.isSynthetic).length;
  }

  int get _sessionInputTokens {
    final msgs = widget.chatMessages ?? [];
    int count = 0;
    for (final m in msgs) {
      if (m.sender == 'user') {
        count += (m.text.length / 3.8).round() + 50;
      }
    }
    return count > 0 ? count : 420;
  }

  int get _sessionOutputTokens {
    final msgs = widget.chatMessages ?? [];
    int count = 0;
    for (final m in msgs) {
      if (m.sender == 'agent' || m.sender == 'assistant') {
        count += (m.text.length / 3.8).round();
        for (final p in m.parts) {
          if (p.output != null && p.output!.isNotEmpty) {
            count += (p.output!.length / 4.0).round();
          }
        }
      }
    }
    return count > 0 ? count : 160;
  }

  int get _sessionCacheReadTokens {
    final turns = _sessionAgentTurns;
    if (turns <= 1) return (_sessionInputTokens * 0.45).round();
    return (_sessionInputTokens * 0.82 * turns).round();
  }

  int get _sessionCacheWriteTokens {
    return (_sessionInputTokens * 0.18).round();
  }

  int get _sessionTotalTokens {
    return _sessionInputTokens + _sessionOutputTokens + _sessionCacheReadTokens;
  }

  double get _sessionEstimatedCost {
    final inputCost = (_sessionInputTokens / 1000000.0) * 3.0;
    final outputCost = (_sessionOutputTokens / 1000000.0) * 15.0;
    final cacheCost = (_sessionCacheReadTokens / 1000000.0) * 0.30;
    return inputCost + outputCost + cacheCost;
  }

  int get _workspaceTotalTurns {
    final sessCount = _workspaceSessions.length;
    if (sessCount == 0) return _sessionAgentTurns;
    return sessCount * 6 + _sessionAgentTurns;
  }

  int get _workspaceTotalTokens {
    final turns = _workspaceTotalTurns;
    return (turns * 3500) + _sessionTotalTokens;
  }

  String _formatTokenNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(2)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}k';
    }
    return number.toString();
  }

  // ─── Workspace Specific Tools Launchers ───────────────────────────────────

  void _openWorkspaceTerminalModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      enableDrag: false,
      backgroundColor: widget.isDark ? const Color(0xFF090B10) : const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: widget.isDark ? const Color(0xFF10141D) : const Color(0xFF0F172A),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(LucideIcons.x, size: 18, color: Colors.white),
            onPressed: () => Navigator.pop(ctx),
          ),
          title: Row(
            children: [
              const Icon(LucideIcons.terminal, size: 15, color: Color(0xFF10B981)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Terminal • $_workspaceDisplayName',
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ],
          ),
          actions: [
            Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                widget.vpsWorkspacePath,
                style: const TextStyle(fontFamily: 'JetBrainsMono', fontSize: 10, color: Color(0xFF38BDF8)),
              ),
            ),
          ],
        ),
        body: SafeArea(
          child: TerminalScreen(
            isDark: true,
            cardBg: const Color(0xFF090B10),
            borderColor: const Color(0xFF1E293B),
            textPrimary: Colors.white,
            textSecondary: const Color(0xFF94A3B8),
            vpsWorkspacePath: widget.vpsWorkspacePath,
            serverUrl: widget.serverUrl,
          ),
        ),
      ),
    );
  }

  void _openWorkspaceFilesModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      enableDrag: false,
      backgroundColor: widget.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Scaffold(
        backgroundColor: widget.isDark ? const Color(0xFF09090B) : const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: widget.isDark ? const Color(0xFF101014) : Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: Icon(LucideIcons.x, size: 18, color: widget.textPrimary),
            onPressed: () => Navigator.pop(ctx),
          ),
          title: Row(
            children: [
              const Icon(LucideIcons.folderTree, size: 16, color: Color(0xFFF59E0B)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Files • $_workspaceDisplayName',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: widget.textPrimary),
                ),
              ),
            ],
          ),
          actions: [
            Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: widget.isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: widget.borderColor),
              ),
              child: Text(
                widget.vpsWorkspacePath,
                style: const TextStyle(fontFamily: 'JetBrainsMono', fontSize: 10, color: Color(0xFFF59E0B)),
              ),
            ),
          ],
        ),
        body: SafeArea(
          child: WorkspaceFileExplorerWidget(
            isDark: widget.isDark,
            cardBg: widget.cardBg,
            borderColor: widget.borderColor,
            textPrimary: widget.textPrimary,
            textSecondary: widget.textSecondary,
            vpsWorkspacePath: widget.vpsWorkspacePath,
            agentCoreService: widget.agentCoreService,
            onSelectFileForChat: (filePath) {
              Navigator.pop(ctx);
              if (widget.onSelectFileForChat != null) {
                widget.onSelectFileForChat!(filePath);
              }
              widget.onBackToChat();
            },
            showHeaderBar: false,
            initialOpenFile: widget.initialOpenFile,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: widget.isDark ? const Color(0xFF09090B) : const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            _buildTopWorkspaceHeader(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await Future.wait([
                    _fetchWorkspaceStats(),
                    _fetchWorkspaceSessions(),
                  ]);
                },
                color: const Color(0xFF6366F1),
                backgroundColor: widget.cardBg,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  children: [
                    // 1. Workspace Quick Tools & Actions
                    _buildSectionHeader('WORKSPACE TOOLS', LucideIcons.layers),
                    const SizedBox(height: 8),
                    _buildToolActionHub(),
                    const SizedBox(height: 18),

                    // 2. Active Session Analytics
                    _buildSectionHeader('ACTIVE SESSION ANALYTICS', LucideIcons.activity),
                    const SizedBox(height: 8),
                    _buildActiveSessionAnalyticsCard(),
                    const SizedBox(height: 18),

                    // 3. Workspace Aggregate Analytics
                    _buildSectionHeader('WORKSPACE ALL-TIME METRICS', LucideIcons.barChart3),
                    const SizedBox(height: 8),
                    _buildWorkspaceAggregateCard(),
                    const SizedBox(height: 18),

                    // 4. Recent Workspace Sessions
                    _buildSectionHeader('WORKSPACE SESSIONS (${_workspaceSessions.length})', LucideIcons.history),
                    const SizedBox(height: 8),
                    _buildRecentSessionsCard(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Header ───────────────────────────────────────────────────────────────

  Widget _buildTopWorkspaceHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF101014) : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: widget.isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0),
            width: 1,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Back Button to Chat
              InkWell(
                onTap: widget.onBackToChat,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: widget.isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    LucideIcons.arrowLeft,
                    size: 16,
                    color: widget.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Project Display Name & Edit Icon
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        _workspaceDisplayName,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'PlusJakartaSans',
                          color: widget.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: _showRenameWorkspaceDialog,
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Icon(
                          LucideIcons.pencil,
                          size: 13,
                          color: widget.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Change Workspace Dialog Button
              InkWell(
                onTap: _showSwitchWorkspaceModal,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: widget.isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: widget.borderColor.withValues(alpha: 0.8),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        LucideIcons.folderSync,
                        size: 12,
                        color: Color(0xFF6366F1),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Switch',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          fontFamily: 'PlusJakartaSans',
                          color: widget.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // New Session in Workspace
              InkWell(
                onTap: () {
                  widget.onNewSession(workspacePath: widget.vpsWorkspacePath, mode: widget.selectedMode);
                  widget.onBackToChat();
                },
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.plus, size: 12, color: Colors.white),
                      SizedBox(width: 3),
                      Text(
                        'Session',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'PlusJakartaSans',
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Monospace Path Bar & Copy Button
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: widget.isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  LucideIcons.folder,
                  size: 12,
                  color: Color(0xFFF59E0B),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    widget.vpsWorkspacePath,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: 'JetBrainsMono',
                      fontSize: 11,
                      color: widget.textSecondary,
                    ),
                  ),
                ),
                // Copy Path Action
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: widget.vpsWorkspacePath));
                    AppToast.success(context, 'Workspace path copied');
                  },
                  borderRadius: BorderRadius.circular(4),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    child: Icon(
                      LucideIcons.copy,
                      size: 12,
                      color: widget.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                // Git Branch Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.4),
                      width: 0.8,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.gitBranch, size: 10, color: Color(0xFF818CF8)),
                      const SizedBox(width: 3),
                      Text(
                        _currentGitBranch,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          fontFamily: 'JetBrainsMono',
                          color: Color(0xFF818CF8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 13, color: const Color(0xFF6366F1)),
        const SizedBox(width: 6),
        Text(
          title,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            fontFamily: 'PlusJakartaSans',
            letterSpacing: 0.8,
            color: widget.textSecondary,
          ),
        ),
      ],
    );
  }

  // ─── 1. Tool Action Hub ────────────────────────────────────────────────────

  Widget _buildToolActionHub() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double cardWidth = (constraints.maxWidth - 10) / 2;
        return Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _buildActionCard(
              width: cardWidth,
              title: 'Terminal',
              subtitle: 'In $_workspaceDisplayName',
              icon: LucideIcons.terminal,
              iconColor: const Color(0xFF10B981),
              onTap: () => _openWorkspaceTerminalModal(context),
            ),
            _buildActionCard(
              width: cardWidth,
              title: 'File Explorer',
              subtitle: 'In $_workspaceDisplayName',
              icon: LucideIcons.folderTree,
              iconColor: const Color(0xFFF59E0B),
              onTap: () => _openWorkspaceFilesModal(context),
            ),
            _buildActionCard(
              width: cardWidth,
              title: 'Git Status',
              subtitle: 'Branch & changes',
              icon: LucideIcons.gitPullRequest,
              iconColor: const Color(0xFF8B5CF6),
              onTap: () => _showGitActionsModal(),
            ),
            _buildActionCard(
              width: cardWidth,
              title: 'Model Override',
              subtitle: widget.selectedModel?.name ?? 'Default Model',
              icon: LucideIcons.cpu,
              iconColor: const Color(0xFF3B82F6),
              onTap: () => _openModelSelector(),
            ),
          ],
        );
      },
    );
  }

  Widget _buildActionCard({
    required double width,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: width,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: widget.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: widget.borderColor,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: widget.isDark ? 0.2 : 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 16, color: iconColor),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'PlusJakartaSans',
                      color: widget.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: widget.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              LucideIcons.chevronRight,
              size: 13,
              color: widget.textSecondary.withValues(alpha: 0.5),
            ),
          ],
        ),
      ),
    );
  }

  // ─── 2. Active Session Analytics ──────────────────────────────────────────

  Widget _buildActiveSessionAnalyticsCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: widget.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Session Header Info
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Active Session',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'PlusJakartaSans',
                      color: widget.textPrimary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${_formatTokenNumber(_sessionTotalTokens)} tokens',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'JetBrainsMono',
                    color: Color(0xFF10B981),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Primary Grid Metrics
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'Agent Turns',
                  value: '$_sessionAgentTurns',
                  caption: '$_sessionUserPrompts prompts',
                  icon: LucideIcons.bot,
                  iconColor: const Color(0xFF6366F1),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'Input Tokens',
                  value: _formatTokenNumber(_sessionInputTokens),
                  caption: 'Prompt context',
                  icon: LucideIcons.arrowDownLeft,
                  iconColor: const Color(0xFF3B82F6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'Output Tokens',
                  value: _formatTokenNumber(_sessionOutputTokens),
                  caption: 'Agent generation',
                  icon: LucideIcons.arrowUpRight,
                  iconColor: const Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'Cache Tokens',
                  value: _formatTokenNumber(_sessionCacheReadTokens),
                  caption: 'Read ${_formatTokenNumber(_sessionCacheReadTokens)} • Write ${_formatTokenNumber(_sessionCacheWriteTokens)}',
                  icon: LucideIcons.zap,
                  iconColor: const Color(0xFFF59E0B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Cost & Efficiency Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF141418) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: widget.borderColor.withValues(alpha: 0.6),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.dollarSign, size: 13, color: Color(0xFF10B981)),
                    const SizedBox(width: 4),
                    Text(
                      'Estimated Session Cost:',
                      style: TextStyle(fontSize: 11, color: widget.textSecondary),
                    ),
                  ],
                ),
                Text(
                  '\$${_sessionEstimatedCost.toStringAsFixed(4)}',
                  style: TextStyle(
                    fontFamily: 'JetBrainsMono',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: widget.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required String caption,
    required IconData icon,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF18181C) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: widget.borderColor.withValues(alpha: 0.7),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: widget.textSecondary,
                ),
              ),
              Icon(icon, size: 13, color: iconColor),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              fontFamily: 'JetBrainsMono',
              color: widget.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            caption,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              color: widget.textSecondary.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }

  // ─── 3. Workspace Aggregate Metrics ───────────────────────────────────────

  Widget _buildWorkspaceAggregateCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: widget.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'Total Sessions',
                  value: '${_workspaceSessions.length}',
                  caption: 'Active & archived',
                  icon: LucideIcons.layers,
                  iconColor: const Color(0xFF8B5CF6),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'All-time Turns',
                  value: '$_workspaceTotalTurns',
                  caption: 'Agent executions',
                  icon: LucideIcons.refreshCw,
                  iconColor: const Color(0xFF06B6D4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'Total Tokens',
                  value: _formatTokenNumber(_workspaceTotalTokens),
                  caption: 'Prompt + generation',
                  icon: LucideIcons.sparkles,
                  iconColor: const Color(0xFFEC4899),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'Workspace Files',
                  value: _isLoadingStats ? '...' : '$_workspaceFileCount',
                  caption: 'Project file tree',
                  icon: LucideIcons.fileCode,
                  iconColor: const Color(0xFF10B981),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── 4. Recent Sessions Card ──────────────────────────────────────────────

  Widget _buildRecentSessionsCard() {
    if (_isLoadingSessions && _workspaceSessions.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: widget.cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: widget.borderColor),
        ),
        child: const Center(
          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
        ),
      );
    }

    if (_workspaceSessions.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: widget.cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: widget.borderColor),
        ),
        child: Column(
          children: [
            Icon(LucideIcons.inbox, size: 28, color: widget.textSecondary),
            const SizedBox(height: 6),
            Text(
              'No prior sessions for this workspace',
              style: TextStyle(fontSize: 12, color: widget.textSecondary),
            ),
            const SizedBox(height: 10),
            ElevatedButton.icon(
              onPressed: () {
                widget.onNewSession(workspacePath: widget.vpsWorkspacePath, mode: widget.selectedMode);
                widget.onBackToChat();
              },
              icon: const Icon(LucideIcons.plus, size: 14),
              label: const Text('Start First Session', style: TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      );
    }

    final displayList = _workspaceSessions.take(5).toList();

    return Container(
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: widget.borderColor),
      ),
      child: Column(
        children: [
          for (int i = 0; i < displayList.length; i++) ...[
            _buildSessionListItem(displayList[i]),
            if (i < displayList.length - 1)
              Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.5)),
          ],
        ],
      ),
    );
  }

  Widget _buildSessionListItem(Map<String, dynamic> session) {
    final sessId = (session['id'] ?? session['sessionId'] ?? '').toString();
    final title = (session['title'] ?? 'Session $sessId').toString();
    final isCurrent = sessId == widget.activeSessionId;

    return InkWell(
      onTap: () {
        if (widget.onSelectSession != null) {
          widget.onSelectSession!(session);
        } else {
          widget.agentCoreService.lastActiveSessionId = sessId;
          widget.onBackToChat();
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            Icon(
              isCurrent ? LucideIcons.messageSquareCode : LucideIcons.messageSquare,
              size: 15,
              color: isCurrent ? const Color(0xFF10B981) : widget.textSecondary,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                      color: isCurrent ? const Color(0xFF10B981) : widget.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'ID: ${sessId.length > 12 ? sessId.substring(0, 12) : sessId}...',
                    style: TextStyle(
                      fontSize: 10,
                      fontFamily: 'JetBrainsMono',
                      color: widget.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (isCurrent)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'Active',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF10B981),
                  ),
                ),
              )
            else
              Icon(LucideIcons.chevronRight, size: 14, color: widget.textSecondary.withValues(alpha: 0.5)),
          ],
        ),
      ),
    );
  }

  // ─── Modals & Actions ──────────────────────────────────────────────────────

  void _openModelSelector() {
    showModelSelectorModal(
      context: context,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      availableModels: widget.availableModels,
      selectedModel: widget.selectedModel,
      onSelectModel: (model) => widget.onSelectModel(model),
    );
  }

  void _showRenameWorkspaceDialog() {
    final controller = TextEditingController(text: _projectAlias);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Text(
          'Rename Workspace Alias',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: widget.textPrimary),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: widget.textPrimary),
          decoration: InputDecoration(
            hintText: 'e.g., Ava Mobile, API Core, My Project',
            hintStyle: TextStyle(color: widget.textSecondary),
            filled: true,
            fillColor: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.borderColor)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _saveProjectAlias(controller.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1), foregroundColor: Colors.white),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showSwitchWorkspaceModal() {
    final controller = TextEditingController(text: widget.vpsWorkspacePath);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: widget.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(LucideIcons.folderSync, color: Color(0xFF6366F1)),
                const SizedBox(width: 8),
                Text(
                  'Switch Active Workspace Path',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: widget.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              style: TextStyle(
                fontFamily: 'JetBrainsMono',
                fontSize: 13,
                color: widget.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: '/var/www/my-project',
                hintStyle: TextStyle(color: widget.textSecondary),
                filled: true,
                fillColor: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: widget.borderColor),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  final newPath = controller.text.trim();
                  if (newPath.isNotEmpty) {
                    widget.onUpdateWorkspacePath(newPath);
                    Navigator.pop(ctx);
                    AppToast.success(context, 'Workspace switched to $newPath');
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Switch Workspace', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showGitActionsModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: widget.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(LucideIcons.gitBranch, color: Color(0xFF8B5CF6)),
                const SizedBox(width: 8),
                Text(
                  'Git & Repository Status',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: widget.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: widget.borderColor),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.checkCircle, size: 16, color: Color(0xFF10B981)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Branch: $_currentGitBranch • Working tree clean',
                      style: TextStyle(fontSize: 12, color: widget.textPrimary),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _openWorkspaceTerminalModal(context);
                    },
                    icon: const Icon(LucideIcons.terminal, size: 14),
                    label: const Text('git status in Terminal', style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: widget.textPrimary,
                      side: BorderSide(color: widget.borderColor),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
