import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../services/agent_core_service.dart';
import '../utils/time_formatter.dart';
import 'workspace_file_explorer.dart';

class DrawerNavigation extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final int selectedNavIndex;
  final ValueChanged<int> onSelectNav;
  final String vpsWorkspacePath;
  final ValueChanged<String> onSelectWorkspacePath;
  final VoidCallback? onSignOut;
  final AvaAgentCoreService agentCoreService;
  final String? activeSessionId;
  final bool isTurnRunning;
  final Function(Map<String, dynamic> session)? onSelectSession;
  final Function({String? workspacePath, String? mode})? onCreateNewSession;

  const DrawerNavigation({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.selectedNavIndex,
    required this.onSelectNav,
    required this.vpsWorkspacePath,
    required this.onSelectWorkspacePath,
    this.onSignOut,
    required this.agentCoreService,
    this.activeSessionId,
    this.isTurnRunning = false,
    this.onSelectSession,
    this.onCreateNewSession,
  });

  @override
  State<DrawerNavigation> createState() => _DrawerNavigationState();
}

class _DrawerNavigationState extends State<DrawerNavigation> {
  // 0 = Menus, 1 = Sessions
  int _drawerTab = 0;

  List<Map<String, dynamic>> _sessions = [];
  bool _isLoadingSessions = false;
  bool _hasLoadedAllSessions = false;
  bool _isLoadingMoreSessions = false;

  // Search filter for menus
  String _menuSearchQuery = '';
  final TextEditingController _menuSearchController = TextEditingController();

  // Project Folders, Aliases & Pinning
  Map<String, String> _projectAliases = {};
  final Set<String> _expandedProjects = {};
  final Set<String> _pinnedProjects = {};

  // Per-project Session Pagination
  final Map<String, int> _projectSessionLimits = {};
  static const int _defaultSessionsPerPage = 5;

  @override
  void initState() {
    super.initState();
    _loadProjectAliases();
    _loadPinnedProjects();
    _loadSessions(fetchAll: false);
  }

  @override
  void dispose() {
    _menuSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadPinnedProjects() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = prefs.getStringList('ava_pinned_projects');
      if (list != null && mounted) {
        setState(() {
          _pinnedProjects.clear();
          _pinnedProjects.addAll(list);
        });
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  Future<void> _togglePinProject(String path) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final normalized = _normalizePath(path);
      setState(() {
        if (_pinnedProjects.contains(normalized)) {
          _pinnedProjects.remove(normalized);
        } else {
          _pinnedProjects.add(normalized);
        }
      });
      await prefs.setStringList('ava_pinned_projects', _pinnedProjects.toList());
    } catch (e) { print('Ignored error: $e'); }
  }

