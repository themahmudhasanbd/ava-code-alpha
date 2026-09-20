import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../components/shadcn_button.dart';
import '../../components/shadcn_card.dart';
import '../../components/shadcn_input.dart';
import '../../state/app_state.dart';

/// Settings, server endpoint config, and user session management
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _serverController = TextEditingController(text: AppConstants.defaultHost);

  @override
  void dispose() {
    _serverController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scope = AppStateScope.of(context);
    final auth = scope.authController;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Settings', style: AppTypography.titleLarge),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Authenticated User Profile Card
          ShadcnCard(
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(LucideIcons.userCheck, size: 22, color: AppColors.accentSuccess),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(auth.session?.username ?? AppConstants.authUsername, style: AppTypography.titleMedium),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const ShadcnBadge(label: 'Developer Tier', variant: ShadcnBadgeVariant.success),
                          const SizedBox(width: 6),
                          Text('AvA Core Admin', style: AppTypography.bodySmall),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Server Endpoint Settings
          Text('CORE ENGINE & APP-SERVER', style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted)),
          const SizedBox(height: 10),

          ShadcnCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('JSON-RPC 2.0 Host', style: AppTypography.titleMedium),
                const SizedBox(height: 4),
                Text(
                  'Address of the running ava-rs app-server daemon.',
                  style: AppTypography.bodySmall,
                ),
                const SizedBox(height: 12),
                ShadcnInput(
                  controller: _serverController,
                  hintText: 'http://localhost:4096',
                  prefixIcon: LucideIcons.server,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(LucideIcons.shieldCheck, size: 14, color: AppColors.accentSuccess),
                    const SizedBox(width: 6),
                    Text('Auto-compaction limit: 900,000 tokens', style: AppTypography.codeSmall),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Sign Out Button
          ShadcnButton(
            text: 'Sign Out of AvA Core',
            icon: LucideIcons.logOut,
            variant: ShadcnButtonVariant.destructive,
            isFullWidth: true,
            onPressed: () => auth.logout(),
          ),
          const SizedBox(height: 16),

          Center(
            child: Text(
              '${AppConstants.appName} ${AppConstants.appVersion}',
              style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted),
            ),
          ),
        ],
      ),
    );
  }
}
