import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/agent_core_service.dart';
import '../utils/app_toast.dart';
import '../utils/time_formatter.dart';

class SessionsScreen extends StatefulWidget {
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaAgentCoreService agentCoreService;
  final String? activeSessionId;
  final bool isTurnRunning;
  final Function(Map<String, dynamic> session)? onSelectSession;

  const SessionsScreen({
    super.key,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.agentCoreService,
    this.activeSessionId,
    this.isTurnRunning = false,
    this.onSelectSession,
  });

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  int _totalSessions = 0;
  bool _isLoading = true;

  String _searchQuery = '';
  String? _selectedWorkspaceFilter; // null = all, '__scheduled__' = scheduled only, or specific path
  List<Map<String, dynamic>> _allSessions = [];
  List<Map<String, dynamic>> _filteredSessions = [];

  bool _isScheduledSession(Map<String, dynamic> s) {
    if (s['metadata'] is Map) {
      final meta = s['metadata'] as Map;
      if (meta['isScheduled'] == true || meta['scheduledTaskId'] != null) return true;
    }
    final title = (s['title'] ?? s['name'] ?? s['slug'] ?? '').toString();
    return title.startsWith('⏰') || title.contains('[Scheduled]');
  }

  List<String> _getUniqueWorkspaces() {
    final set = <String>{};
    for (final s in _allSessions) {
      final locDir = (s['location'] is Map) ? s['location']['directory']?.toString() : null;
      final projWt = (s['project'] is Map) ? s['project']['worktree']?.toString() : null;
      final rawDir = (s['directory'] ?? s['workspacePath'] ?? locDir ?? projWt ?? '').toString().trim();
      final cleanDir = rawDir.endsWith('/') && rawDir.length > 1 ? rawDir.substring(0, rawDir.length - 1) : rawDir;
      if (cleanDir.isNotEmpty) set.add(cleanDir);
    }
    final list = set.toList()..sort();
    return list;
  }

  int _getScheduledSessionsCount() {
    return _allSessions.where(_isScheduledSession).length;
  }

  final Set<String> _expandedProjects = {};
  final Set<String> _showAllInProject = {};

  bool _hasLoadedAllSessions = false;
  bool _isLoadingMoreSessions = false;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  void _autoExpandProjects() {
    for (final s in _allSessions) {
      final locDir = (s['location'] is Map) ? s['location']['directory']?.toString() : null;
      final projWt = (s['project'] is Map) ? s['project']['worktree']?.toString() : null;
      final rawDir = (s['directory'] ?? s['workspacePath'] ?? locDir ?? projWt ?? '').toString().trim();
      final normDir = rawDir.endsWith('/') && rawDir.length > 1 ? rawDir.substring(0, rawDir.length - 1) : rawDir;
      if (normDir.isNotEmpty) {
        _expandedProjects.add(normDir);
      }
    }
    if (_expandedProjects.isEmpty) {
      _expandedProjects.add('/var/www/ava-code');
      _expandedProjects.add('/var/www');
    }
  }

  Future<void> _loadSessions({bool fetchAll = true}) async {
    if (fetchAll) {
      setState(() => _isLoadingMoreSessions = true);
    } else {
      final cached = await widget.agentCoreService.loadSessionsListFromCache();
      if (mounted && cached.isNotEmpty && _allSessions.isEmpty) {
        setState(() {
          _allSessions = cached;
          _autoExpandProjects();
          _applyFilters();
          _isLoading = false;
        });
      } else if (_allSessions.isEmpty) {
        setState(() => _isLoading = true);
      }
    }

    final sessions = await widget.agentCoreService.fetchSessions(
      all: true,
      limit: 200,
      activeSessionId: widget.activeSessionId,
    );

    if (mounted && sessions.isNotEmpty) {
      setState(() {
        _allSessions = sessions;
        _hasLoadedAllSessions = true;
        _autoExpandProjects();
        _applyFilters();
        _isLoading = false;
        _isLoadingMoreSessions = false;
      });
    } else if (mounted) {
      setState(() {
        _isLoading = false;
        _isLoadingMoreSessions = false;
      });
    }
  }

