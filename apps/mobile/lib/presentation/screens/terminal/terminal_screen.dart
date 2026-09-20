import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../state/app_state.dart';

/// Real-time interactive bash terminal shell connected directly to VPS
class TerminalScreen extends StatefulWidget {
  const TerminalScreen({super.key});

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final List<Map<String, dynamic>> _logs = [
    {
      'type': 'system',
      'text': '🚀 AvA Code Alpha Live Shell Connected (PID 4096)\nWorking directory: /var/www/ava-code-alpha\nType a command or tap quick actions below.',
    },
  ];

  final _cmdController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isExecuting = false;
  final String _cwd = '/var/www/ava-code-alpha';

  final List<String> _quickCommands = [
    'git status',
    'git diff',
    'pm2 list',
    'cargo check',
    'ls -la',
    'bun run build',
  ];

  @override
  void dispose() {
    _cmdController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _runCommand([String? explicitCmd]) async {
    final cmd = (explicitCmd ?? _cmdController.text).trim();
    if (cmd.isEmpty || _isExecuting) return;

    setState(() {
      _logs.add({'type': 'input', 'text': '\$ $cmd'});
      _isExecuting = true;
    });
    _cmdController.clear();
    _scrollToBottom();

    final rpc = AppStateScope.of(context).rpcClient;

    try {
      final res = await rpc.executeTerminal(cmd, cwd: _cwd);
      if (mounted) {
        setState(() {
          _isExecuting = false;
          if (res != null) {
            final stdout = res['stdout']?.toString() ?? '';
            final stderr = res['stderr']?.toString() ?? '';
            final exitCode = res['exitCode'] as int? ?? 0;

            if (stdout.isNotEmpty) {
              _logs.add({'type': 'stdout', 'text': stdout});
            }
            if (stderr.isNotEmpty) {
              _logs.add({'type': 'stderr', 'text': stderr});
            }
            if (stdout.isEmpty && stderr.isEmpty) {
              _logs.add({'type': 'system', 'text': 'Command completed (exit $exitCode)'});
            }
          } else {
            _logs.add({'type': 'stderr', 'text': 'Error: Failed to communicate with terminal daemon'});
          }
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isExecuting = false;
          _logs.add({'type': 'stderr', 'text': 'Terminal execution error: $e'});
        });
        _scrollToBottom();
      }
    }
  }

  void _clearLogs() {
    setState(() {
      _logs.clear();
      _logs.add({'type': 'system', 'text': 'Terminal output cleared.'});
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);

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
                const Icon(LucideIcons.terminal, size: 15, color: AppColors.accentCyan),
                const SizedBox(width: 8),
                Text(
                  'Host Terminal Shell',
                  style: AppTypography.titleMedium.copyWith(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text(context),
                  ),
                ),
                const SizedBox(width: 8),
                const ShadcnBadge(label: 'Live Bash', variant: ShadcnBadgeVariant.success, showDot: true),
                const Spacer(),
                IconButton(
                  tooltip: 'Clear Output',
                  icon: Icon(LucideIcons.trash2, size: 15, color: AppColors.subtext(context)),
                  onPressed: _clearLogs,
                ),
              ],
            ),
          ),

          // Working Directory Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            color: AppColors.cardElevated(context),
            child: Row(
              children: [
                Icon(LucideIcons.folder, size: 12, color: AppColors.muted(context)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'CWD: $_cwd',
                    style: AppTypography.codeSmall.copyWith(fontSize: 10.5, color: AppColors.subtext(context)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

          // Terminal Output Canvas
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0C0C0F),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line(context)),
              ),
              child: ListView.builder(
                controller: _scrollController,
                itemCount: _logs.length,
                itemBuilder: (context, idx) {
                  final item = _logs[idx];
                  final type = item['type'];
                  final text = item['text']?.toString() ?? '';

                  Color textColor;
                  FontWeight weight = FontWeight.w400;

                  switch (type) {
                    case 'input':
                      textColor = AppColors.accentCyan;
                      weight = FontWeight.w600;
                      break;
                    case 'stderr':
                      textColor = AppColors.accentDanger;
                      break;
                    case 'system':
                      textColor = AppColors.accentPrimary;
                      break;
                    default:
                      textColor = const Color(0xFFE4E4E7);
                  }

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: SelectableText(
                      text,
                      style: AppTypography.codeSmall.copyWith(
                        color: textColor,
                        fontSize: 11.5,
                        fontWeight: weight,
                        height: 1.4,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // Quick Commands Toolbar
          Container(
            height: 36,
            margin: const EdgeInsets.symmetric(horizontal: 12),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _quickCommands.length,
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemBuilder: (context, i) {
                final cmd = _quickCommands[i];
                return ActionChip(
                  labelPadding: const EdgeInsets.symmetric(horizontal: 6),
                  backgroundColor: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                  side: BorderSide(color: AppColors.line(context), width: 0.8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  label: Text(
                    cmd,
                    style: AppTypography.codeSmall.copyWith(fontSize: 11, color: AppColors.text(context)),
                  ),
                  onPressed: _isExecuting ? null : () => _runCommand(cmd),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Interactive Command Input Box
          Container(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.lineStrong(context)),
                      ),
                      child: Row(
                        children: [
                          Text(
                            '\$ ',
                            style: AppTypography.codeSmall.copyWith(
                              color: AppColors.accentCyan,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                          Expanded(
                            child: TextField(
                              controller: _cmdController,
                              style: AppTypography.codeSmall.copyWith(color: AppColors.text(context)),
                              cursorColor: AppColors.accentCyan,
                              decoration: InputDecoration(
                                hintText: 'Enter command (e.g. git status, pm2 list)...',
                                hintStyle: AppTypography.codeSmall.copyWith(color: AppColors.muted(context)),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              onSubmitted: (_) => _runCommand(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentPrimary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.all(12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _isExecuting ? null : () => _runCommand(),
                    child: _isExecuting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(LucideIcons.play, size: 16),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
