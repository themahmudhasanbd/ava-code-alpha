import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/agent_core_service.dart';
import '../utils/app_toast.dart';

// ─── Schedule Types & Labels ──────────────────────────────────────────────────

const _scheduleTypes = [
  {'value': 'interval', 'label': 'Repeating Interval', 'icon': LucideIcons.repeat2},
  {'value': 'daily', 'label': 'Daily at Time', 'icon': LucideIcons.sun},
  {'value': 'weekly', 'label': 'Weekly', 'icon': LucideIcons.calendarDays},
  {'value': 'once', 'label': 'Run Once', 'icon': LucideIcons.zap},
  {'value': 'cron', 'label': 'Custom Cron', 'icon': LucideIcons.code},
];

const _intervalPresets = [
  {'label': 'Every 5 minutes', 'amount': 5, 'unit': 'minutes'},
  {'label': 'Every 15 minutes', 'amount': 15, 'unit': 'minutes'},
  {'label': 'Every 30 minutes', 'amount': 30, 'unit': 'minutes'},
  {'label': 'Every hour', 'amount': 1, 'unit': 'hours'},
  {'label': 'Every 2 hours', 'amount': 2, 'unit': 'hours'},
  {'label': 'Every 6 hours', 'amount': 6, 'unit': 'hours'},
  {'label': 'Every 12 hours', 'amount': 12, 'unit': 'hours'},
  {'label': 'Every day', 'amount': 1, 'unit': 'days'},
];

const _weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const _targetTypes = [
  {'value': 'agent_prompt', 'label': 'AI Agent Session', 'icon': LucideIcons.bot, 'desc': 'Creates autonomous session & runs prompt with full AI reasoning'},
  {'value': 'shell_command', 'label': 'Shell Command', 'icon': LucideIcons.terminal, 'desc': 'Runs direct bash script or command in target project workspace'},
];

const _agents = [
  {'id': 'build', 'name': 'Builder', 'color': Color(0xFF6366F1), 'icon': LucideIcons.hammer},
  {'id': 'plan', 'name': 'Planner', 'color': Color(0xFF38BDF8), 'icon': LucideIcons.compass},
  {'id': 'explore', 'name': 'Explorer', 'color': Color(0xFF10B981), 'icon': LucideIcons.search},
  {'id': 'general', 'name': 'General', 'color': Color(0xFFA855F7), 'icon': LucideIcons.sparkles},
];

const _sandboxModes = [
  {'id': 'WORKSPACE_WRITE', 'name': 'Workspace Write', 'color': Color(0xFF38BDF8)},
  {'id': 'FULL_ACCESS', 'name': 'Full Access', 'color': Color(0xFFF59E0B)},
  {'id': 'READ_ONLY', 'name': 'Read Only', 'color': Color(0xFF10B981)},
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

class ScheduledTasksScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaAgentCoreService agentCoreService;
  final ValueChanged<Map<String, dynamic>>? onSelectSession;

  const ScheduledTasksScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.agentCoreService,
    this.onSelectSession,
  });

  @override
  State<ScheduledTasksScreen> createState() => _ScheduledTasksScreenState();
}