  void _applyFilters() {
    var filtered = _allSessions;

    // Apply Workspace / Category Filter
    if (_selectedWorkspaceFilter == '__scheduled__') {
      filtered = filtered.where(_isScheduledSession).toList();
    } else if (_selectedWorkspaceFilter != null && _selectedWorkspaceFilter!.isNotEmpty) {
      filtered = filtered.where((s) {
        final locDir = (s['location'] is Map) ? s['location']['directory']?.toString() : null;
        final projWt = (s['project'] is Map) ? s['project']['worktree']?.toString() : null;
        final dir = (s['directory'] ?? s['workspacePath'] ?? locDir ?? projWt ?? '').toString().trim();
        final normDir = dir.endsWith('/') && dir.length > 1 ? dir.substring(0, dir.length - 1) : dir;
        return normDir == _selectedWorkspaceFilter;
      }).toList();
    }

    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.toLowerCase().trim();
      filtered = filtered.where((s) {
        final title = _extractSessionTitle(s).toLowerCase();
        final id = (s['id'] ?? '').toString().toLowerCase();
        final locDir = (s['location'] is Map) ? s['location']['directory']?.toString().toLowerCase() : null;
        final dir = (s['directory'] ?? s['workspacePath'] ?? locDir ?? '').toString().toLowerCase();
        final model = _extractModelName(s).toLowerCase();
        return title.contains(q) || id.contains(q) || dir.contains(q) || model.contains(q);
      }).toList();
    }

