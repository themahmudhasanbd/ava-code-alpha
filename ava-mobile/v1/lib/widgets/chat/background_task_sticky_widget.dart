import "dart:async";
import "dart:ui";
import "package:flutter/material.dart";
import "package:lucide_icons_flutter/lucide_icons.dart";

/// Model representing an active or recent background task in the chat interface.
class BackgroundTaskItem {
  final String id;
  final String command;
  final String tool;
  final DateTime startTime;
  final String status; // 'running', 'completed', 'failed'
  final String? output;
  final int? exitCode;
  final String? logPath;

  const BackgroundTaskItem({
    required this.id,
    required this.command,
    required this.tool,
    required this.startTime,
    required this.status,
    this.output,
    this.exitCode,
    this.logPath,
  });

  bool get isRunning => status == "running";
  bool get isCompleted => status == "completed";
  bool get isFailed => status == "failed";

  int get elapsedSeconds => DateTime.now().difference(startTime).inSeconds;

  BackgroundTaskItem copyWith({
    String? status,
    String? output,
    int? exitCode,
    String? logPath,
  }) {
    return BackgroundTaskItem(
      id: id,
      command: command,
      tool: tool,
      startTime: startTime,
      status: status ?? this.status,
      output: output ?? this.output,
      exitCode: exitCode ?? this.exitCode,
      logPath: logPath ?? this.logPath,
    );
  }
}

/// Dock widget floating immediately above the prompt composer displaying active background tasks
/// matching the exact visual presentation of the reference UI.
class BackgroundTaskStickyWidget extends StatefulWidget {
  final List<BackgroundTaskItem> tasks;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final void Function(String taskId)? onCancel;
  final void Function(String taskId)? onDismiss;
  final void Function(String taskId)? onOpenLog;

  const BackgroundTaskStickyWidget({
    super.key,
    required this.tasks,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.onCancel,
    this.onDismiss,
    this.onOpenLog,
  });

  @override
  State<BackgroundTaskStickyWidget> createState() => _BackgroundTaskStickyWidgetState();
}

