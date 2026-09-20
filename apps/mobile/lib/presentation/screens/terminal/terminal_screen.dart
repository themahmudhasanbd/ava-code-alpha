import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';

/// Embedded command line execution output inspector
class TerminalScreen extends StatefulWidget {
  const TerminalScreen({super.key});

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final List<String> _logs = [
    'ava-rs daemon initialized on port 4096 (JSON-RPC v2.0)',
    'Loaded model provider: antigravity (daily-cloudcode-pa.googleapis.com)',
    'Active session: th_01_core [gemini-3.7-flash-tiered]',
    'Sandbox mode: workspaceWrite (/var/www/ava-code-alpha)',
    'Model context window: 1,048,576 tokens',
    'Ready for user turns...',
  ];

  final _cmdController = TextEditingController();

  void _runCommand() {
    final cmd = _cmdController.text.trim();
    if (cmd.isEmpty) return;

    setState(() {
      _logs.add('\$ $cmd');
      if (cmd.startsWith('git')) {
        _logs.add('On branch main. Your branch is up to date with \'origin/main\'.');
      } else if (cmd == 'cargo check') {
        _logs.add('   Finished dev target(s) in 0.82s');
      } else {
        _logs.add('Executed in local sandbox (exit 0)');
      }
      _cmdController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(LucideIcons.terminal, size: 18),
            const SizedBox(width: 8),
            Text('Agent Terminal', style: AppTypography.titleLarge),
            const Spacer(),
            const ShadcnBadge(label: 'Live', variant: ShadcnBadgeVariant.success, showDot: true),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: ListView.builder(
                itemCount: _logs.length,
                itemBuilder: (context, idx) {
                  final line = _logs[idx];
                  final isCmd = line.startsWith('\$');
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      line,
                      style: AppTypography.codeSmall.copyWith(
                        color: isCmd ? AppColors.accentCyan : AppColors.textSecondary,
                        fontSize: 11.5,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.borderStrong),
                      ),
                      child: TextField(
                        controller: _cmdController,
                        style: AppTypography.codeSmall.copyWith(color: AppColors.textPrimary),
                        cursorColor: AppColors.textPrimary,
                        decoration: InputDecoration(
                          hintText: 'Enter command (e.g. git status, cargo check)...',
                          hintStyle: AppTypography.codeSmall.copyWith(color: AppColors.textMuted),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onSubmitted: (_) => _runCommand(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(LucideIcons.play, size: 18, color: AppColors.textPrimary),
                    onPressed: _runCommand,
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
