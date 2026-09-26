import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/agent_core_service.dart';
import '../utils/app_toast.dart';

class SystemScreen extends StatefulWidget {
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaAgentCoreService agentCoreService;

  const SystemScreen({
    super.key,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.agentCoreService,
  });

  @override
  State<SystemScreen> createState() => _SystemScreenState();
}

class _SystemScreenState extends State<SystemScreen> {
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRealStats();
  }

  Future<void> _loadRealStats() async {
    setState(() => _isLoading = true);
    final data = await widget.agentCoreService.fetchSystemStats();
    if (mounted) {
      setState(() {
        _stats = data;
        _isLoading = false;
      });
    }
  }

  String _formatUptime(dynamic seconds) {
    if (seconds == null) return 'N/A';
    final sec = (seconds is num) ? seconds.toInt() : int.tryParse(seconds.toString()) ?? 0;
    final hours = sec ~/ 3600;
    final minutes = (sec % 3600) ~/ 60;
    if (hours > 24) {
      final days = hours ~/ 24;
      final remHours = hours % 24;
      return '${days}d ${remHours}h ${minutes}m';
    }
    return '${hours}h ${minutes}m';
  }

  Future<void> _confirmRestartProcess(String pName, dynamic pId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Text('Restart Service', style: TextStyle(color: widget.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
        content: Text('Are you sure you want to restart service "$pName" (ID: $pId)?', style: TextStyle(color: widget.textSecondary, fontSize: 13)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Restart'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (!mounted) return;
      AppToast.info(context, 'Restarting $pName...');
      final ok = await widget.agentCoreService.restartPm2Process(pName);
      if (!mounted) return;
      if (ok) {
        AppToast.success(context, 'Successfully restarted $pName');
      } else {
        AppToast.error(context, 'Failed to restart $pName');
      }
      _loadRealStats();
    }
  }

  void _showLogsViewer(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: widget.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _SystemLogsViewerModal(
        agentCoreService: widget.agentCoreService,
        cardBg: widget.cardBg,
        borderColor: widget.borderColor,
        textPrimary: widget.textPrimary,
        textSecondary: widget.textSecondary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)));
    }

    final stats = _stats ?? {};
    final isOnline = stats['status'] == 'Online';
    final totalModels = stats['totalModels'] ?? 0;
    final totalProviders = stats['totalProviders'] ?? 0;
    final activeSessions = stats['activeSessions'] ?? 0;
    final activeMcps = stats['activeMcpsCount'] ?? 0;

    // CPU Metrics
    final cpus = stats['cpus'] ?? 6;
    final loadAvg = stats['loadAverage'] as List? ?? [0.0, 0.0, 0.0];
    final load1m = loadAvg.isNotEmpty ? (loadAvg[0] as num).toDouble() : 0.0;
    final load5m = loadAvg.length > 1 ? (loadAvg[1] as num).toDouble() : 0.0;
    final load15m = loadAvg.length > 2 ? (loadAvg[2] as num).toDouble() : 0.0;

    // Memory (RAM) Metrics
    final mem = stats['memory'] as Map? ?? {};
    final totalMemMb = double.tryParse(mem['totalMb']?.toString() ?? '0') ?? 0;
    final usedMemMb = double.tryParse(mem['usedMb']?.toString() ?? '0') ?? 0;
    final freeMemMb = double.tryParse(mem['freeMb']?.toString() ?? '0') ?? 0;
    final memPercentage = double.tryParse(mem['usedPercentage']?.toString() ?? '0') ?? 0;

    // Disk (ROM) Metrics
    final disk = stats['disk'] as Map? ?? {};
    final totalDiskGb = double.tryParse(disk['totalGb']?.toString() ?? '0') ?? 0;
    final usedDiskGb = double.tryParse(disk['usedGb']?.toString() ?? '0') ?? 0;
    final freeDiskGb = double.tryParse(disk['freeGb']?.toString() ?? '0') ?? 0;
    final diskPercentage = double.tryParse(disk['usedPercentage']?.toString() ?? '0') ?? 0;

    // PM2 Processes
    final pm2List = stats['pm2'] as List? ?? [];
    final uptimeStr = _formatUptime(stats['uptimeSeconds']);
    final hostname = stats['hostname'] ?? 'VPS Host';

    return RefreshIndicator(
      onRefresh: _loadRealStats,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Screen Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'System Health',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: widget.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Host: $hostname • Uptime: $uptimeStr',
                        style: TextStyle(fontSize: 11, color: widget.textSecondary),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(LucideIcons.fileText, size: 18, color: widget.textSecondary),
                  onPressed: () => _showLogsViewer(context),
                  tooltip: 'View Engine Logs',
                ),
                IconButton(
                  icon: Icon(LucideIcons.refreshCw, size: 18, color: widget.textSecondary),
                  onPressed: _loadRealStats,
                  tooltip: 'Refresh Metrics',
                ),
              ],
            ),
            const SizedBox(height: 14),

            // ─── 1. CPU Load Metric Card ──────────────────────────────────────
            _buildResourceCard(
              title: 'CPU LOAD & CORES',
              headline: '$cpus VCPU Cores',
              subline: 'Load Average: ${load1m.toStringAsFixed(2)} (1m) • ${load5m.toStringAsFixed(2)} (5m) • ${load15m.toStringAsFixed(2)} (15m)',
              percentage: (load1m / (cpus > 0 ? cpus : 1)).clamp(0.0, 1.0) * 100,
              icon: LucideIcons.cpu,
              accentColor: const Color(0xFF6366F1),
              detailText: '${((load1m / (cpus > 0 ? cpus : 1)) * 100).toStringAsFixed(1)}% capacity load',
            ),
            const SizedBox(height: 10),

            // ─── 2. RAM Memory Condition Card ─────────────────────────────────
            _buildResourceCard(
              title: 'RAM MEMORY CONDITION',
              headline: '${(usedMemMb / 1024).toStringAsFixed(2)} GB / ${(totalMemMb / 1024).toStringAsFixed(2)} GB',
              subline: 'Free Available: ${(freeMemMb / 1024).toStringAsFixed(2)} GB (${(100 - memPercentage).toStringAsFixed(1)}%)',
              percentage: memPercentage,
              icon: LucideIcons.memoryStick,
              accentColor: const Color(0xFF06B6D4),
              detailText: '${memPercentage.toStringAsFixed(1)}% used',
            ),
            const SizedBox(height: 10),

            // ─── 3. ROM / Disk Condition Card ─────────────────────────────────
            _buildResourceCard(
              title: 'ROM / DISK STORAGE CONDITION',
              headline: '${usedDiskGb.toStringAsFixed(1)} GB / ${totalDiskGb.toStringAsFixed(1)} GB',
              subline: 'Free Disk Space: ${freeDiskGb.toStringAsFixed(1)} GB remaining',
              percentage: diskPercentage,
              icon: LucideIcons.hardDrive,
              accentColor: const Color(0xFF10B981),
              detailText: '${diskPercentage.toStringAsFixed(1)}% full',
            ),
            const SizedBox(height: 14),

            // ─── 4. Quick Overview Metrics ─────────────────────────────────────
            Text(
              'PLATFORM & SERVICES',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: widget.textSecondary, letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildMiniStat(
                    'AvA Engine',
                    isOnline ? 'Online' : 'Offline',
                    LucideIcons.server,
                    isOnline ? const Color(0xFF10B981) : Colors.redAccent,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildMiniStat(
                    'AI Models',
                    '$totalModels ($totalProviders prov)',
                    LucideIcons.layers,
                    const Color(0xFF8B5CF6),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildMiniStat(
                    'Sessions',
                    '$activeSessions active',
                    LucideIcons.history,
                    const Color(0xFF4F46E5),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildMiniStat(
                    'MCP Servers',
                    '$activeMcps active',
                    LucideIcons.plug,
                    const Color(0xFFF59E0B),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ─── 5. PM2 Managed Processes List ────────────────────────────────
            if (pm2List.isNotEmpty) ...[
              Text(
                'HOST PM2 SERVICES (${pm2List.length})',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: widget.textSecondary, letterSpacing: 0.5),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: widget.cardBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: widget.borderColor),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: pm2List.length,
                  separatorBuilder: (ctx, i) => Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.5)),
                  itemBuilder: (ctx, i) {
                    final item = pm2List[i];
                    final pName = item['name'] ?? 'service';
                    final pStatus = item['status'] ?? 'unknown';
                    final pCpu = item['cpu'] ?? 0;
                    final pMem = item['memoryMb'] ?? '0';
                    final isLive = pStatus == 'online';

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isLive ? const Color(0xFF10B981) : Colors.redAccent,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  pName,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: widget.textPrimary,
                                  ),
                                ),
                                Text(
                                  'Status: $pStatus • ID: ${item['id'] ?? i}',
                                  style: TextStyle(fontSize: 11, color: widget.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '${pMem}MB RAM',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: widget.textPrimary,
                                ),
                              ),
                              Text(
                                'CPU: $pCpu%',
                                style: TextStyle(fontSize: 10, color: widget.textSecondary),
                              ),
                            ],
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(LucideIcons.rotateCcw, size: 15),
                            color: const Color(0xFF6366F1),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                            tooltip: 'Restart $pName',
                            onPressed: () => _confirmRestartProcess(pName, item['id'] ?? i),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildResourceCard({
    required String title,
    required String headline,
    required String subline,
    required double percentage,
    required IconData icon,
    required Color accentColor,
    required String detailText,
  }) {
    final clampedPct = percentage.clamp(0.0, 100.0);
    final progressValue = clampedPct / 100.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: widget.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: accentColor, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: widget.textSecondary, letterSpacing: 0.5),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  detailText,
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: accentColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            headline,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: widget.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            subline,
            style: TextStyle(fontSize: 11, color: widget.textSecondary),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progressValue,
              minHeight: 7,
              backgroundColor: widget.borderColor.withValues(alpha: 0.4),
              valueColor: AlwaysStoppedAnimation<Color>(
                percentage > 85 ? Colors.redAccent : accentColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: widget.borderColor),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: widget.textSecondary)),
                const SizedBox(height: 2),
                Text(
                  value,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: widget.textPrimary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SystemLogsViewerModal extends StatefulWidget {
  final AvaAgentCoreService agentCoreService;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;

  const _SystemLogsViewerModal({
    required this.agentCoreService,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
  });

  @override
  State<_SystemLogsViewerModal> createState() => _SystemLogsViewerModalState();
}

class _SystemLogsViewerModalState extends State<_SystemLogsViewerModal> {
  String _logs = '';
  bool _isLoading = true;
  int _lines = 100;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchLogs() async {
    setState(() => _isLoading = true);
    final result = await widget.agentCoreService.fetchSystemLogs(lines: _lines);
    if (mounted) {
      setState(() {
        _logs = result ?? 'No logs returned from server or connection error.';
        _isLoading = false;
      });
      // Scroll to bottom after render to see latest output
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  void _copyLogs() {
    Clipboard.setData(ClipboardData(text: _logs));
    AppToast.copied(context, 'Logs copied to clipboard');
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final modalHeight = mediaQuery.size.height * 0.85;

    return SizedBox(
      height: modalHeight,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
        child: Column(
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: widget.borderColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header
            Row(
              children: [
                Icon(LucideIcons.terminal, size: 20, color: const Color(0xFF6366F1)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Engine & PM2 Logs',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: widget.textPrimary,
                    ),
                  ),
                ),
                // Lines count selector
                PopupMenuButton<int>(
                  initialValue: _lines,
                  tooltip: 'Lines count',
                  onSelected: (val) {
                    if (_lines != val) {
                      setState(() => _lines = val);
                      _fetchLogs();
                    }
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(value: 50, child: Text('50 lines')),
                    const PopupMenuItem(value: 100, child: Text('100 lines')),
                    const PopupMenuItem(value: 250, child: Text('250 lines')),
                  ],
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(color: widget.borderColor),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '$_lines L',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: widget.textSecondary),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  icon: const Icon(LucideIcons.copy, size: 18),
                  color: widget.textSecondary,
                  tooltip: 'Copy all logs',
                  onPressed: _logs.isNotEmpty ? _copyLogs : null,
                ),
                IconButton(
                  icon: const Icon(LucideIcons.refreshCw, size: 18),
                  color: widget.textSecondary,
                  tooltip: 'Refresh logs',
                  onPressed: _fetchLogs,
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 18),
                  color: widget.textSecondary,
                  tooltip: 'Close',
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Log Content Box
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(color: Color(0xFF6366F1)),
                      )
                    : Scrollbar(
                        controller: _scrollController,
                        thumbVisibility: true,
                        child: SingleChildScrollView(
                          controller: _scrollController,
                          child: SelectableText(
                            _logs,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 11.5,
                              color: Color(0xFFE2E8F0),
                              height: 1.4,
                            ),
                          ),
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