  Future<void> _loadProjectAliases() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('ava_project_aliases');
      if (raw != null && raw.isNotEmpty) {
        final dynamic decoded = jsonDecode(raw);
        if (decoded is Map && mounted) {
          setState(() {
            _projectAliases = decoded.map((k, v) => MapEntry(k.toString(), v.toString()));
          });
        }
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  Future<void> _saveProjectAlias(String path, String alias) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      setState(() {
        if (alias.trim().isEmpty) {
          _projectAliases.remove(path);
        } else {
          _projectAliases[path] = alias.trim();
        }
      });
      await prefs.setString('ava_project_aliases', jsonEncode(_projectAliases));
    } catch (e) { print('Ignored error: $e'); }
  }

  String _normalizePath(String raw) {
    final clean = raw.trim();
    if (clean.isEmpty) {
      final def = widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : AppConfig.defaultWorkspacePath;
      return def.endsWith('/') && def.length > 1 ? def.substring(0, def.length - 1) : def;
    }
    if (clean == '/') return '/';
    return clean.endsWith('/') ? clean.substring(0, clean.length - 1) : clean;
  }

  String _getProjectDisplayName(String path) {
    final normalized = _normalizePath(path);
    if (_projectAliases.containsKey(normalized) && _projectAliases[normalized]!.trim().isNotEmpty) {
      return _projectAliases[normalized]!;
    }
    if (_projectAliases.containsKey(path) && _projectAliases[path]!.trim().isNotEmpty) {
      return _projectAliases[path]!;
    }
    if (normalized == '/root' || normalized == '') {
      return 'Root Workspace';
    }
    final segments = normalized.split('/').where((s) => s.isNotEmpty).toList();
    if (segments.isNotEmpty) {
      return segments.last;
    }
    return normalized.isNotEmpty ? normalized : 'Root Workspace';
  }

  Future<void> _loadSessions({bool fetchAll = true}) async {
    if (_isLoadingSessions || _isLoadingMoreSessions) return;
    if (fetchAll) {
      setState(() => _isLoadingMoreSessions = true);
    } else {
      final cached = await widget.agentCoreService.loadSessionsListFromCache();
      if (mounted && cached.isNotEmpty && _sessions.isEmpty) {
        setState(() {
          _sessions = cached;
          _autoExpandInitialProject();
        });
      }
      setState(() => _isLoadingSessions = true);
    }
    try {
      final list = await widget.agentCoreService.fetchSessions(
        all: true,
        limit: 200,
        activeSessionId: widget.activeSessionId,
      );
      if (mounted) {
        setState(() {
          if (list.isNotEmpty) _sessions = list;
          _isLoadingSessions = false;
          _isLoadingMoreSessions = false;
          _hasLoadedAllSessions = true;
          _autoExpandInitialProject();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingSessions = false;
          _isLoadingMoreSessions = false;
        });
      }
    }
  }

  void _autoExpandInitialProject() {
    if (_expandedProjects.isNotEmpty) return;
    final defaultPath = _normalizePath(widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : AppConfig.defaultWorkspacePath);

    String? activePath;
    if (widget.activeSessionId != null && widget.activeSessionId!.isNotEmpty) {
      for (final s in _sessions) {
        if (s['id'] == widget.activeSessionId) {
          final locDir = (s['location'] is Map) ? s['location']['directory']?.toString() : null;
          final projWt = (s['project'] is Map) ? s['project']['worktree']?.toString() : null;
          final raw = (s['directory'] ?? s['workspacePath'] ?? locDir ?? projWt ?? s['worktree'] ?? '').toString().trim();
          activePath = _normalizePath(raw);
          break;
        }
      }
    }

    if (activePath != null && activePath.isNotEmpty) {
      _expandedProjects.add(activePath);
    }
    _expandedProjects.add(defaultPath);
    _expandedProjects.add('/var/www/ava-code');
  }

  bool _isScheduledSession(Map<String, dynamic> s) {
    if (s['metadata'] is Map) {
      final meta = s['metadata'] as Map;
      if (meta['isScheduled'] == true || meta['scheduledTaskId'] != null) return true;
    }
    final title = (s['title'] ?? s['name'] ?? s['slug'] ?? '').toString();
    return title.startsWith('⏰') || title.contains('[Scheduled]');
  }

  String _extractSessionTitle(Map<String, dynamic> s, int idx) {
    final title = s['title']?.toString() ?? s['name']?.toString() ?? s['slug']?.toString();
    if (title != null && title.trim().isNotEmpty) {
      final t = title.trim();
      if (t.startsWith('New session - 202') || t.startsWith('Child session - 202')) {
        return 'New Session';
      }
      return t;
    }
    final id = s['id']?.toString() ?? '';
    return id.isNotEmpty ? 'Session ${id.length > 8 ? id.substring(0, 8) : id}' : 'Session #$idx';
  }

  Map<String, List<Map<String, dynamic>>> _groupSessionsByProject() {
    final Map<String, List<Map<String, dynamic>>> groups = {};
    final defaultPath = _normalizePath(widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : AppConfig.defaultWorkspacePath);

    for (final s in _sessions) {
      final locDir = (s['location'] is Map) ? s['location']['directory']?.toString() : null;
      final projWt = (s['project'] is Map) ? s['project']['worktree']?.toString() : null;
      final rawPath = (s['directory'] ?? s['workspacePath'] ?? locDir ?? projWt ?? s['worktree'] ?? '').toString().trim();
      final path = _normalizePath(rawPath.isNotEmpty ? rawPath : defaultPath);
      groups.putIfAbsent(path, () => []).add(s);
    }

    if (!groups.containsKey(defaultPath)) {
      groups[defaultPath] = [];
    }

    return groups;
  }

  @override
  Widget build(BuildContext context) {
    final drawerBg = widget.isDark
        ? const Color(0xFF0F0F14).withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.78);
    final borderColor = widget.isDark
        ? Colors.white.withValues(alpha: 0.10)
        : Colors.black.withValues(alpha: 0.08);

    final currentWsName = _getProjectDisplayName(
      widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : AppConfig.defaultWorkspacePath,
    );

    return Drawer(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      width: 290,
      child: ClipRRect(
        borderRadius: const BorderRadius.horizontal(right: Radius.circular(16)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
          child: Container(
            decoration: BoxDecoration(
              color: drawerBg,
              border: Border(
                right: BorderSide(color: borderColor, width: 1.0),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: widget.isDark ? 0.45 : 0.15),
                  blurRadius: 24,
                  spreadRadius: 2,
                  offset: const Offset(4, 0),
                ),
              ],
            ),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── 1. Workspace Switcher Header (shadcn/Linear style) ──────────
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 6),
                    child: _buildWorkspaceSwitcherHeader(context, currentWsName),
                  ),

              // ── 2. Segmented Drawer Tab Bar: Menus vs Sessions ──────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: Container(
                  height: 34,
                  padding: const EdgeInsets.all(2.5),
                  decoration: BoxDecoration(
                    color: widget.isDark
                        ? const Color(0xFF18181D)
                        : const Color(0xFFEBECEF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: widget.isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.black.withValues(alpha: 0.04),
                    ),
                  ),
                  child: Stack(
                    children: [
                      // Sliding animated indicator
                      AnimatedAlign(
                        duration: const Duration(milliseconds: 200),
                        curve: Curves.easeInOutCubic,
                        alignment: _drawerTab == 0 ? Alignment.centerLeft : Alignment.centerRight,
                        child: FractionallySizedBox(
                          widthFactor: 0.5,
                          heightFactor: 1.0,
                          child: Container(
                            decoration: BoxDecoration(
                              color: widget.isDark ? const Color(0xFF27272F) : Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: widget.isDark ? 0.35 : 0.08),
                                  blurRadius: 3,
                                  offset: const Offset(0, 1),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      // Tab Labels
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _drawerTab = 0),
                              borderRadius: BorderRadius.circular(6),
                              child: Center(
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      LucideIcons.layoutGrid,
                                      size: 13,
                                      color: _drawerTab == 0
                                          ? const Color(0xFF6366F1)
                                          : widget.textSecondary,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Navigation',
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: _drawerTab == 0 ? FontWeight.w700 : FontWeight.w500,
                                        color: _drawerTab == 0 ? widget.textPrimary : widget.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                setState(() => _drawerTab = 1);
                                if (_sessions.isEmpty) _loadSessions();
                              },
                              borderRadius: BorderRadius.circular(6),
                              child: Center(
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      LucideIcons.history,
                                      size: 13,
                                      color: _drawerTab == 1
                                          ? const Color(0xFF6366F1)
                                          : widget.textSecondary,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Sessions',
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: _drawerTab == 1 ? FontWeight.w700 : FontWeight.w500,
                                        color: _drawerTab == 1 ? widget.textPrimary : widget.textSecondary,
                                      ),
                                    ),
                                    if (_sessions.isNotEmpty) ...[
                                      const SizedBox(width: 5),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4.5, vertical: 0.5),
                                        decoration: BoxDecoration(
                                          color: _drawerTab == 1
                                              ? const Color(0xFF6366F1).withValues(alpha: 0.18)
                                              : (widget.isDark ? const Color(0xFF222228) : const Color(0xFFDFE1E6)),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Text(
                                          '${_sessions.length}',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w700,
                                            color: _drawerTab == 1 ? const Color(0xFF6366F1) : widget.textSecondary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 6),

              // ── 3. Tab Body ────────────────────────────────────────────────
              Expanded(
                child: _drawerTab == 0
                    ? _buildMenusTab(context)
                    : _buildSessionsTab(context),
              ),

              // ── 4. Bottom Actions (Settings & Sign Out) ─────────────────────
              _buildBottomDock(context, borderColor),
            ],
          ),
        ),
      ),
    ),
  ),
);
  }

  // ─── Workspace Switcher Header ───────────────────────────────────────────────

  Widget _buildWorkspaceSwitcherHeader(BuildContext context, String currentWsName) {
    final avatarLetter = currentWsName.isNotEmpty ? currentWsName.substring(0, 1).toUpperCase() : 'A';

    return InkWell(
      onTap: () => _showWorkspaceSwitcherModal(context),
      borderRadius: BorderRadius.circular(9),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
        decoration: BoxDecoration(
          color: widget.isDark
              ? Colors.white.withValues(alpha: 0.03)
              : Colors.black.withValues(alpha: 0.02),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: widget.isDark
                ? Colors.white.withValues(alpha: 0.06)
                : Colors.black.withValues(alpha: 0.05),
          ),
        ),
        child: Row(
          children: [
            // Workspace Avatar / Brand Icon
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(7),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.25),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: Text(
                avatarLetter,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 10),

            // Workspace Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    currentWsName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: widget.textPrimary,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Row(
                    children: [
                      Container(
                        width: 5.5,
                        height: 5.5,
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Active Workspace',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w500,
                          color: widget.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Chevron Down Icon
            Icon(
              LucideIcons.chevronsUpDown,
              size: 14,
              color: widget.textSecondary.withValues(alpha: 0.7),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Tab 0: Menus (Grouped shadcn/Linear Style) ──────────────────────────────

  Widget _buildMenusTab(BuildContext context) {
    final query = _menuSearchQuery.trim().toLowerCase();

    final allItems = [
      // WORKSPACE GROUP
      _NavItemDef(
        group: 'WORKSPACE',
        index: 0,
        title: 'Agent Chat',
        icon: LucideIcons.messageSquare,
        shortcut: '⌘1',
        badge: (widget.activeSessionId != null && widget.activeSessionId!.isNotEmpty) ? 'Active' : null,
      ),
      _NavItemDef(
        group: 'WORKSPACE',
        index: 13,
        title: 'Workspace Preferences & Hub',
        icon: LucideIcons.briefcase,
        shortcut: '⌘2',
      ),
      _NavItemDef(
        group: 'WORKSPACE',
        index: 1,
        title: 'File Explorer',
        icon: LucideIcons.folder,
        shortcut: '⌘3',
      ),
      _NavItemDef(
        group: 'WORKSPACE',
        index: 4,
        title: 'Active Sessions',
        icon: LucideIcons.history,
        badge: _sessions.isNotEmpty ? '${_sessions.length}' : null,
      ),

      // DEVELOPER TOOLS GROUP
      _NavItemDef(
        group: 'DEVELOPER TOOLS',
        index: 7,
        title: 'Terminal',
        icon: LucideIcons.terminal,
        shortcut: '⌘T',
      ),
      _NavItemDef(
        group: 'DEVELOPER TOOLS',
        index: 8,
        title: 'In-App Browser & DevTools',
        icon: LucideIcons.globe,
      ),
      _NavItemDef(
        group: 'DEVELOPER TOOLS',
        index: 9,
        title: 'Shared Media Library',
        icon: LucideIcons.images,
      ),
      _NavItemDef(
        group: 'DEVELOPER TOOLS',
        index: 10,
        title: 'Scheduled Tasks',
        icon: LucideIcons.calendarClock,
      ),
      _NavItemDef(
        group: 'DEVELOPER TOOLS',
        index: 12,
        title: 'Remote Desktop',
        icon: LucideIcons.monitor,
      ),

      // AI & CONFIGURATION GROUP
      _NavItemDef(
        group: 'AI & CONFIGURATION',
        index: 2,
        title: 'AI Models & Providers',
        icon: LucideIcons.cpu,
      ),
      _NavItemDef(
        group: 'AI & CONFIGURATION',
        index: 3,
        title: 'MCP Servers',
        icon: LucideIcons.plug,
        badge: 'MCP',
      ),
      _NavItemDef(
        group: 'AI & CONFIGURATION',
        index: 11,
        title: 'Profile & AI Persona',
        icon: LucideIcons.user,
      ),
      _NavItemDef(
        group: 'AI & CONFIGURATION',
        index: 5,
        title: 'System Health',
        icon: LucideIcons.activity,
      ),
    ];

    final filteredItems = query.isEmpty
        ? allItems
        : allItems.where((item) => item.title.toLowerCase().contains(query) || item.group.toLowerCase().contains(query)).toList();

    // Group items
    final groups = <String, List<_NavItemDef>>{};
    for (final item in filteredItems) {
      groups.putIfAbsent(item.group, () => []).add(item);
    }

    return Column(
      children: [
        // Quick Search Bar (shadcn search input)
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 2, 12, 8),
          child: Container(
            height: 32,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: widget.isDark
                  ? Colors.white.withValues(alpha: 0.03)
                  : Colors.black.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: widget.isDark
                    ? Colors.white.withValues(alpha: 0.06)
                    : Colors.black.withValues(alpha: 0.05),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  LucideIcons.search,
                  size: 13,
                  color: widget.textSecondary.withValues(alpha: 0.6),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: TextField(
                    controller: _menuSearchController,
                    onChanged: (val) => setState(() => _menuSearchQuery = val),
                    style: TextStyle(fontSize: 12, color: widget.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Search actions or pages...',
                      hintStyle: TextStyle(fontSize: 11.5, color: widget.textSecondary.withValues(alpha: 0.6)),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
                if (_menuSearchQuery.isNotEmpty)
                  InkWell(
                    onTap: () {
                      _menuSearchController.clear();
                      setState(() => _menuSearchQuery = '');
                    },
                    child: Icon(LucideIcons.x, size: 12, color: widget.textSecondary),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: widget.isDark ? const Color(0xFF222228) : const Color(0xFFE5E7EB),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(
                      '⌘K',
                      style: TextStyle(
                        fontSize: 9,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w600,
                        color: widget.textSecondary,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),

        // Grouped Navigation List
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            children: [
              for (final entry in groups.entries) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 10, 8, 4),
                  child: Text(
                    entry.key,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.6,
                      color: widget.textSecondary.withValues(alpha: 0.65),
                    ),
                  ),
                ),
                for (final item in entry.value)
                  _buildLinearNavItem(
                    context: context,
                    index: item.index,
                    icon: item.icon,
                    title: item.title,
                    shortcut: item.shortcut,
                    badge: item.badge,
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLinearNavItem({
    required BuildContext context,
    required int index,
    required IconData icon,
    required String title,
    String? shortcut,
    String? badge,
  }) {
    final isSelected = widget.selectedNavIndex == index;

    return Container(
      margin: const EdgeInsets.only(bottom: 2),
      decoration: BoxDecoration(
        color: isSelected
            ? (widget.isDark
                ? const Color(0xFF1F1F26)
                : const Color(0xFFEDE9FE).withValues(alpha: 0.7))
            : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        border: isSelected
            ? Border.all(
                color: const Color(0xFF6366F1).withValues(alpha: widget.isDark ? 0.25 : 0.35),
                width: 1.0,
              )
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        child: InkWell(
          borderRadius: BorderRadius.circular(6),
          onTap: () {
            widget.onSelectNav(index);
            Navigator.pop(context);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6.5),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 15,
                  color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary,
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? (widget.isDark ? Colors.white : const Color(0xFF4F46E5)) : widget.textPrimary,
                      letterSpacing: -0.1,
                    ),
                  ),
                ),
                if (badge != null) ...[
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF6366F1).withValues(alpha: 0.2)
                          : (widget.isDark ? const Color(0xFF222228) : const Color(0xFFE5E7EB)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      badge,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary,
                      ),
                    ),
                  ),
                ],
                if (shortcut != null) ...[
                  const SizedBox(width: 4),
                  Text(
                    shortcut,
                    style: TextStyle(
                      fontSize: 10,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w500,
                      color: widget.textSecondary.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── Tab 1: Grouped & Foldable Project Sessions Tab ──────────────────────────

  Widget _buildSessionsTab(BuildContext context) {
    final groupedProjects = _groupSessionsByProject();
    final projectPaths = groupedProjects.keys.toList();

    // Sort projects:
    // 1. Pinned projects first
    // 2. Active workspace or project with active session
    // 3. Alphabetical
    final currentWs = widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : AppConfig.defaultWorkspacePath;
    final normalizedCurrentWs = _normalizePath(currentWs);
    projectPaths.sort((a, b) {
      final aNorm = _normalizePath(a);
      final bNorm = _normalizePath(b);
      final aPinned = _pinnedProjects.contains(aNorm);
      final bPinned = _pinnedProjects.contains(bNorm);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      final aHasActive = groupedProjects[a]!.any((s) => s['id'] == widget.activeSessionId) || aNorm == normalizedCurrentWs;
      final bHasActive = groupedProjects[b]!.any((s) => s['id'] == widget.activeSessionId) || bNorm == normalizedCurrentWs;
      if (aHasActive && !bHasActive) return -1;
      if (!aHasActive && bHasActive) return 1;

      return _getProjectDisplayName(a).toLowerCase().compareTo(_getProjectDisplayName(b).toLowerCase());
    });

    return Column(
      children: [
        // Top Action Bar: New Session & Refresh
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 2, 10, 8),
          child: Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => _showNewSessionModal(context),
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 6.5, horizontal: 10),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(6),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.25),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.plus, size: 13, color: Colors.white),
                        SizedBox(width: 5),
                        Text(
                          'New Session',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              // Refresh Icon
              InkWell(
                onTap: _loadSessions,
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.all(6.5),
                  decoration: BoxDecoration(
                    color: widget.isDark
                        ? Colors.white.withValues(alpha: 0.04)
                        : Colors.black.withValues(alpha: 0.03),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: widget.isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.07),
                    ),
                  ),
                  child: Icon(LucideIcons.refreshCw, size: 13, color: widget.textSecondary),
                ),
              ),
            ],
          ),
        ),

        // Grouped Project Sessions List
        Expanded(
          child: _isLoadingSessions
              ? const Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
                  ),
                )
              : projectPaths.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.messageSquareDashed, size: 26, color: widget.textSecondary.withValues(alpha: 0.6)),
                            const SizedBox(height: 8),
                            Text(
                              'No Active Sessions',
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: widget.textPrimary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Tap "New Session" above to start a fresh chat turn.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 11, color: widget.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                      itemCount: projectPaths.length + (_hasLoadedAllSessions ? 0 : 1),
                      itemBuilder: (ctx, pIdx) {
                        if (pIdx == projectPaths.length) {
                          return Container(
                            margin: const EdgeInsets.only(top: 6, bottom: 14),
                            alignment: Alignment.center,
                            child: OutlinedButton.icon(
                              onPressed: _isLoadingMoreSessions ? null : () => _loadSessions(fetchAll: true),
                              icon: _isLoadingMoreSessions
                                  ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)))
                                  : const Icon(LucideIcons.download, size: 13, color: Color(0xFF6366F1)),
                              label: Text(
                                _isLoadingMoreSessions ? 'Loading All Workspaces...' : 'Load All Workspace Sessions',
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF6366F1)),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFF6366F1), width: 0.8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              ),
                            ),
                          );
                        }
                        final projectPath = projectPaths[pIdx];
                        final sessions = groupedProjects[projectPath] ?? [];
                        final displayName = _getProjectDisplayName(projectPath);
                        final isExpanded = _expandedProjects.contains(projectPath);
                        final hasActiveSession = sessions.any((s) => s['id'] == widget.activeSessionId);
                        final isCurrentWs = projectPath == (widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : AppConfig.defaultWorkspacePath);
                        final isPinned = _pinnedProjects.contains(_normalizePath(projectPath));

                        return Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          decoration: BoxDecoration(
                            color: widget.isDark
                                ? Colors.white.withValues(alpha: 0.02)
                                : Colors.black.withValues(alpha: 0.015),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isPinned
                                  ? const Color(0xFFF59E0B).withValues(alpha: 0.5)
                                  : ((hasActiveSession || isCurrentWs)
                                      ? const Color(0xFF6366F1).withValues(alpha: 0.4)
                                      : (widget.isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.05))),
                              width: (isPinned || hasActiveSession || isCurrentWs) ? 1.0 : 0.8,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // ── Foldable Project Header ─────────────────────────────
                              InkWell(
                                onTap: () {
                                  setState(() {
                                    if (isExpanded) {
                                      _expandedProjects.remove(projectPath);
                                    } else {
                                      _expandedProjects.add(projectPath);
                                    }
                                  });
                                },
                                borderRadius: BorderRadius.vertical(
                                  top: const Radius.circular(7),
                                  bottom: Radius.circular(isExpanded && sessions.isNotEmpty ? 0 : 7),
                                ),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: (hasActiveSession || isCurrentWs)
                                        ? const Color(0xFF6366F1).withValues(alpha: widget.isDark ? 0.08 : 0.04)
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.vertical(
                                      top: const Radius.circular(7),
                                      bottom: Radius.circular(isExpanded && sessions.isNotEmpty ? 0 : 7),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      // Folder Icon
                                      Container(
                                        width: 22,
                                        height: 22,
                                        decoration: BoxDecoration(
                                          color: isPinned
                                              ? const Color(0xFFF59E0B).withValues(alpha: 0.15)
                                              : ((hasActiveSession || isCurrentWs)
                                                  ? const Color(0xFF6366F1).withValues(alpha: 0.15)
                                                  : (widget.isDark ? const Color(0xFF222228) : const Color(0xFFE2E8F0))),
                                          borderRadius: BorderRadius.circular(5),
                                        ),
                                        child: Icon(
                                          isPinned ? LucideIcons.pin : LucideIcons.folder,
                                          size: 12,
                                          color: isPinned
                                              ? const Color(0xFFF59E0B)
                                              : ((hasActiveSession || isCurrentWs) ? const Color(0xFF6366F1) : widget.textSecondary),
                                        ),
                                      ),
                                      const SizedBox(width: 7),

                                      // Project Name & Monospace Path
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Flexible(
                                                  child: Text(
                                                    displayName,
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                    style: TextStyle(
                                                      fontSize: 11.5,
                                                      fontWeight: FontWeight.w700,
                                                      color: (hasActiveSession || isCurrentWs)
                                                          ? const Color(0xFF6366F1)
                                                          : widget.textPrimary,
                                                    ),
                                                  ),
                                                ),
                                                if (isPinned) ...[
                                                  const SizedBox(width: 4),
                                                  const Icon(LucideIcons.pin, size: 9, color: Color(0xFFF59E0B)),
                                                ],
                                                if (isCurrentWs) ...[
                                                  const SizedBox(width: 4),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 3.5, vertical: 0.5),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFF6366F1).withValues(alpha: 0.18),
                                                      borderRadius: BorderRadius.circular(3),
                                                    ),
                                                    child: const Text(
                                                      'WS',
                                                      style: TextStyle(fontSize: 7.5, fontWeight: FontWeight.w900, color: Color(0xFF6366F1)),
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                            Text(
                                              projectPath,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontFamily: 'monospace',
                                                color: widget.textSecondary.withValues(alpha: 0.7),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 4),

                                      // Session Count Badge
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: widget.isDark ? const Color(0xFF222228) : const Color(0xFFE2E8F0),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          '${sessions.length}',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w700,
                                            color: widget.textSecondary,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 2),

                                      // Pin / Unpin Project Button
                                      InkWell(
                                        onTap: () => _togglePinProject(projectPath),
                                        borderRadius: BorderRadius.circular(4),
                                        child: Padding(
                                          padding: const EdgeInsets.all(3),
                                          child: Icon(
                                            isPinned ? LucideIcons.pin : LucideIcons.pinOff,
                                            size: 11,
                                            color: isPinned ? const Color(0xFFF59E0B) : widget.textSecondary.withValues(alpha: 0.5),
                                          ),
                                        ),
                                      ),

                                      // Rename Button
                                      InkWell(
                                        onTap: () => _showRenameProjectModal(context, projectPath, displayName),
                                        borderRadius: BorderRadius.circular(4),
                                        child: Padding(
                                          padding: const EdgeInsets.all(3),
                                          child: Icon(
                                            LucideIcons.pencil,
                                            size: 11,
                                            color: widget.textSecondary.withValues(alpha: 0.7),
                                          ),
                                        ),
                                      ),

                                      // Fold/Expand Chevron
                                      Icon(
                                        isExpanded ? LucideIcons.chevronDown : LucideIcons.chevronRight,
                                        size: 13,
                                        color: widget.textSecondary.withValues(alpha: 0.7),
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                              // ── Collapsible Sessions List with Tree Line Indent ──
                              if (isExpanded)
                                sessions.isEmpty
                                    ? Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        child: Text(
                                          'No sessions in this project yet.',
                                          style: TextStyle(fontSize: 10.5, fontStyle: FontStyle.italic, color: widget.textSecondary),
                                        ),
                                      )
                                    : Padding(
                                        padding: const EdgeInsets.fromLTRB(4, 2, 4, 4),
                                        child: Builder(
                                          builder: (ctx) {
                                            final limit = _projectSessionLimits[projectPath] ?? _defaultSessionsPerPage;
                                            final displayed = sessions.take(limit).toList();
                                            final hasMore = sessions.length > displayed.length;
                                            final isExpandedLimit = limit > _defaultSessionsPerPage;

                                            return Column(
                                              crossAxisAlignment: CrossAxisAlignment.stretch,
                                              children: [
                                                ...List.generate(displayed.length, (sIdx) {
                                                  final s = displayed[sIdx];
                                                  final sId = s['id']?.toString() ?? '';
                                                  final sTitle = _extractSessionTitle(s, sIdx + 1);
                                                  final sTime = TimeFormatter.formatInteractionTime(s, context: context, compact: true);
                                                  final isActive = sId == widget.activeSessionId;
                                                  final isScheduled = _isScheduledSession(s);
                                                  final isSessionTurnRunning = (isActive && widget.isTurnRunning) ||
                                                      s['status'] == 'running' ||
                                                      s['isRunning'] == true ||
                                                      s['activeTurn'] != null;

                                                  return Container(
                                                    margin: const EdgeInsets.only(bottom: 2),
                                                    decoration: BoxDecoration(
                                                      color: isActive
                                                          ? (isScheduled
                                                              ? const Color(0xFFF59E0B).withValues(alpha: widget.isDark ? 0.18 : 0.10)
                                                              : const Color(0xFF6366F1).withValues(alpha: widget.isDark ? 0.14 : 0.08))
                                                          : Colors.transparent,
                                                      borderRadius: BorderRadius.circular(5),
                                                      border: Border.all(
                                                        color: isSessionTurnRunning
                                                            ? const Color(0xFF6366F1)
                                                            : (isActive
                                                                ? (isScheduled ? const Color(0xFFF59E0B).withValues(alpha: 0.7) : const Color(0xFF6366F1).withValues(alpha: 0.5))
                                                                : (isScheduled ? const Color(0xFFF59E0B).withValues(alpha: 0.20) : Colors.transparent)),
                                                        width: isSessionTurnRunning ? 1.0 : 0.7,
                                                      ),
                                                    ),
                                                    child: InkWell(
                                                      onTap: () {
                                                        Navigator.pop(context);
                                                        if (widget.onSelectSession != null) {
                                                          widget.onSelectSession!(s);
                                                        }
                                                      },
                                                      borderRadius: BorderRadius.circular(5),
                                                      child: Padding(
                                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                                        child: Row(
                                                          children: [
                                                            // Tree Hash or Status Icon
                                                            Container(
                                                              width: 20,
                                                              height: 20,
                                                              decoration: BoxDecoration(
                                                                color: isSessionTurnRunning
                                                                    ? const Color(0xFF6366F1).withValues(alpha: 0.20)
                                                                    : (isScheduled
                                                                        ? const Color(0xFFF59E0B).withValues(alpha: isActive ? 0.25 : 0.15)
                                                                        : (isActive
                                                                            ? const Color(0xFF6366F1).withValues(alpha: 0.18)
                                                                            : (widget.isDark ? const Color(0xFF1E1E24) : const Color(0xFFE2E8F0)))),
                                                                borderRadius: BorderRadius.circular(4),
                                                              ),
                                                              child: isSessionTurnRunning
                                                                  ? const Padding(
                                                                      padding: EdgeInsets.all(3.5),
                                                                      child: CircularProgressIndicator(
                                                                        strokeWidth: 1.8,
                                                                        color: Color(0xFF6366F1),
                                                                      ),
                                                                    )
                                                                  : Icon(
                                                                      isScheduled
                                                                          ? LucideIcons.clock
                                                                          : (isActive ? LucideIcons.messageSquareCheck : LucideIcons.hash),
                                                                      size: 11,
                                                                      color: isScheduled
                                                                          ? const Color(0xFFF59E0B)
                                                                          : (isActive ? const Color(0xFF6366F1) : widget.textSecondary.withValues(alpha: 0.7)),
                                                                    ),
                                                            ),
                                                            const SizedBox(width: 6),

                                                            // Session Title & Time
                                                            Expanded(
                                                              child: Column(
                                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                                mainAxisSize: MainAxisSize.min,
                                                                children: [
                                                                  Text(
                                                                    sTitle,
                                                                    maxLines: 1,
                                                                    overflow: TextOverflow.ellipsis,
                                                                    style: TextStyle(
                                                                      fontSize: 11,
                                                                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                                                                      color: isActive ? (widget.isDark ? Colors.white : const Color(0xFF4F46E5)) : widget.textPrimary,
                                                                    ),
                                                                  ),
                                                                  if (sTime.isNotEmpty || sId.isNotEmpty)
                                                                    sTime.isNotEmpty
                                                                        ? Text(
                                                                            sTime,
                                                                            maxLines: 1,
                                                                            overflow: TextOverflow.ellipsis,
                                                                            style: TextStyle(
                                                                              fontSize: 9,
                                                                              color: widget.textSecondary.withValues(alpha: 0.8),
                                                                            ),
                                                                          )
                                                                        : Text(
                                                                            sId.length > 14 ? '${sId.substring(0, 12)}...' : sId,
                                                                            maxLines: 1,
                                                                            overflow: TextOverflow.ellipsis,
                                                                            style: TextStyle(
                                                                              fontSize: 9,
                                                                              fontFamily: 'monospace',
                                                                              color: widget.textSecondary.withValues(alpha: 0.7),
                                                                            ),
                                                                          ),
                                                                ],
                                                              ),
                                                            ),
                                                            const SizedBox(width: 4),

                                                            // Active Pill
                                                            if (isActive)
                                                              Container(
                                                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                                                decoration: BoxDecoration(
                                                                  color: const Color(0xFF6366F1),
                                                                  borderRadius: BorderRadius.circular(3),
                                                                ),
                                                                child: const Text(
                                                                  'ACTIVE',
                                                                  style: TextStyle(fontSize: 7.5, fontWeight: FontWeight.w900, color: Colors.white),
                                                                ),
                                                              ),
                                                          ],
                                                        ),
                                                      ),
                                                    ),
                                                  );
                                                }),

                                                // Pagination Controls for this Project
                                                if (sessions.length > _defaultSessionsPerPage)
                                                  Padding(
                                                    padding: const EdgeInsets.only(top: 3, bottom: 2, left: 4, right: 4),
                                                    child: Row(
                                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                      children: [
                                                        Text(
                                                          '${displayed.length}/${sessions.length}',
                                                          style: TextStyle(
                                                            fontSize: 9,
                                                            color: widget.textSecondary.withValues(alpha: 0.7),
                                                          ),
                                                        ),
                                                        Row(
                                                          children: [
                                                            if (hasMore)
                                                              InkWell(
                                                                onTap: () {
                                                                  setState(() {
                                                                    _projectSessionLimits[projectPath] = limit + _defaultSessionsPerPage;
                                                                  });
                                                                },
                                                                borderRadius: BorderRadius.circular(3),
                                                                child: Padding(
                                                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                                                                  child: Row(
                                                                    mainAxisSize: MainAxisSize.min,
                                                                    children: [
                                                                      const Icon(LucideIcons.plus, size: 9, color: Color(0xFF6366F1)),
                                                                      const SizedBox(width: 2),
                                                                      Text(
                                                                        'More (${sessions.length - displayed.length})',
                                                                        style: const TextStyle(
                                                                          fontSize: 9.5,
                                                                          fontWeight: FontWeight.w700,
                                                                          color: Color(0xFF6366F1),
                                                                        ),
                                                                      ),
                                                                    ],
                                                                  ),
                                                                ),
                                                              ),
                                                            if (isExpandedLimit) ...[
                                                              const SizedBox(width: 4),
                                                              InkWell(
                                                                onTap: () {
                                                                  setState(() {
                                                                    _projectSessionLimits[projectPath] = _defaultSessionsPerPage;
                                                                  });
                                                                },
                                                                borderRadius: BorderRadius.circular(3),
                                                                child: Padding(
                                                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                                                                  child: Text(
                                                                    'Less',
                                                                    style: TextStyle(
                                                                      fontSize: 9.5,
                                                                      fontWeight: FontWeight.w600,
                                                                      color: widget.textSecondary,
                                                                    ),
                                                                  ),
                                                                ),
                                                              ),
                                                            ],
                                                          ],
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                              ],
                                            );
                                          },
                                        ),
                                      ),
                            ],
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  // ─── 4. Bottom Dock (Settings & Sign Out) ────────────────────────────────────

  Widget _buildBottomDock(BuildContext context, Color borderColor) {
    return Container(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: borderColor, width: 1.0)),
      ),
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // App Preferences (Index 6)
          _buildLinearNavItem(
            context: context,
            index: 6,
            icon: LucideIcons.settings,
            title: 'App Preferences',
            shortcut: '⌘,',
          ),

          // Sign Out / Re-authenticate
          if (widget.onSignOut != null)
            Container(
              margin: const EdgeInsets.only(top: 2),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                child: InkWell(
                  borderRadius: BorderRadius.circular(6),
                  onTap: () {
                    Navigator.pop(context);
                    widget.onSignOut!();
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6.5),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.logOut, size: 15, color: Colors.redAccent),
                        const SizedBox(width: 9),
                        const Expanded(
                          child: Text(
                            'Sign Out',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: Colors.redAccent,
                              letterSpacing: -0.1,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ─── Workspace Switcher Modal ───────────────────────────────────────────────

  void _showWorkspaceSwitcherModal(BuildContext context) {
    final currentWs = widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : AppConfig.defaultWorkspacePath;
    final presetWorkspaces = [
      '/root',
      '/var/www',
      '/var/www/ava-code',
      '/var/www/thundernexus-dev',
      '/var/www/tafsir-mart',
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (modalCtx) {
        return Container(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          decoration: BoxDecoration(
            color: widget.cardBg,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            border: Border.all(color: widget.borderColor),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(LucideIcons.layers, size: 15, color: Color(0xFF6366F1)),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Select Workspace',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: widget.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 16),
                    onPressed: () => Navigator.pop(modalCtx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...presetWorkspaces.map((wsPath) {
                final isSelected = _normalizePath(wsPath) == _normalizePath(currentWs);
                final displayName = _getProjectDisplayName(wsPath);

                return Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFF6366F1).withValues(alpha: widget.isDark ? 0.18 : 0.10)
                        : (widget.isDark ? Colors.white.withValues(alpha: 0.02) : Colors.black.withValues(alpha: 0.02)),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected ? const Color(0xFF6366F1).withValues(alpha: 0.4) : widget.borderColor,
                    ),
                  ),
                  child: ListTile(
                    dense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                    leading: Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF6366F1) : (widget.isDark ? const Color(0xFF222228) : const Color(0xFFE2E8F0)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        displayName.isNotEmpty ? displayName.substring(0, 1).toUpperCase() : 'W',
                        style: TextStyle(
                          color: isSelected ? Colors.white : widget.textPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    title: Text(
                      displayName,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                        color: isSelected ? const Color(0xFF6366F1) : widget.textPrimary,
                      ),
                    ),
                    subtitle: Text(
                      wsPath,
                      style: TextStyle(
                        fontSize: 9.5,
                        fontFamily: 'monospace',
                        color: widget.textSecondary,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(LucideIcons.check, size: 14, color: Color(0xFF6366F1))
                        : null,
                    onTap: () {
                      widget.onSelectWorkspacePath(wsPath);
                      Navigator.pop(modalCtx);
                    },
                  ),
                );
              }),
              const SizedBox(height: 8),
              // Browse Custom Workspace button
              OutlinedButton.icon(
                onPressed: () async {
                  Navigator.pop(modalCtx);
                  final chosen = await showWorkspaceFileExplorerPickerModal(
                    context,
                    initialPath: currentWs,
                    agentCoreService: widget.agentCoreService,
                    isDark: widget.isDark,
                    cardBg: widget.cardBg,
                    borderColor: widget.borderColor,
                    textPrimary: widget.textPrimary,
                    textSecondary: widget.textSecondary,
                  );
                  if (chosen != null && chosen.isNotEmpty) {
                    widget.onSelectWorkspacePath(chosen);
                  }
                },
                icon: const Icon(LucideIcons.folderSearch, size: 14, color: Color(0xFF6366F1)),
                label: const Text(
                  'Browse Custom VPS Directory...',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF6366F1)),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF6366F1), width: 0.8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                  minimumSize: const Size(double.infinity, 38),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ─── Rename Project Modal ───────────────────────────────────────────────────

  void _showRenameProjectModal(BuildContext context, String projectPath, String currentName) {
    final TextEditingController nameController = TextEditingController(text: currentName);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) {
        return Container(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(modalCtx).viewInsets.bottom + 20,
          ),
          decoration: BoxDecoration(
            color: widget.cardBg,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            border: Border.all(color: widget.borderColor),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.pencil, size: 16, color: Color(0xFF6366F1)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Rename Project',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: widget.textPrimary,
                          ),
                        ),
                        Text(
                          projectPath,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontFamily: 'monospace',
                            color: widget.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Custom Project Name / Alias',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.bold,
                  color: widget.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                decoration: BoxDecoration(
                  color: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: widget.borderColor),
                ),
                child: TextField(
                  controller: nameController,
                  autofocus: true,
                  style: TextStyle(fontSize: 13, color: widget.textPrimary),
                  decoration: const InputDecoration(
                    hintText: 'Enter project name...',
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  if (_projectAliases.containsKey(projectPath)) ...[
                    OutlinedButton(
                      onPressed: () {
                        _saveProjectAlias(projectPath, '');
                        Navigator.pop(modalCtx);
                      },
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.redAccent.withValues(alpha: 0.5)),
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Reset', style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(modalCtx),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: widget.borderColor),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text('Cancel', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        final newName = nameController.text.trim();
                        _saveProjectAlias(projectPath, newName);
                        Navigator.pop(modalCtx);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Save Name', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  // ─── Create New Session Modal ───────────────────────────────────────────────

  void _showNewSessionModal(BuildContext context) async {
    String selectedPath = widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : AppConfig.defaultWorkspacePath;
    String selectedMode = 'WORKSPACE_WRITE';
    final TextEditingController customPathController = TextEditingController(text: selectedPath);

    final presetPaths = [
      '/root',
      '/var/www',
      '/var/www/ava-code',
      '/var/www/thundernexus-dev',
      '/var/www/tafsir-mart',
    ];

    try {
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (ctx) {
          return StatefulBuilder(
            builder: (modalCtx, setModalState) {
              return Container(
                padding: EdgeInsets.fromLTRB(
                  20,
                  20,
                  20,
                  MediaQuery.of(modalCtx).viewInsets.bottom + 20,
                ),
                decoration: BoxDecoration(
                  color: widget.cardBg,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  border: Border.all(color: widget.borderColor),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(LucideIcons.plus, size: 18, color: Color(0xFF6366F1)),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Create New Agent Session',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: widget.textPrimary,
                              ),
                            ),
                            Text(
                              'Configure target directory and execution mode',
                              style: TextStyle(
                                fontSize: 11,
                                color: widget.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Target Workspace Directory',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: widget.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: widget.borderColor),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.folder, size: 16, color: Color(0xFF6366F1)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: customPathController,
                              style: TextStyle(fontSize: 13, color: widget.textPrimary, fontFamily: 'monospace'),
                              decoration: const InputDecoration(
                                hintText: 'e.g. /root or /var/www/...',
                                border: InputBorder.none,
                                isDense: true,
                              ),
                              onChanged: (val) => setModalState(() => selectedPath = val.trim()),
                            ),
                          ),
                          InkWell(
                            onTap: () async {
                              final chosen = await showWorkspaceFileExplorerPickerModal(
                                context,
                                initialPath: selectedPath,
                                agentCoreService: widget.agentCoreService,
                                isDark: widget.isDark,
                                cardBg: widget.cardBg,
                                borderColor: widget.borderColor,
                                textPrimary: widget.textPrimary,
                                textSecondary: widget.textSecondary,
                              );
                              if (chosen != null && chosen.isNotEmpty) {
                                setModalState(() {
                                  selectedPath = chosen;
                                  customPathController.text = chosen;
                                });
                              }
                            },
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                children: [
                                  Icon(LucideIcons.folderSearch, size: 14, color: Color(0xFF6366F1)),
                                  SizedBox(width: 4),
                                  Text(
                                    'Browse',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: presetPaths.map((path) {
                        final isSelected = selectedPath == path;
                        return ChoiceChip(
                          label: Text(path, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                          selected: isSelected,
                          selectedColor: const Color(0xFF6366F1).withValues(alpha: 0.2),
                          backgroundColor: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                          labelStyle: TextStyle(
                            color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary,
                            fontSize: 11,
                          ),
                          onSelected: (selected) {
                            if (selected) {
                              setModalState(() {
                                selectedPath = path;
                                customPathController.text = path;
                              });
                            }
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Agent Execution Mode',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: widget.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setModalState(() => selectedMode = 'WORKSPACE_WRITE'),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                              decoration: BoxDecoration(
                                color: selectedMode == 'WORKSPACE_WRITE'
                                    ? const Color(0xFF6366F1).withValues(alpha: 0.15)
                                    : (widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9)),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: selectedMode == 'WORKSPACE_WRITE' ? const Color(0xFF6366F1) : widget.borderColor,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(LucideIcons.code2, size: 14, color: selectedMode == 'WORKSPACE_WRITE' ? const Color(0xFF6366F1) : widget.textSecondary),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Write & Build',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: selectedMode == 'WORKSPACE_WRITE' ? FontWeight.bold : FontWeight.normal,
                                      color: selectedMode == 'WORKSPACE_WRITE' ? const Color(0xFF6366F1) : widget.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () => setModalState(() => selectedMode = 'WORKSPACE_READ'),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                              decoration: BoxDecoration(
                                color: selectedMode == 'WORKSPACE_READ'
                                    ? const Color(0xFF3B82F6).withValues(alpha: 0.15)
                                    : (widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9)),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: selectedMode == 'WORKSPACE_READ' ? const Color(0xFF3B82F6) : widget.borderColor,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(LucideIcons.shieldCheck, size: 14, color: selectedMode == 'WORKSPACE_READ' ? const Color(0xFF3B82F6) : widget.textSecondary),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Review / Read',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: selectedMode == 'WORKSPACE_READ' ? FontWeight.bold : FontWeight.normal,
                                      color: selectedMode == 'WORKSPACE_READ' ? const Color(0xFF3B82F6) : widget.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(modalCtx),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: widget.borderColor),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: Text('Cancel', style: TextStyle(color: widget.textSecondary, fontSize: 13)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              final finalPath = customPathController.text.trim().isNotEmpty
                                  ? customPathController.text.trim()
                                  : AppConfig.defaultWorkspacePath;
                              Navigator.pop(modalCtx);
                              Navigator.pop(context);
                              if (widget.onCreateNewSession != null) {
                                widget.onCreateNewSession!(
                                  workspacePath: finalPath,
                                  mode: selectedMode,
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('Start Session', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          );
        },
      );
    } finally {
      customPathController.dispose();
    }
  }
}

class _NavItemDef {
  final String group;
  final int index;
  final String title;
  final IconData icon;
  final String? shortcut;
  final String? badge;

  const _NavItemDef({
    required this.group,
    required this.index,
    required this.title,
    required this.icon,
    this.shortcut,
    this.badge,
  });
}