class _BackgroundTaskStickyWidgetState extends State<BackgroundTaskStickyWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _spinController;
  Timer? _tickerTimer;
  bool _isDismissed = false;
  int _lastTaskCount = 0;

  static const List<Color> _chipPalette = [
    Color(0xFF10B981), // Emerald / Green
    Color(0xFF0EA5E9), // Sky / Blue
    Color(0xFFA855F7), // Purple / Violet
    Color(0xFFF59E0B), // Amber / Orange
    Color(0xFFEC4899), // Pink / Rose
    Color(0xFF06B6D4), // Cyan
  ];

  @override
  void initState() {
    super.initState();
    _lastTaskCount = widget.tasks.length;
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();

    _tickerTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && widget.tasks.any((t) => t.isRunning)) {
        setState(() {});
      }
    });
  }

  @override
  void didUpdateWidget(covariant BackgroundTaskStickyWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.tasks.length > _lastTaskCount) {
      _isDismissed = false;
      _lastTaskCount = widget.tasks.length;
    }
  }

  @override
  void dispose() {
    _spinController.dispose();
    _tickerTimer?.cancel();
    super.dispose();
  }

  IconData _iconForTask(BackgroundTaskItem task) {
    final t = "${task.tool} ${task.command}".toLowerCase();
    if (t.contains("cloud") || t.contains("zone") || t.contains("dns") || t.contains("domain") || t.contains("network")) {
      return LucideIcons.cloud;
    }
    if (t.contains("scan") || t.contains("file") || t.contains("db") || t.contains("database") || t.contains("sql") || t.contains("table")) {
      return LucideIcons.database;
    }
    if (t.contains("analyze") || t.contains("log") || t.contains("sparkle") || t.contains("ai") || t.contains("model")) {
      return LucideIcons.sparkles;
    }
    if (t.contains("bash") || t.contains("shell") || t.contains("cmd") || t.contains("terminal") || t.contains("exec") || t.contains("run")) {
      return LucideIcons.terminal;
    }
    if (t.contains("build") || t.contains("compile") || t.contains("node") || t.contains("bun") || t.contains("cargo")) {
      return LucideIcons.cpu;
    }
    if (t.contains("search") || t.contains("grep") || t.contains("find")) {
      return LucideIcons.search;
    }
    return LucideIcons.bot;
  }

  String _cleanTaskTitle(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return "Background Task";
    // Strip redundant leading words or bash boilerplate if any
    var title = trimmed;
    if (title.startsWith("manage_task")) title = "Task Manager";
    if (title.startsWith("schedule")) title = "Scheduled Job";
    return title;
  }

  void _showTaskManagementSheet(BuildContext context, List<BackgroundTaskItem> tasks) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _TaskManagementSheet(
        tasks: tasks,
        isDark: widget.isDark,
        onCancel: (id) {
          widget.onCancel?.call(id);
          Navigator.of(ctx).pop();
        },
        onOpenLog: widget.onOpenLog,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isDismissed) {
      return const SizedBox.shrink();
    }

    final activeTasks = widget.tasks.where((t) => t.isRunning).toList();
    if (activeTasks.isEmpty) {
      return const SizedBox.shrink();
    }

    final isDark = widget.isDark;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 4, 12, 6),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isDark
                  ? const Color(0xFF16161E).withValues(alpha: 0.92)
                  : const Color(0xFFF8FAFC).withValues(alpha: 0.94),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark
                    ? const Color(0xFF2E2E3E).withValues(alpha: 0.85)
                    : const Color(0xFFE2E8F0),
                width: 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.06),
                  blurRadius: 12,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                // ── Left Action Section: Layers Icon (Task Manager Sheet Trigger) ───────
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _showTaskManagementSheet(context, widget.tasks),
                    borderRadius: BorderRadius.circular(7),
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.20 : 0.12),
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: const Icon(
                        LucideIcons.layers,
                        size: 13,
                        color: Color(0xFF818CF8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),

                // ── Middle Horizontal Scrollable Task Chips ──────────────────
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: activeTasks.asMap().entries.map((entry) {
                        final index = entry.key;
                        final task = entry.value;
                        final color = _chipPalette[index % _chipPalette.length];
                        final icon = _iconForTask(task);
                        final title = _cleanTaskTitle(task.command);

                        return Container(
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.only(left: 7, right: 4, top: 3.5, bottom: 3.5),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: isDark ? 0.12 : 0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: color.withValues(alpha: isDark ? 0.38 : 0.28),
                              width: 0.85,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Colored Dot
                              Container(
                                width: 5.5,
                                height: 5.5,
                                decoration: BoxDecoration(
                                  color: color,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: color.withValues(alpha: 0.6),
                                      blurRadius: 4,
                                      spreadRadius: 0.5,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 5),

                              // Contextual Tool/Task Icon
                              Icon(icon, size: 11.5, color: color),
                              const SizedBox(width: 5),

                              // Task Title
                              ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 130),
                                child: Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: "Inter",
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: widget.textPrimary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 3),

                              // Kill / Dismiss "x" Button
                              Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () => widget.onCancel?.call(task.id),
                                  borderRadius: BorderRadius.circular(10),
                                  child: Padding(
                                    padding: const EdgeInsets.all(2.5),
                                    child: Icon(
                                      LucideIcons.x,
                                      size: 10.5,
                                      color: isDark
                                          ? const Color(0xFF94A3B8)
                                          : const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),

                // ── Vertical Divider ─────────────────────────────────────────
                Container(
                  width: 1,
                  height: 16,
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  color: isDark
                      ? const Color(0xFF2E2E3E)
                      : const Color(0xFFE2E8F0),
                ),

                // ── Right Status Indicator Pill with Rotating Dashed Spinner ─
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _showTaskManagementSheet(context, widget.tasks),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF1E1E2A)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark
                              ? const Color(0xFF38384E)
                              : const Color(0xFFCBD5E1),
                          width: 0.9,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Rotating Spinner Loader
                          RotationTransition(
                            turns: _spinController,
                            child: const Icon(
                              LucideIcons.loader2,
                              size: 12,
                              color: Color(0xFF818CF8),
                            ),
                          ),
                          const SizedBox(width: 4.5),

                          // Text count
                          Text(
                            "${activeTasks.length} running",
                            style: TextStyle(
                              fontFamily: "Inter",
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white : const Color(0xFF1E293B),
                            ),
                          ),
                          const SizedBox(width: 3),

                          // Chevron Down
                          Icon(
                            LucideIcons.chevronDown,
                            size: 11,
                            color: isDark
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF64748B),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Bottom Sheet displaying all active and recorded background tasks with log inspection and kill actions.
class _TaskManagementSheet extends StatelessWidget {
  final List<BackgroundTaskItem> tasks;
  final bool isDark;
  final void Function(String taskId)? onCancel;
  final void Function(String taskId)? onOpenLog;

  const _TaskManagementSheet({
    required this.tasks,
    required this.isDark,
    this.onCancel,
    this.onOpenLog,
  });

  String _formatElapsed(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, "0");
    final secs = (seconds % 60).toString().padLeft(2, "0");
    return "$mins:$secs";
  }

  @override
  Widget build(BuildContext context) {
    final runningTasks = tasks.where((t) => t.isRunning).toList();
    final finishedTasks = tasks.where((t) => !t.isRunning).toList();

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF181822) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(
          color: isDark ? const Color(0xFF2E2E3E) : const Color(0xFFE2E8F0),
          width: 1.0,
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle Bar
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(top: 10, bottom: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF3E3E4E) : const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.layers, size: 16, color: Color(0xFF818CF8)),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    "Background Tasks Manager",
                    style: TextStyle(
                      fontFamily: "Inter",
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      "${runningTasks.length} active",
                      style: const TextStyle(
                        fontFamily: "Inter",
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF818CF8),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 20),

            // Task List
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                children: [
                  if (runningTasks.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        "RUNNING PROCESSES",
                        style: TextStyle(
                          fontSize: 10.5,
                          fontFamily: "JetBrainsMono",
                          fontWeight: FontWeight.w700,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    ...runningTasks.map((t) => _buildTaskCard(context, t, true)),
                  ],
                  if (finishedTasks.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.only(top: 12, bottom: 8),
                      child: Text(
                        "RECENTLY COMPLETED",
                        style: TextStyle(
                          fontSize: 10.5,
                          fontFamily: "JetBrainsMono",
                          fontWeight: FontWeight.w700,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    ...finishedTasks.map((t) => _buildTaskCard(context, t, false)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskCard(BuildContext context, BackgroundTaskItem task, bool isRunning) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E2A) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRunning
              ? const Color(0xFF6366F1).withValues(alpha: 0.4)
              : (isDark ? const Color(0xFF2E2E3E) : const Color(0xFFE2E8F0)),
          width: 0.9,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: isRunning
                      ? const Color(0xFF10B981).withValues(alpha: 0.15)
                      : (task.isFailed
                          ? const Color(0xFFEF4444).withValues(alpha: 0.15)
                          : const Color(0xFF6366F1).withValues(alpha: 0.15)),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(
                  isRunning
                      ? LucideIcons.terminal
                      : (task.isFailed ? LucideIcons.xCircle : LucideIcons.checkCircle2),
                  size: 13,
                  color: isRunning
                      ? const Color(0xFF10B981)
                      : (task.isFailed ? const Color(0xFFEF4444) : const Color(0xFF6366F1)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  task.command.isNotEmpty ? task.command : "Task: ${task.tool}",
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: "JetBrainsMono",
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ),
              if (isRunning)
                Container(
                  margin: const EdgeInsets.only(left: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _formatElapsed(task.elapsedSeconds),
                    style: const TextStyle(
                      fontFamily: "JetBrainsMono",
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF10B981),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                "ID: ${task.id}",
                style: TextStyle(
                  fontFamily: "JetBrainsMono",
                  fontSize: 10,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
              const Spacer(),
              if (isRunning && onCancel != null)
                TextButton.icon(
                  onPressed: () => onCancel?.call(task.id),
                  icon: const Icon(LucideIcons.square, size: 11, color: Color(0xFFEF4444)),
                  label: const Text(
                    "Kill Process",
                    style: TextStyle(
                      fontSize: 11,
                      fontFamily: "Inter",
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFEF4444),
                    ),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
            ],
          ),
          if (task.output != null && task.output!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF12121A) : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                task.output!,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: "JetBrainsMono",
                  fontSize: 10,
                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