class _ScheduledTasksScreenState extends State<ScheduledTasksScreen> {
  List<Map<String, dynamic>> _tasks = [];
  Map<String, dynamic> _schedulerSettings = {};
  bool _loading = true;
  String? _error;
  final Set<String> _expandedHistory = {};
  final Set<String> _runningNow = {};

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() { _loading = true; _error = null; });
    try {
      final tasks = await widget.agentCoreService.fetchScheduledTasks();
      final settings = await widget.agentCoreService.fetchSchedulerSettings();
      if (mounted) {
        setState(() {
          _tasks = tasks;
          _schedulerSettings = settings;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  Future<void> _toggleTask(Map<String, dynamic> task) async {
    final updated = await widget.agentCoreService.toggleScheduledTask(task['id'].toString());
    if (updated != null && mounted) {
      setState(() {
        final idx = _tasks.indexWhere((t) => t['id'] == task['id']);
        if (idx != -1) _tasks[idx] = updated;
      });
    }
  }

  Future<void> _deleteTask(Map<String, dynamic> task) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete Scheduled Task', style: TextStyle(color: widget.textPrimary, fontWeight: FontWeight.bold)),
        content: Text('Delete "${task['name']}"? This cannot be undone.', style: TextStyle(color: widget.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel', style: TextStyle(color: widget.textSecondary))),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final ok = await widget.agentCoreService.deleteScheduledTask(task['id'].toString());
    if (ok && mounted) {
      setState(() => _tasks.removeWhere((t) => t['id'] == task['id']));
      AppToast.info(context, 'Task "${task['name']}" deleted');
    }
  }

  Future<void> _clearHistory(Map<String, dynamic> task) async {
    final id = task['id'].toString();
    final ok = await widget.agentCoreService.clearScheduledTaskHistory(id);
    if (ok && mounted) {
      setState(() {
        final idx = _tasks.indexWhere((t) => t['id'] == id);
        if (idx != -1) {
          final copy = Map<String, dynamic>.from(_tasks[idx]);
          copy['history'] = [];
          _tasks[idx] = copy;
        }
      });
      AppToast.info(context, 'History cleared.');
    }
  }

  Future<void> _runNow(Map<String, dynamic> task) async {
    final id = task['id'].toString();
    setState(() => _runningNow.add(id));
    final ok = await widget.agentCoreService.runScheduledTaskNow(id);
    if (mounted) {
      setState(() => _runningNow.remove(id));
      if (ok) {
        AppToast.success(context, 'Task "${task['name']}" triggered!');
      } else {
        AppToast.error(context, 'Failed to trigger task.');
      }
      if (ok) Future.delayed(const Duration(seconds: 3), _loadAll);
    }
  }

  void _openCreateSheet() => _openTaskSheet(null);
  void _openEditSheet(Map<String, dynamic> task) => _openTaskSheet(task);

  Future<void> _openTaskSheet(Map<String, dynamic>? existingTask) async {
    final result = await showModalBottomSheet<Map<String, dynamic>?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _TaskFormSheet(
        isDark: widget.isDark,
        cardBg: widget.cardBg,
        borderColor: widget.borderColor,
        textPrimary: widget.textPrimary,
        textSecondary: widget.textSecondary,
        existingTask: existingTask,
        agentCoreService: widget.agentCoreService,
      ),
    );
    if (result != null) {
      await _loadAll();
    }
  }

  Future<void> _openSettingsModal() async {
    final updated = await showModalBottomSheet<Map<String, dynamic>?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _SchedulerSettingsModal(
        isDark: widget.isDark,
        cardBg: widget.cardBg,
        borderColor: widget.borderColor,
        textPrimary: widget.textPrimary,
        textSecondary: widget.textSecondary,
        currentSettings: _schedulerSettings,
        agentCoreService: widget.agentCoreService,
      ),
    );
    if (updated != null && mounted) {
      setState(() => _schedulerSettings = updated);
      await _loadAll();
    }
  }

  // ─── UI ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: widget.isDark ? const Color(0xFF0A0A0F) : const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(children: [
          _buildHeader(),
          Expanded(child: _buildBody()),
        ]),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreateSheet,
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        icon: const Icon(LucideIcons.plus, size: 18),
        label: const Text('New Task', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  Widget _buildHeader() {
    final isMasterEnabled = _schedulerSettings['schedulerEnabled'] != false;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 12, 10),
      decoration: BoxDecoration(
        color: widget.cardBg,
        border: Border(bottom: BorderSide(color: widget.borderColor, width: 0.8)),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: isMasterEnabled
                  ? const Color(0xFF6366F1).withValues(alpha: 0.12)
                  : const Color(0xFFEF4444).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(
              LucideIcons.calendarClock,
              size: 16,
              color: isMasterEnabled ? const Color(0xFF6366F1) : const Color(0xFFEF4444),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(
                children: [
                  Flexible(
                    child: Text('Scheduled Sessions', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: widget.textPrimary, letterSpacing: -0.2), overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isMasterEnabled ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFFEF4444).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      isMasterEnabled ? 'ACTIVE' : 'PAUSED',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: isMasterEnabled ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      ),
                    ),
                  ),
                ],
              ),
              Text('Auto-run agent sessions & tasks on schedule', style: TextStyle(fontSize: 11, color: widget.textSecondary), overflow: TextOverflow.ellipsis),
            ]),
          ),
          IconButton(
            onPressed: _openSettingsModal,
            icon: Icon(LucideIcons.settings, size: 16, color: widget.textSecondary),
            tooltip: 'Scheduler Settings',
          ),
          IconButton(
            onPressed: _loadAll,
            icon: Icon(LucideIcons.refreshCw, size: 16, color: widget.textSecondary),
            tooltip: 'Refresh',
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2));
    }
    if (_error != null) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(LucideIcons.wifiOff, size: 36, color: widget.textSecondary),
          const SizedBox(height: 12),
          Text('Failed to load tasks', style: TextStyle(color: widget.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(_error!, style: TextStyle(color: widget.textSecondary, fontSize: 12)),
          const SizedBox(height: 16),
          TextButton.icon(onPressed: _loadAll, icon: const Icon(LucideIcons.refreshCw, size: 14), label: const Text('Retry')),
        ]),
      );
    }
    if (_tasks.isEmpty) return _buildEmptyState();
    return RefreshIndicator(
      color: const Color(0xFF6366F1),
      onRefresh: _loadAll,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 100),
        itemCount: _tasks.length,
        itemBuilder: (ctx, i) => _buildTaskCard(_tasks[i]),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: const Color(0xFF6366F1).withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Icon(LucideIcons.calendarClock, size: 32, color: Color(0xFF6366F1)),
        ),
        const SizedBox(height: 16),
        Text('No scheduled tasks yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: widget.textPrimary)),
        const SizedBox(height: 6),
        Text('Tap + New Task to schedule an AI agent session\nor shell script to run automatically.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: widget.textSecondary, height: 1.5)),
      ]),
    );
  }

  Widget _buildTaskCard(Map<String, dynamic> task) {
    final id = task['id']?.toString() ?? '';
    final name = task['name']?.toString() ?? 'Unnamed Task';
    final enabled = task['enabled'] == true;
    final nextRun = task['nextRun']?.toString();
    final lastRun = task['lastRun']?.toString();
    final lastStatus = task['lastStatus']?.toString() ?? '';
    final scheduleType = task['scheduleType']?.toString() ?? '';
    final targetType = task['targetType']?.toString() ?? 'agent_prompt';
    final agentRole = task['agent']?.toString() ?? 'build';
    final sandboxMode = task['sandboxMode']?.toString() ?? 'WORKSPACE_WRITE';
    final notifyOnComplete = task['notifyOnComplete'] != false;
    final lastSessionId = task['lastSessionId']?.toString();
    final history = (task['history'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    final isRunning = _runningNow.contains(id);
    final histExpanded = _expandedHistory.contains(id);

    final isAgentTask = targetType == 'agent_prompt';

    Color typeColor;
    IconData typeIcon;
    switch (scheduleType) {
      case 'once': typeColor = const Color(0xFFF59E0B); typeIcon = LucideIcons.zap; break;
      case 'interval': typeColor = const Color(0xFF38BDF8); typeIcon = LucideIcons.repeat2; break;
      case 'daily': typeColor = const Color(0xFF10B981); typeIcon = LucideIcons.sun; break;
      case 'weekly': typeColor = const Color(0xFFA855F7); typeIcon = LucideIcons.calendarDays; break;
      case 'cron': typeColor = const Color(0xFFEC4899); typeIcon = LucideIcons.code; break;
      default: typeColor = const Color(0xFF6366F1); typeIcon = LucideIcons.clock;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: enabled ? typeColor.withValues(alpha: 0.35) : widget.borderColor,
          width: 0.8,
        ),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // ── Header Row ──
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 12, 6),
          child: Row(children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: typeColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(typeIcon, size: 14, color: typeColor),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: widget.textPrimary)),
                const SizedBox(height: 2),
                Text(_scheduleLabel(task), style: TextStyle(fontSize: 11, color: typeColor, fontWeight: FontWeight.w600)),
              ]),
            ),
            // Enable/Disable switch
            Transform.scale(
              scale: 0.8,
              child: Switch(
                value: enabled,
                activeThumbColor: const Color(0xFF6366F1),
                onChanged: (_) => _toggleTask(task),
              ),
            ),
          ]),
        ),

        // ── Badges Row (Target Type, Agent Role, Push Alert) ──
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          child: Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              // Target Badge
              _badge(
                label: isAgentTask ? 'AI Session' : 'Shell Script',
                color: isAgentTask ? const Color(0xFF6366F1) : const Color(0xFF10B981),
              ),
              // Agent Role Pill if AI Session
              if (isAgentTask)
                _badge(
                  label: agentRole.toUpperCase(),
                  color: const Color(0xFF38BDF8),
                ),
              // Sandbox Mode Pill
              _badge(
                label: sandboxMode == 'FULL_ACCESS' ? 'Full Access' : (sandboxMode == 'READ_ONLY' ? 'Read Only' : 'Workspace'),
                color: sandboxMode == 'FULL_ACCESS' ? const Color(0xFFF59E0B) : const Color(0xFF64748B),
              ),
              // Push Alert status
              _badge(
                label: notifyOnComplete ? 'Push On' : 'Push Off',
                color: notifyOnComplete ? const Color(0xFF10B981) : widget.textSecondary,
              ),
            ],
          ),
        ),

        // ── Next / Last Run Row ──
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 4, 14, 8),
          child: Wrap(
            spacing: 12,
            runSpacing: 4,
            children: [
              if (nextRun != null)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(LucideIcons.clock, size: 11, color: widget.textSecondary),
                  const SizedBox(width: 4),
                  Text('Next: ${_formatDateTime(nextRun)}', style: TextStyle(fontSize: 11, color: widget.textSecondary)),
                ]),
              if (lastRun != null)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(
                    lastStatus == 'success' ? LucideIcons.checkCircle2 : lastStatus == 'error' ? LucideIcons.circleX : LucideIcons.clock,
                    size: 11,
                    color: lastStatus == 'success' ? const Color(0xFF10B981) : lastStatus == 'error' ? Colors.redAccent : widget.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text('Last: ${_formatDateTime(lastRun)}', style: TextStyle(fontSize: 11, color: widget.textSecondary)),
                ]),
            ],
          ),
        ),

        // ── Action Row ──
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
          child: Row(children: [
            // Run Now Button
            Expanded(
              child: OutlinedButton.icon(
                onPressed: isRunning ? null : () => _runNow(task),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  side: BorderSide(color: const Color(0xFF6366F1).withValues(alpha: 0.5)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: isRunning
                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF6366F1)))
                    : const Icon(LucideIcons.play, size: 12, color: Color(0xFF6366F1)),
                label: Text(isRunning ? 'Running...' : 'Run Now', style: const TextStyle(fontSize: 11, color: Color(0xFF6366F1), fontWeight: FontWeight.w600)),
              ),
            ),
            if (lastSessionId != null && lastSessionId.isNotEmpty) ...[
              const SizedBox(width: 6),
              OutlinedButton.icon(
                onPressed: () {
                  widget.onSelectSession?.call({'id': lastSessionId});
                  AppToast.info(context, 'Opening scheduled session $lastSessionId');
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  side: BorderSide(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(LucideIcons.messageSquare, size: 12, color: Color(0xFF38BDF8)),
                label: const Text('Session', style: TextStyle(fontSize: 11, color: Color(0xFF38BDF8), fontWeight: FontWeight.w600)),
              ),
            ],
            const SizedBox(width: 6),
            // Edit Button
            IconButton(
              onPressed: () => _openEditSheet(task),
              icon: Icon(LucideIcons.pencil, size: 14, color: widget.textSecondary),
              tooltip: 'Edit',
              style: IconButton.styleFrom(
                backgroundColor: widget.isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.04),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(width: 4),
            // Delete Button
            IconButton(
              onPressed: () => _deleteTask(task),
              icon: const Icon(LucideIcons.trash2, size: 14, color: Colors.redAccent),
              tooltip: 'Delete',
              style: IconButton.styleFrom(
                backgroundColor: Colors.red.withValues(alpha: 0.06),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(width: 4),
            // History toggle
            if (history.isNotEmpty)
              IconButton(
                onPressed: () => setState(() {
                  if (histExpanded) { _expandedHistory.remove(id); } else { _expandedHistory.add(id); }
                }),
                icon: Icon(histExpanded ? LucideIcons.chevronUp : LucideIcons.history, size: 14, color: widget.textSecondary),
                tooltip: 'History',
                style: IconButton.styleFrom(
                  backgroundColor: widget.isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.04),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
          ]),
        ),

        // ── History Panel ──
        if (histExpanded && history.isNotEmpty)
          Container(
            decoration: BoxDecoration(
              color: widget.isDark ? Colors.white.withValues(alpha: 0.03) : Colors.black.withValues(alpha: 0.02),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(14)),
              border: Border(top: BorderSide(color: widget.borderColor, width: 0.5)),
            ),
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Run History (${history.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: widget.textSecondary, letterSpacing: 0.5)),
                  InkWell(
                    onTap: () => _clearHistory(task),
                    child: Text('Clear', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.redAccent.withValues(alpha: 0.8))),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ...history.take(5).map((h) => _buildHistoryRow(h)),
            ]),
          ),
      ]),
    );
  }

  Widget _badge({required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 0.6),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  Widget _buildHistoryRow(Map<String, dynamic> h) {
    final status = h['status']?.toString() ?? '';
    final runAt = h['timestamp']?.toString() ?? h['runAt']?.toString() ?? '';
    final output = h['output']?.toString() ?? h['summary']?.toString() ?? '';
    final sessId = h['sessionId']?.toString();
    final isSuccess = status == 'success';
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(
          isSuccess ? LucideIcons.checkCircle2 : LucideIcons.circleX,
          size: 12,
          color: isSuccess ? const Color(0xFF10B981) : Colors.redAccent,
        ),
        const SizedBox(width: 6),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(
            children: [
              Text(_formatDateTime(runAt), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: widget.textSecondary)),
              if (sessId != null && sessId.isNotEmpty) ...[
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    widget.onSelectSession?.call({'id': sessId});
                    AppToast.info(context, 'Opening session $sessId');
                  },
                  child: Text('Session #$sessId', style: const TextStyle(fontSize: 9.5, color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, decoration: TextDecoration.underline)),
                ),
              ],
            ],
          ),
          if (output.isNotEmpty)
            Text(output.substring(0, output.length.clamp(0, 150)), style: TextStyle(fontSize: 10, color: widget.textSecondary.withValues(alpha: 0.7)), maxLines: 2, overflow: TextOverflow.ellipsis),
        ])),
      ]),
    );
  }

  String _scheduleLabel(Map<String, dynamic> task) {
    final type = task['scheduleType']?.toString() ?? '';
    final val = task['scheduleValue'];
    switch (type) {
      case 'interval':
        if (val is Map) return 'Every ${val['amount']} ${val['unit']}';
        if (val is num) return 'Every $val minutes';
        return 'Interval';
      case 'daily':
        if (val is Map) return 'Daily at ${_pad(val['hour'])}:${_pad(val['minute'])}';
        return 'Daily';
      case 'weekly':
        if (val is Map) {
          final dow = _weekdays[(val['dayOfWeek'] as num?)?.toInt() ?? 0];
          return '$dow at ${_pad(val['hour'])}:${_pad(val['minute'])}';
        }
        return 'Weekly';
      case 'once':
        if (val is String) return 'Once: ${_formatDateTime(val)}';
        return 'Once';
      case 'cron':
        return 'Cron: $val';
      default:
        return type;
    }
  }

  String _pad(dynamic v) => (v?.toString() ?? '0').padLeft(2, '0');

  String _formatDateTime(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.year}-${_pad(dt.month)}-${_pad(dt.day)} ${_pad(dt.hour)}:${_pad(dt.minute)}';
    } catch (e) {
      debugPrint('[FormatDate Error] $e');
      return iso.length > 16 ? iso.substring(0, 16) : iso;
    }
  }
}