    _totalSessions = filtered.length;
    _filteredSessions = filtered;
  }

  String _extractSessionTitle(Map<String, dynamic> s) {
    final title = s['title']?.toString() ?? s['name']?.toString() ?? s['slug']?.toString();
    if (title != null && title.trim().isNotEmpty) {
      final t = title.trim();
      if (t.startsWith('New session - 202') || t.startsWith('Child session - 202')) {
        return 'New Session';
      }
      return t;
    }
    final id = s['id']?.toString() ?? '';
    return id.isNotEmpty ? 'Session ${id.length > 8 ? id.substring(0, 8) : id}' : 'New Session';
  }

  String _extractModelName(Map<String, dynamic> s) {
    final m = s['model'];
    if (m is Map) {
      final provider = m['providerID']?.toString() ?? '';
      final modelId = m['id']?.toString() ?? m['modelID']?.toString() ?? '';
      if (provider.isNotEmpty && modelId.isNotEmpty) return '$provider/$modelId';
      if (modelId.isNotEmpty) return modelId;
    }
    if (m is String && m.isNotEmpty) return m;
    return 'Default Model';
  }

  String _formatSessionTime(Map<String, dynamic> s) {
    return TimeFormatter.formatInteractionTime(s, context: context, compact: false);
  }

  Future<void> _createNewSession() async {
    final controller = TextEditingController(text: 'New Session');
    final chosenTitle = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Text('New Session Name', style: TextStyle(color: widget.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: widget.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Session title or goal...',
            hintStyle: TextStyle(color: widget.textSecondary),
            filled: true,
            fillColor: widget.borderColor.withValues(alpha: 0.15),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: widget.borderColor),
            ),
          ),
          onSubmitted: (val) => Navigator.pop(ctx, val.trim()),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (chosenTitle == null) return; // User cancelled dialog

    final title = chosenTitle.isNotEmpty ? chosenTitle : 'New Session';
    final newId = await widget.agentCoreService.createSession(
      directory: widget.agentCoreService.workspacePath,
      agent: 'build',
      title: title,
    );

    if (newId != null && newId.isNotEmpty) {
      await _loadSessions();
      if (widget.onSelectSession != null) {
        widget.onSelectSession!({
          'id': newId,
          'title': title,
          'workspacePath': widget.agentCoreService.workspacePath,
          'mode': 'build',
        });
      }
    } else {
      if (mounted) {
        AppToast.error(context, 'Failed to create new session.');
      }
    }
  }

  Future<void> _showRenameDialog(String sessionId, String currentTitle) async {
    final controller = TextEditingController(text: currentTitle);
    final newTitle = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Text('Rename Session', style: TextStyle(color: widget.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: widget.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Enter session name...',
            hintStyle: TextStyle(color: widget.textSecondary),
            filled: true,
            fillColor: widget.borderColor.withValues(alpha: 0.15),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: widget.borderColor),
            ),
          ),
          onSubmitted: (val) => Navigator.pop(ctx, val.trim()),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (newTitle != null && newTitle.isNotEmpty && newTitle != currentTitle) {
      final ok = await widget.agentCoreService.updateSessionTitle(sessionId, newTitle);
      if (ok) {
        await _loadSessions();
        if (mounted) {
          AppToast.success(context, 'Session renamed successfully.');
        }
      }
    }
  }

  Future<void> _deleteSession(String sessionId, String title) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        title: Text('Delete Session?', style: TextStyle(color: widget.textPrimary)),
        content: Text(
          'Are you sure you want to delete "$title"? This cannot be undone.',
          style: TextStyle(color: widget.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final ok = await widget.agentCoreService.deleteSession(sessionId);
      if (ok) {
        if (mounted) {
          AppToast.success(context, 'Session deleted successfully.');
        }
        await _loadSessions();
      } else {
        if (mounted) {
          AppToast.error(context, 'Could not delete session.');
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadSessions,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Screen Header + New Session Action
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sessions Explorer',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: widget.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$_totalSessions sessions available across workspaces',
                        style: TextStyle(fontSize: 12, color: widget.textSecondary),
                      ),
                    ],
                  ),
                ),
                // Refresh Button
                IconButton(
                  icon: Icon(LucideIcons.refreshCw, size: 18, color: widget.textSecondary),
                  onPressed: _loadSessions,
                  tooltip: 'Refresh Sessions',
                ),
                const SizedBox(width: 4),
                // New Session Button
                ElevatedButton.icon(
                  onPressed: _createNewSession,
                  icon: const Icon(LucideIcons.plus, size: 15, color: Colors.white),
                  label: const Text('New Session', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Search Bar
            Container(
              decoration: BoxDecoration(
                color: widget.cardBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: widget.borderColor),
              ),
              child: TextField(
                style: TextStyle(fontSize: 13, color: widget.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Search sessions by title, model, or directory...',
                  hintStyle: TextStyle(fontSize: 12, color: widget.textSecondary),
                  prefixIcon: Icon(LucideIcons.search, size: 16, color: widget.textSecondary),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: Icon(LucideIcons.x, size: 15, color: widget.textSecondary),
                          onPressed: () {
                            setState(() {
                              _searchQuery = '';
                              _applyFilters();
                            });
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                ),
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                    _applyFilters();
                  });
                  if (val.trim().isNotEmpty && !_hasLoadedAllSessions && !_isLoadingMoreSessions) {
                    _loadSessions(fetchAll: true);
                  }
                },
              ),
            ),
            const SizedBox(height: 10),

            // Workspace & Category Filter Bar (Horizontal Chips)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  // All Workspaces Chip
                  _buildFilterChip(
                    label: 'All Workspaces',
                    count: _allSessions.length,
                    isSelected: _selectedWorkspaceFilter == null,
                    icon: LucideIcons.layoutGrid,
                    onTap: () {
                      setState(() {
                        _selectedWorkspaceFilter = null;
                        _applyFilters();
                      });
                    },
                  ),
                  const SizedBox(width: 8),

                  // Scheduled Sessions Chip (if any scheduled exist)
                  if (_getScheduledSessionsCount() > 0) ...[
                    _buildFilterChip(
                      label: 'Scheduled',
                      count: _getScheduledSessionsCount(),
                      isSelected: _selectedWorkspaceFilter == '__scheduled__',
                      icon: LucideIcons.clock,
                      accentColor: const Color(0xFFF59E0B),
                      onTap: () {
                        setState(() {
                          _selectedWorkspaceFilter = _selectedWorkspaceFilter == '__scheduled__' ? null : '__scheduled__';
                          _applyFilters();
                        });
                      },
                    ),
                    const SizedBox(width: 8),
                  ],

                  // Individual Workspace Chips
                  ..._getUniqueWorkspaces().map((wsPath) {
                    final shortName = wsPath.split('/').where((s) => s.isNotEmpty).isNotEmpty
                        ? wsPath.split('/').where((s) => s.isNotEmpty).last
                        : wsPath;
                    final wsCount = _allSessions.where((s) {
                      final locDir = (s['location'] is Map) ? s['location']['directory']?.toString() : null;
                      final projWt = (s['project'] is Map) ? s['project']['worktree']?.toString() : null;
                      final dir = (s['directory'] ?? s['workspacePath'] ?? locDir ?? projWt ?? '').toString().trim();
                      final normDir = dir.endsWith('/') && dir.length > 1 ? dir.substring(0, dir.length - 1) : dir;
                      return normDir == wsPath;
                    }).length;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _buildFilterChip(
                        label: shortName,
                        count: wsCount,
                        isSelected: _selectedWorkspaceFilter == wsPath,
                        icon: LucideIcons.folder,
                        onTap: () {
                          setState(() {
                            _selectedWorkspaceFilter = _selectedWorkspaceFilter == wsPath ? null : wsPath;
                            _applyFilters();
                          });
                        },
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Sessions List
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: CircularProgressIndicator(color: Color(0xFF6366F1)),
                ),
              )
            else if (_filteredSessions.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: widget.cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: widget.borderColor),
                ),
                child: Column(
                  children: [
                    Icon(LucideIcons.history, size: 36, color: widget.textSecondary.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    Text(
                      _searchQuery.isNotEmpty
                          ? 'No sessions match "$_searchQuery"'
                          : 'No sessions found',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: widget.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Create a new session to start chatting with AvA Code.',
                      style: TextStyle(fontSize: 12, color: widget.textSecondary),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton.icon(
                      onPressed: _createNewSession,
                      icon: const Icon(LucideIcons.plus, size: 16, color: Colors.white),
                      label: const Text('Create New Session', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                    ),
                  ],
                ),
              )
            else
              Builder(
                builder: (ctx) {
                  final Map<String, List<Map<String, dynamic>>> groupedByPath = {};
                  for (final sess in _filteredSessions) {
                    final locDir = (sess['location'] is Map) ? sess['location']['directory']?.toString() : null;
                    final projWt = (sess['project'] is Map) ? sess['project']['worktree']?.toString() : null;
                    final rawDir = (sess['directory'] ?? sess['workspacePath'] ?? locDir ?? projWt ?? '/var/www/ava-code').toString().trim();
                    final normDir = rawDir.endsWith('/') && rawDir.length > 1 ? rawDir.substring(0, rawDir.length - 1) : rawDir;
                    final effectiveDir = normDir.isNotEmpty ? normDir : '/var/www/ava-code';
                    groupedByPath.putIfAbsent(effectiveDir, () => []).add(sess);
                  }

                  final paths = groupedByPath.keys.toList()..sort();

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: paths.map((wsPath) {
                      final wsSessions = groupedByPath[wsPath] ?? [];
                      final segments = wsPath.split('/').where((s) => s.isNotEmpty).toList();
                      final shortName = segments.isNotEmpty ? segments.last : wsPath;
                      final displayPath = wsPath.endsWith('/') ? wsPath : '$wsPath/';

                      final isExpanded = _expandedProjects.contains(wsPath);
                      final isShowingAll = _showAllInProject.contains(wsPath);
                      final displayedSessions = isShowingAll ? wsSessions : wsSessions.take(10).toList();

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Workspace Path Section Header Card (Expandable Accordion)
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  if (isExpanded) {
                                    _expandedProjects.remove(wsPath);
                                  } else {
                                    _expandedProjects.add(wsPath);
                                  }
                                });
                              },
                              borderRadius: BorderRadius.circular(10),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                margin: const EdgeInsets.only(top: 12, bottom: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                                decoration: BoxDecoration(
                                  color: isExpanded
                                      ? const Color(0xFF6366F1).withValues(alpha: 0.12)
                                      : widget.borderColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isExpanded
                                        ? const Color(0xFF6366F1).withValues(alpha: 0.6)
                                        : widget.borderColor,
                                    width: isExpanded ? 1.2 : 0.8,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      isExpanded ? LucideIcons.folderOpen : LucideIcons.folder,
                                      size: 16,
                                      color: const Color(0xFF6366F1),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            shortName,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w800,
                                              color: widget.textPrimary,
                                            ),
                                          ),
                                          Text(
                                            displayPath,
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontFamily: 'monospace',
                                              color: widget.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        '${wsSessions.length} session${wsSessions.length == 1 ? '' : 's'}',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF6366F1),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Icon(
                                      isExpanded ? LucideIcons.chevronDown : LucideIcons.chevronRight,
                                      size: 16,
                                      color: widget.textSecondary,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),

                          // Sessions inside this Workspace Path (only when expanded)
                          if (isExpanded) ...[
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: displayedSessions.length,
                              separatorBuilder: (ctx, i) => const SizedBox(height: 10),
                              itemBuilder: (ctx, i) {
                                final sess = displayedSessions[i];
                                final sessId = sess['id']?.toString() ?? '';
                                final title = _extractSessionTitle(sess);
                                final model = _extractModelName(sess);
                                final locDir = (sess['location'] is Map) ? sess['location']['directory']?.toString() : null;
                                final projWt = (sess['project'] is Map) ? sess['project']['worktree']?.toString() : null;
                                final dir = sess['directory']?.toString() ?? sess['workspacePath']?.toString() ?? locDir ?? projWt ?? wsPath;
                                final timeStr = _formatSessionTime(sess);
                                final agentMode = (sess['agent']?.toString() ?? sess['mode']?.toString() ?? 'build').toUpperCase();
                                final isScheduled = _isScheduledSession(sess);
                                final isSessionTurnRunning = (sessId == widget.activeSessionId && widget.isTurnRunning) ||
                                    sess['status'] == 'running' ||
                                    sess['isRunning'] == true ||
                                    sess['activeTurn'] != null;

                                return Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: () {
                                      if (widget.onSelectSession != null) {
                                        widget.onSelectSession!({
                                          'id': sessId,
                                          'title': title,
                                          'workspacePath': dir,
                                          'mode': agentMode.toLowerCase(),
                                        });
                                      }
                                    },
                                    borderRadius: BorderRadius.circular(14),
                                    child: Container(
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: widget.cardBg,
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: isSessionTurnRunning
                                              ? const Color(0xFF6366F1)
                                              : (isScheduled
                                                  ? const Color(0xFFF59E0B).withValues(alpha: 0.45)
                                                  : widget.borderColor),
                                          width: isSessionTurnRunning || isScheduled ? 1.0 : 0.8,
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // Top Row: Icon, Title, Badges, Actions
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                width: 34,
                                                height: 34,
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: isSessionTurnRunning
                                                      ? const Color(0xFF6366F1).withValues(alpha: 0.18)
                                                      : (isScheduled
                                                          ? const Color(0xFFF59E0B).withValues(alpha: 0.14)
                                                          : const Color(0xFF6366F1).withValues(alpha: 0.1)),
                                                  borderRadius: BorderRadius.circular(10),
                                                ),
                                                child: isSessionTurnRunning
                                                    ? const CircularProgressIndicator(
                                                        strokeWidth: 2.2,
                                                        color: Color(0xFF6366F1),
                                                      )
                                                    : Icon(
                                                        isScheduled ? LucideIcons.clock : LucideIcons.messageSquare,
                                                        size: 16,
                                                        color: isScheduled ? const Color(0xFFF59E0B) : const Color(0xFF6366F1),
                                                      ),
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      title,
                                                      style: TextStyle(
                                                        fontSize: 14,
                                                        fontWeight: FontWeight.bold,
                                                        color: widget.textPrimary,
                                                      ),
                                                      maxLines: 2,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                    const SizedBox(height: 4),
                                                    Wrap(
                                                      spacing: 6,
                                                      runSpacing: 4,
                                                      crossAxisAlignment: WrapCrossAlignment.center,
                                                      children: [
                                                        if (isSessionTurnRunning)
                                                          Container(
                                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                            decoration: BoxDecoration(
                                                              color: const Color(0xFF6366F1).withValues(alpha: 0.18),
                                                              borderRadius: BorderRadius.circular(6),
                                                              border: Border.all(
                                                                color: const Color(0xFF6366F1).withValues(alpha: 0.5),
                                                                width: 0.8,
                                                              ),
                                                            ),
                                                            child: const Row(
                                                              mainAxisSize: MainAxisSize.min,
                                                              children: [
                                                                SizedBox(
                                                                  width: 6,
                                                                  height: 6,
                                                                  child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF6366F1)),
                                                                ),
                                                                SizedBox(width: 4),
                                                                Text(
                                                                  'RUNNING',
                                                                  style: TextStyle(
                                                                    fontSize: 10,
                                                                    fontWeight: FontWeight.bold,
                                                                    color: Color(0xFF6366F1),
                                                                  ),
                                                                ),
                                                              ],
                                                            ),
                                                          ),

                                                        if (isScheduled)
                                                          Container(
                                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                            decoration: BoxDecoration(
                                                              color: const Color(0xFFF59E0B).withValues(alpha: 0.14),
                                                              borderRadius: BorderRadius.circular(6),
                                                              border: Border.all(
                                                                color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                                                                width: 0.6,
                                                              ),
                                                            ),
                                                            child: const Row(
                                                              mainAxisSize: MainAxisSize.min,
                                                              children: [
                                                                Icon(LucideIcons.clock, size: 9, color: Color(0xFFF59E0B)),
                                                                SizedBox(width: 3),
                                                                Text(
                                                                  'SCHEDULED',
                                                                  style: TextStyle(
                                                                    fontSize: 10,
                                                                    fontWeight: FontWeight.bold,
                                                                    color: Color(0xFFF59E0B),
                                                                  ),
                                                                ),
                                                              ],
                                                            ),
                                                          ),

                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                          decoration: BoxDecoration(
                                                            color: widget.borderColor.withValues(alpha: 0.3),
                                                            borderRadius: BorderRadius.circular(6),
                                                          ),
                                                          child: Text(
                                                            agentMode,
                                                            style: TextStyle(
                                                              fontSize: 9.5,
                                                              fontWeight: FontWeight.bold,
                                                              color: widget.textSecondary,
                                                            ),
                                                          ),
                                                        ),

                                                         Container(
                                                           padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                           decoration: BoxDecoration(
                                                             color: widget.borderColor.withValues(alpha: 0.25),
                                                             borderRadius: BorderRadius.circular(6),
                                                           ),
                                                           child: Text.rich(
                                                             TextSpan(
                                                               children: [
                                                                 WidgetSpan(
                                                                   alignment: PlaceholderAlignment.middle,
                                                                   child: Padding(
                                                                     padding: const EdgeInsets.only(right: 3.5),
                                                                     child: Icon(
                                                                       LucideIcons.clock,
                                                                       size: 10,
                                                                       color: widget.textSecondary.withValues(alpha: 0.85),
                                                                     ),
                                                                   ),
                                                                 ),
                                                                 TextSpan(
                                                                   text: timeStr,
                                                                   style: TextStyle(
                                                                     fontSize: 10.5,
                                                                     fontWeight: FontWeight.w600,
                                                                     color: widget.textSecondary,
                                                                   ),
                                                                 ),
                                                               ],
                                                             ),
                                                             maxLines: 1,
                                                             overflow: TextOverflow.ellipsis,
                                                           ),
                                                         ),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  IconButton(
                                                    icon: Icon(LucideIcons.pencil, size: 14, color: widget.textSecondary),
                                                    onPressed: () => _showRenameDialog(sessId, title),
                                                    tooltip: 'Rename Session',
                                                    padding: EdgeInsets.zero,
                                                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                                  ),
                                                  IconButton(
                                                    icon: Icon(LucideIcons.trash2, size: 15, color: widget.textSecondary),
                                                    onPressed: () => _deleteSession(sessId, title),
                                                    tooltip: 'Delete Session',
                                                    padding: EdgeInsets.zero,
                                                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 10),

                                          // Meta Row: Directory & Model
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: widget.borderColor.withValues(alpha: 0.2),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Row(
                                              children: [
                                                Icon(LucideIcons.folder, size: 13, color: widget.textSecondary),
                                                const SizedBox(width: 6),
                                                Expanded(
                                                  child: Text(
                                                    dir,
                                                    style: TextStyle(fontSize: 11.5, color: widget.textPrimary),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Icon(LucideIcons.cpu, size: 13, color: widget.textSecondary),
                                                const SizedBox(width: 4),
                                                Flexible(
                                                  child: Text(
                                                    model.length > 25 ? '...${model.substring(model.length - 22)}' : model,
                                                    style: TextStyle(fontSize: 11, color: widget.textSecondary),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                            if (wsSessions.length > 10)
                              Padding(
                                padding: const EdgeInsets.only(top: 8, bottom: 4),
                                child: Center(
                                  child: OutlinedButton.icon(
                                    onPressed: () {
                                      setState(() {
                                        if (isShowingAll) {
                                          _showAllInProject.remove(wsPath);
                                        } else {
                                          _showAllInProject.add(wsPath);
                                        }
                                      });
                                    },
                                    icon: Icon(
                                      isShowingAll ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                                      size: 14,
                                      color: const Color(0xFF6366F1),
                                    ),
                                    label: Text(
                                      isShowingAll
                                          ? 'Show recent 10 sessions only'
                                          : 'Show all ${wsSessions.length} sessions (+${wsSessions.length - 10} more)',
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF6366F1),
                                      ),
                                    ),
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(color: Color(0xFF6366F1), width: 0.8),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                          const SizedBox(height: 8),
                        ],
                      );
                    }).toList(),
                  );
                },
              ),

            // Load All Workspace Sessions Button
            if (!_hasLoadedAllSessions) ...[
              const SizedBox(height: 16),
              Center(
                child: OutlinedButton.icon(
                  onPressed: _isLoadingMoreSessions ? null : () => _loadSessions(fetchAll: true),
                  icon: _isLoadingMoreSessions
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)))
                      : const Icon(LucideIcons.download, size: 16, color: Color(0xFF6366F1)),
                  label: Text(
                    _isLoadingMoreSessions ? 'Loading Sessions Across Workspaces...' : 'Load All Workspace Sessions',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF6366F1), width: 1.0),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required int count,
    required bool isSelected,
    required IconData icon,
    required VoidCallback onTap,
    Color? accentColor,
  }) {
    final effectiveColor = accentColor ?? const Color(0xFF6366F1);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? effectiveColor.withValues(alpha: 0.16)
                : widget.cardBg,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected
                  ? effectiveColor.withValues(alpha: 0.8)
                  : widget.borderColor,
              width: isSelected ? 1.2 : 0.8,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 13,
                color: isSelected ? effectiveColor : widget.textSecondary,
              ),
              const SizedBox(width: 5),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? effectiveColor : widget.textPrimary,
                ),
              ),
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                decoration: BoxDecoration(
                  color: isSelected
                      ? effectiveColor.withValues(alpha: 0.22)
                      : widget.borderColor.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? effectiveColor : widget.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
