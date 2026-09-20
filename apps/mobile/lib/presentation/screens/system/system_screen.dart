import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../state/app_state.dart';

/// Premier Host System Health and PM2 Service Monitor
class SystemScreen extends StatefulWidget {
  const SystemScreen({super.key});

  @override
  State<SystemScreen> createState() => _SystemScreenState();
}

class _SystemScreenState extends State<SystemScreen> {
  Map<String, dynamic>? _stats;
  bool _isLoading = true;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadStats();
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) => _loadStats(silent: true));
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadStats({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    final rpc = AppStateScope.of(context).rpcClient;

    try {
      final data = await rpc.getSystemStats();
      if (mounted) {
        setState(() {
          _stats = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _restartService(String processName) async {
    final isDark = AppColors.isDark(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF18181B) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: AppColors.line(context)),
        ),
        title: Text(
          'Restart Service',
          style: AppTypography.titleMedium.copyWith(color: AppColors.text(context)),
        ),
        content: Text(
          'Are you sure you want to restart "$processName"?',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.subtext(context)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.muted(context))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentPrimary,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Restart'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Restarting $processName...')),
      );

      final rpc = AppStateScope.of(context).rpcClient;
      final ok = await rpc.restartPm2Process(processName);

      if (!mounted) return;
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.accentSuccess,
            content: Text('Successfully restarted $processName'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.accentDanger,
            content: Text('Failed to restart service'),
          ),
        );
      }
      _loadStats(silent: true);
    }
  }

  String _formatUptime(int? seconds) {
    if (seconds == null) return 'N/A';
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    if (hours > 24) {
      final days = hours ~/ 24;
      final remHours = hours % 24;
      return '${days}d ${remHours}h ${minutes}m';
    }
    return '${hours}h ${minutes}m';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);
    final host = _stats?['host']?.toString() ?? 'ad.mahmudscanvas.site';
    final platform = _stats?['platform']?.toString() ?? 'linux';
    final arch = _stats?['arch']?.toString() ?? 'x64';
    final cpus = _stats?['cpus'] as int? ?? 6;
    final uptime = _stats?['uptime'] as int? ?? 0;
    final memory = _stats?['memory'] as Map<String, dynamic>? ?? {};
    final totalMb = memory['totalMb'] as int? ?? 7759;
    final usedMb = memory['usedMb'] as int? ?? 4711;
    final memUsagePct = (memory['usagePercentage'] as num?)?.toDouble() ?? 60.7;
    final processes = _stats?['processes'] as List<dynamic>? ?? [];

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      body: Column(
        children: [
          // Sub-header bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.card(context),
              border: Border(bottom: BorderSide(color: AppColors.line(context), width: 1)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.activity, size: 15, color: AppColors.accentSuccess),
                const SizedBox(width: 8),
                Text(
                  'Host & Service Monitor',
                  style: AppTypography.titleMedium.copyWith(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text(context),
                  ),
                ),
                const Spacer(),
                IconButton(
                  tooltip: 'Refresh Metrics',
                  icon: Icon(LucideIcons.refreshCw, size: 15, color: AppColors.subtext(context)),
                  onPressed: () => _loadStats(),
                ),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.accentPrimary),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(14),
                    children: [
                      // 1. VPS Overview Card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.card(context),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.line(context)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentPrimary.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(LucideIcons.server, size: 18, color: AppColors.accentPrimary),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        host,
                                        style: AppTypography.titleMedium.copyWith(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.text(context),
                                        ),
                                      ),
                                      Text(
                                        '$platform • $arch • $cpus vCPUs',
                                        style: AppTypography.codeSmall.copyWith(fontSize: 11, color: AppColors.muted(context)),
                                      ),
                                    ],
                                  ),
                                ),
                                const ShadcnBadge(label: 'Online', variant: ShadcnBadgeVariant.success, showDot: true),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Divider(color: AppColors.line(context), height: 1),
                            const SizedBox(height: 14),
                            // Metrics Grid
                            Row(
                              children: [
                                Expanded(
                                  child: _buildMetricTile(
                                    context: context,
                                    label: 'OS Uptime',
                                    value: _formatUptime(uptime),
                                    icon: LucideIcons.clock,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildMetricTile(
                                    context: context,
                                    label: 'RAM Used',
                                    value: '$usedMb / $totalMb MB',
                                    icon: LucideIcons.hardDrive,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            // Memory Progress Bar
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Memory Utilization',
                                      style: AppTypography.codeSmall.copyWith(fontSize: 11, color: AppColors.subtext(context)),
                                    ),
                                    Text(
                                      '$memUsagePct%',
                                      style: AppTypography.codeSmall.copyWith(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.accentPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                    value: memUsagePct / 100.0,
                                    backgroundColor: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      memUsagePct > 85 ? AppColors.accentDanger : AppColors.accentPrimary,
                                    ),
                                    minHeight: 6,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 18),

                      // 2. Active Services (PM2)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'MANAGED SERVICES (PM2)',
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.muted(context),
                              letterSpacing: 0.8,
                            ),
                          ),
                          Text(
                            '${processes.length} Active',
                            style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.subtext(context)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      ...processes.map((proc) {
                        final pName = proc['name']?.toString() ?? 'Service';
                        final pStatus = proc['status']?.toString() ?? 'unknown';
                        final pCpu = proc['cpu'] ?? 0;
                        final pMem = proc['memory'] ?? 0;
                        final pRestarts = proc['restarts'] ?? 0;
                        final isOnline = pStatus == 'online';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.card(context),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.line(context)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: isOnline ? AppColors.accentSuccess : AppColors.accentDanger,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      pName,
                                      style: AppTypography.titleMedium.copyWith(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.text(context),
                                      ),
                                    ),
                                    Text(
                                      'RAM: ${pMem}MB • CPU: $pCpu% • Restarts: $pRestarts',
                                      style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.muted(context)),
                                    ),
                                  ],
                                ),
                              ),
                              ShadcnBadge(
                                label: pStatus.toUpperCase(),
                                variant: isOnline ? ShadcnBadgeVariant.success : ShadcnBadgeVariant.danger,
                              ),
                              const SizedBox(width: 6),
                              IconButton(
                                tooltip: 'Restart Service',
                                icon: Icon(LucideIcons.rotateCw, size: 14, color: AppColors.subtext(context)),
                                onPressed: () => _restartService(pName),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required BuildContext context,
    required String label,
    required String value,
    required IconData icon,
  }) {
    final isDark = AppColors.isDark(context);
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.line(context)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.subtext(context)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.muted(context))),
                Text(
                  value,
                  style: AppTypography.codeSmall.copyWith(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