// ─── Task Form Sheet ──────────────────────────────────────────────────────────

class _TaskFormSheet extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final Map<String, dynamic>? existingTask;
  final AvaAgentCoreService agentCoreService;

  const _TaskFormSheet({
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.existingTask,
    required this.agentCoreService,
  });

  @override
  State<_TaskFormSheet> createState() => _TaskFormSheetState();
}

class _TaskFormSheetState extends State<_TaskFormSheet> {
  final _nameCtrl = TextEditingController();
  final _promptCtrl = TextEditingController();
  final _cronCtrl = TextEditingController();
  final _workspaceCtrl = TextEditingController();

  String _targetType = 'agent_prompt';
  String _agentRole = 'build';
  String _sandboxMode = 'WORKSPACE_WRITE';
  bool _notifyOnComplete = true;

  String _scheduleType = 'interval';
  int _intervalPresetIdx = 2; // Every 30 minutes
  int _dailyHour = 9;
  int _dailyMinute = 0;
  int _weeklyDay = 1; // Monday
  int _weeklyHour = 9;
  int _weeklyMinute = 0;
  DateTime _onceDateTime = DateTime.now().add(const Duration(hours: 1));
  bool _enabled = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _workspaceCtrl.text = widget.agentCoreService.workspacePath;
    final t = widget.existingTask;
    if (t != null) {
      _nameCtrl.text = t['name']?.toString() ?? '';
      _promptCtrl.text = t['prompt']?.toString() ?? '';
      _targetType = t['targetType']?.toString() ?? 'agent_prompt';
      _agentRole = t['agent']?.toString() ?? 'build';
      _sandboxMode = t['sandboxMode']?.toString() ?? 'WORKSPACE_WRITE';
      _notifyOnComplete = t['notifyOnComplete'] != false;
      _scheduleType = t['scheduleType']?.toString() ?? 'interval';
      _enabled = t['enabled'] == true;
      if (t['workspacePath'] != null && t['workspacePath'].toString().isNotEmpty) {
        _workspaceCtrl.text = t['workspacePath'].toString();
      }

      final val = t['scheduleValue'];
      if (_scheduleType == 'interval') {
        if (val is Map) {
          final match = _intervalPresets.indexWhere((p) => p['amount'] == val['amount'] && p['unit'] == val['unit']);
          if (match != -1) _intervalPresetIdx = match;
        } else if (val is num) {
          final match = _intervalPresets.indexWhere((p) => p['amount'] == val.toInt() && p['unit'] == 'minutes');
          if (match != -1) _intervalPresetIdx = match;
        }
      } else if (_scheduleType == 'daily' && val is Map) {
        _dailyHour = (val['hour'] as num?)?.toInt() ?? 9;
        _dailyMinute = (val['minute'] as num?)?.toInt() ?? 0;
      } else if (_scheduleType == 'weekly' && val is Map) {
        _weeklyDay = (val['dayOfWeek'] as num?)?.toInt() ?? 1;
        _weeklyHour = (val['hour'] as num?)?.toInt() ?? 9;
        _weeklyMinute = (val['minute'] as num?)?.toInt() ?? 0;
      } else if (_scheduleType == 'once' && val is String) {
        try { _onceDateTime = DateTime.parse(val); } catch (e) { debugPrint('[DateParse Error] $e'); }
      } else if (_scheduleType == 'cron') {
        _cronCtrl.text = val?.toString() ?? '0 9 * * 1';
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _promptCtrl.dispose();
    _cronCtrl.dispose();
    _workspaceCtrl.dispose();
    super.dispose();
  }

  dynamic _buildScheduleValue() {
    switch (_scheduleType) {
      case 'interval':
        final preset = _intervalPresets[_intervalPresetIdx];
        return {'amount': preset['amount'], 'unit': preset['unit']};
      case 'daily':
        return {'hour': _dailyHour, 'minute': _dailyMinute};
      case 'weekly':
        return {'dayOfWeek': _weeklyDay, 'hour': _weeklyHour, 'minute': _weeklyMinute};
      case 'once':
        return _onceDateTime.toUtc().toIso8601String();
      case 'cron':
        return _cronCtrl.text.trim().isEmpty ? '0 9 * * 1' : _cronCtrl.text.trim();
      default:
        return null;
    }
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    final prompt = _promptCtrl.text.trim();
    if (name.isEmpty || prompt.isEmpty) {
      AppToast.warning(context, 'Task name and prompt are required.');
      return;
    }
    setState(() => _saving = true);
    final payload = {
      'name': name,
      'prompt': prompt,
      'targetType': _targetType,
      'agent': _agentRole,
      'sandboxMode': _sandboxMode,
      'notifyOnComplete': _notifyOnComplete,
      'scheduleType': _scheduleType,
      'scheduleValue': _buildScheduleValue(),
      'enabled': _enabled,
      'workspacePath': _workspaceCtrl.text.trim().isNotEmpty ? _workspaceCtrl.text.trim() : widget.agentCoreService.workspacePath,
    };
    final existing = widget.existingTask;
    Map<String, dynamic>? result;
    if (existing != null) {
      result = await widget.agentCoreService.updateScheduledTask(existing['id'].toString(), payload);
    } else {
      result = await widget.agentCoreService.createScheduledTask(payload);
    }
    if (mounted) {
      setState(() => _saving = false);
      if (result != null) {
        Navigator.pop(context, result);
      } else {
        AppToast.error(context, 'Failed to save task. Please try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    return Container(
      height: mq.size.height * 0.90,
      margin: EdgeInsets.only(top: mq.viewInsets.top + 32),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF111117) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: widget.borderColor, width: 0.8)),
      ),
      child: Column(children: [
        // Drag handle
        Center(
          child: Container(
            margin: const EdgeInsets.only(top: 10),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: widget.borderColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(color: const Color(0xFF6366F1).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
              child: const Icon(LucideIcons.calendarClock, size: 14, color: Color(0xFF6366F1)),
            ),
            const SizedBox(width: 10),
            Text(
              widget.existingTask != null ? 'Edit Task' : 'New Scheduled Task',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: widget.textPrimary),
            ),
            const Spacer(),
            IconButton(
              onPressed: () => Navigator.pop(context),
              icon: Icon(LucideIcons.x, size: 18, color: widget.textSecondary),
            ),
          ]),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(16, 12, 16, mq.viewInsets.bottom + 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Target Execution Type
              _label('Execution Mode'),
              _buildTargetTypePicker(),
              const SizedBox(height: 14),

              // Task Name
              _label('Task Name'),
              _textField(_nameCtrl, 'e.g. Nightly security log audit', maxLines: 1),
              const SizedBox(height: 14),

              // Prompt / Command
              _label(_targetType == 'agent_prompt' ? 'Agent Prompt' : 'Shell Command'),
              _textField(
                _promptCtrl,
                _targetType == 'agent_prompt'
                    ? 'e.g. Audit security logs and summarize changes...'
                    : 'e.g. npm run test && git status',
                maxLines: 4,
              ),
              const SizedBox(height: 14),

              // AI Agent Role (If AI Agent Session)
              if (_targetType == 'agent_prompt') ...[
                _label('AI Agent Role'),
                _buildAgentPicker(),
                const SizedBox(height: 14),
              ],

              // Sandbox Mode
              _label('Sandbox Mode'),
              _buildSandboxModePicker(),
              const SizedBox(height: 14),

              // Schedule Type
              _label('Schedule Type'),
              _buildScheduleTypePicker(),
              const SizedBox(height: 14),

              // Schedule Config
              _label('Schedule Configuration'),
              _buildScheduleConfig(),
              const SizedBox(height: 14),

              // Push Alert Switch
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: widget.isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: widget.borderColor, width: 0.6),
                ),
                child: Row(children: [
                  Icon(LucideIcons.bell, size: 14, color: _notifyOnComplete ? const Color(0xFF10B981) : widget.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Send FCM Push Alert on Completion', style: TextStyle(color: widget.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600)),
                    Text('Delivers notification to registered mobile devices', style: TextStyle(color: widget.textSecondary, fontSize: 10.5)),
                  ])),
                  Switch(value: _notifyOnComplete, activeThumbColor: const Color(0xFF10B981), onChanged: (v) => setState(() => _notifyOnComplete = v)),
                ]),
              ),

              // Enabled toggle
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: widget.isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: widget.borderColor, width: 0.6),
                ),
                child: Row(children: [
                  Icon(LucideIcons.power, size: 14, color: _enabled ? const Color(0xFF10B981) : widget.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(child: Text('Enable task on save', style: TextStyle(color: widget.textPrimary, fontSize: 13, fontWeight: FontWeight.w600))),
                  Switch(value: _enabled, activeThumbColor: const Color(0xFF6366F1), onChanged: (v) => setState(() => _enabled = v)),
                ]),
              ),
              const SizedBox(height: 20),

              // Save button
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    disabledBackgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.5),
                  ),
                  child: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(widget.existingTask != null ? 'Save Changes' : 'Create Task', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ),
              ),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: widget.textSecondary, letterSpacing: 0.3)),
    );
  }

  Widget _textField(TextEditingController ctrl, String hint, {int maxLines = 1}) {
    return TextField(
      controller: ctrl,
      maxLines: maxLines,
      style: TextStyle(fontSize: 13, color: widget.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: widget.textSecondary.withValues(alpha: 0.6), fontSize: 12),
        filled: true,
        fillColor: widget.isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.borderColor, width: 0.6)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.borderColor, width: 0.6)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    );
  }

  Widget _buildTargetTypePicker() {
    return Row(
      children: _targetTypes.map((t) {
        final isSelected = _targetType == t['value'];
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _targetType = t['value'] as String),
            child: Container(
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF6366F1).withValues(alpha: 0.12) : Colors.transparent,
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: isSelected ? const Color(0xFF6366F1) : widget.borderColor, width: isSelected ? 1.2 : 0.6),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(t['icon'] as IconData, size: 14, color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary),
                const SizedBox(width: 6),
                Text(t['label'] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary)),
              ]),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAgentPicker() {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: _agents.map((a) {
        final isSelected = _agentRole == a['id'];
        final Color col = a['color'] as Color;
        return GestureDetector(
          onTap: () => setState(() => _agentRole = a['id'] as String),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isSelected ? col.withValues(alpha: 0.15) : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: isSelected ? col : widget.borderColor, width: isSelected ? 1.2 : 0.6),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(a['icon'] as IconData, size: 12, color: isSelected ? col : widget.textSecondary),
              const SizedBox(width: 5),
              Text(a['name'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isSelected ? col : widget.textSecondary)),
            ]),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSandboxModePicker() {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: _sandboxModes.map((m) {
        final isSelected = _sandboxMode == m['id'];
        final Color col = m['color'] as Color;
        return GestureDetector(
          onTap: () => setState(() => _sandboxMode = m['id'] as String),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isSelected ? col.withValues(alpha: 0.15) : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: isSelected ? col : widget.borderColor, width: isSelected ? 1.2 : 0.6),
            ),
            child: Text(m['name'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isSelected ? col : widget.textSecondary)),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildScheduleTypePicker() {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: _scheduleTypes.map((s) {
        final isSelected = _scheduleType == s['value'];
        return GestureDetector(
          onTap: () => setState(() => _scheduleType = s['value'] as String),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFF6366F1).withValues(alpha: 0.12) : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: isSelected ? const Color(0xFF6366F1) : widget.borderColor, width: isSelected ? 1.2 : 0.6),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(s['icon'] as IconData, size: 12, color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary),
              const SizedBox(width: 5),
              Text(s['label'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary)),
            ]),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildScheduleConfig() {
    switch (_scheduleType) {
      case 'interval':
        return Column(
          children: _intervalPresets.asMap().entries.map((e) {
            final isSelected = _intervalPresetIdx == e.key;
            return GestureDetector(
              onTap: () => setState(() => _intervalPresetIdx = e.key),
              child: Container(
                margin: const EdgeInsets.only(bottom: 4),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF6366F1).withValues(alpha: 0.08) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isSelected ? const Color(0xFF6366F1) : widget.borderColor, width: isSelected ? 1.0 : 0.5),
                ),
                child: Row(children: [
                  Icon(LucideIcons.repeat2, size: 12, color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary),
                  const SizedBox(width: 8),
                  Text(e.value['label'] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isSelected ? const Color(0xFF6366F1) : widget.textPrimary)),
                  const Spacer(),
                  if (isSelected) const Icon(LucideIcons.check, size: 12, color: Color(0xFF6366F1)),
                ]),
              ),
            );
          }).toList(),
        );

      case 'daily':
        return _buildTimePicker(
          hour: _dailyHour, minute: _dailyMinute,
          onHourChanged: (h) => setState(() => _dailyHour = h),
          onMinuteChanged: (m) => setState(() => _dailyMinute = m),
        );

      case 'weekly':
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _label('Day of Week'),
          Wrap(
            spacing: 4,
            children: _weekdays.asMap().entries.map((e) {
              final isSelected = _weeklyDay == e.key;
              return GestureDetector(
                onTap: () => setState(() => _weeklyDay = e.key),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFF6366F1).withValues(alpha: 0.12) : Colors.transparent,
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: isSelected ? const Color(0xFF6366F1) : widget.borderColor, width: isSelected ? 1.0 : 0.5),
                  ),
                  child: Text(e.value.substring(0, 3), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 10),
          _label('Time'),
          _buildTimePicker(
            hour: _weeklyHour, minute: _weeklyMinute,
            onHourChanged: (h) => setState(() => _weeklyHour = h),
            onMinuteChanged: (m) => setState(() => _weeklyMinute = m),
          ),
        ]);

      case 'once':
        return GestureDetector(
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: _onceDateTime,
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 365)),
            );
            if (date == null || !mounted) return;
            final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_onceDateTime));
            if (time == null || !mounted) return;
            setState(() => _onceDateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute));
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: widget.isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: widget.borderColor, width: 0.6),
            ),
            child: Row(children: [
              const Icon(LucideIcons.calendar, size: 14, color: Color(0xFF6366F1)),
              const SizedBox(width: 10),
              Text(
                '${_onceDateTime.year}-${_onceDateTime.month.toString().padLeft(2, '0')}-${_onceDateTime.day.toString().padLeft(2, '0')} '
                '${_onceDateTime.hour.toString().padLeft(2, '0')}:${_onceDateTime.minute.toString().padLeft(2, '0')}',
                style: TextStyle(color: widget.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Icon(LucideIcons.chevronRight, size: 14, color: widget.textSecondary),
            ]),
          ),
        );

      case 'cron':
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _textField(_cronCtrl, '0 9 * * 1  (every Monday at 9am)', maxLines: 1),
          const SizedBox(height: 6),
          Text(
            'Format: minute hour day-of-month month day-of-week\nExamples: "0 9 * * *" (daily 9am) · "*/30 * * * *" (every 30min) · "0 8 * * 1" (every Monday 8am)',
            style: TextStyle(fontSize: 10, color: widget.textSecondary.withValues(alpha: 0.7), height: 1.5),
          ),
        ]);

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildTimePicker({
    required int hour, required int minute,
    required ValueChanged<int> onHourChanged, required ValueChanged<int> onMinuteChanged,
  }) {
    return Row(children: [
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _label('Hour'),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: widget.isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: widget.borderColor, width: 0.6),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<int>(
                value: hour,
                dropdownColor: widget.cardBg,
                style: TextStyle(fontSize: 13, color: widget.textPrimary, fontWeight: FontWeight.w600),
                isExpanded: true,
                items: List.generate(24, (i) => DropdownMenuItem(value: i, child: Text(i.toString().padLeft(2, '0')))),
                onChanged: (v) { if (v != null) onHourChanged(v); },
              ),
            ),
          ),
        ]),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _label('Minute'),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: widget.isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: widget.borderColor, width: 0.6),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<int>(
                value: minute,
                dropdownColor: widget.cardBg,
                style: TextStyle(fontSize: 13, color: widget.textPrimary, fontWeight: FontWeight.w600),
                isExpanded: true,
                items: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => DropdownMenuItem(value: m, child: Text(m.toString().padLeft(2, '0')))).toList(),
                onChanged: (v) { if (v != null) onMinuteChanged(v); },
              ),
            ),
          ),
        ]),
      ),
    ]);
  }
}

// ─── Scheduler Settings Modal ──────────────────────────────────────────────────

class _SchedulerSettingsModal extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final Map<String, dynamic> currentSettings;
  final AvaAgentCoreService agentCoreService;

  const _SchedulerSettingsModal({
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.currentSettings,
    required this.agentCoreService,
  });

  @override
  State<_SchedulerSettingsModal> createState() => _SchedulerSettingsModalState();
}

class _SchedulerSettingsModalState extends State<_SchedulerSettingsModal> {
  bool _schedulerEnabled = true;
  int _checkIntervalSeconds = 30;
  bool _globalPushNotifications = true;
  String _defaultAgent = 'build';
  String _defaultSandboxMode = 'WORKSPACE_WRITE';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final s = widget.currentSettings;
    _schedulerEnabled = s['schedulerEnabled'] != false;
    _checkIntervalSeconds = (s['checkIntervalSeconds'] as num?)?.toInt() ?? 30;
    _globalPushNotifications = s['globalPushNotifications'] != false;
    _defaultAgent = s['defaultAgent']?.toString() ?? 'build';
    _defaultSandboxMode = s['defaultSandboxMode']?.toString() ?? 'WORKSPACE_WRITE';
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final payload = {
      'schedulerEnabled': _schedulerEnabled,
      'checkIntervalSeconds': _checkIntervalSeconds,
      'globalPushNotifications': _globalPushNotifications,
      'defaultAgent': _defaultAgent,
      'defaultSandboxMode': _defaultSandboxMode,
    };
    final ok = await widget.agentCoreService.updateSchedulerSettings(payload);
    if (mounted) {
      setState(() => _saving = false);
      if (ok) {
        AppToast.success(context, 'Scheduler settings saved.');
        Navigator.pop(context, payload);
      } else {
        AppToast.error(context, 'Failed to save settings.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF111117) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: widget.borderColor, width: 0.8)),
      ),
      child: SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(color: widget.borderColor, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 12),
          Row(children: [
            const Icon(LucideIcons.settings, size: 18, color: Color(0xFF6366F1)),
            const SizedBox(width: 8),
            Text('Background Scheduler Settings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: widget.textPrimary)),
            const Spacer(),
            IconButton(onPressed: () => Navigator.pop(context), icon: Icon(LucideIcons.x, size: 18, color: widget.textSecondary)),
          ]),
          const SizedBox(height: 12),

          // Master Scheduler Toggle
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('Enable Background Scheduler', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: widget.textPrimary)),
            subtitle: Text('Master switch for background session ticker execution', style: TextStyle(fontSize: 11, color: widget.textSecondary)),
            value: _schedulerEnabled,
            activeThumbColor: const Color(0xFF6366F1),
            onChanged: (v) => setState(() => _schedulerEnabled = v),
          ),
          const Divider(height: 16),

          // Global Push Switch
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('Global Push Notifications', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: widget.textPrimary)),
            subtitle: Text('Receive FCM push alert on mobile when scheduled turn finishes', style: TextStyle(fontSize: 11, color: widget.textSecondary)),
            value: _globalPushNotifications,
            activeThumbColor: const Color(0xFF10B981),
            onChanged: (v) => setState(() => _globalPushNotifications = v),
          ),
          const Divider(height: 16),

          // Ticker Interval
          Text('Ticker Check Frequency', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: widget.textSecondary)),
          const SizedBox(height: 6),
          Row(children: [15, 30, 60, 300].map((sec) {
            final isSelected = _checkIntervalSeconds == sec;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _checkIntervalSeconds = sec),
                child: Container(
                  margin: const EdgeInsets.only(right: 4),
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFF6366F1).withValues(alpha: 0.15) : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isSelected ? const Color(0xFF6366F1) : widget.borderColor, width: isSelected ? 1.2 : 0.6),
                  ),
                  child: Center(
                    child: Text(
                      sec >= 60 ? '${sec ~/ 60}m' : '${sec}s',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary),
                    ),
                  ),
                ),
              ),
            );
          }).toList()),
          const SizedBox(height: 20),

          // Save Button
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Settings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ),
        ]),
      ),
    );
  }
}
