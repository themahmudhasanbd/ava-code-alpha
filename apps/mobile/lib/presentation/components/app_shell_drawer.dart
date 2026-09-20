import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../state/app_state.dart';

/// Premier Glassmorphic Sliding Drawer for AvA Code Alpha
/// Features Developer Profile, Workspace Switcher, MCP Health, and Full Navigation
class AppShellDrawer extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onSelectTab;

  const AppShellDrawer({
    super.key,
    required this.selectedIndex,
    required this.onSelectTab,
  });

  @override
  Widget build(BuildContext context) {
    final appState = AppStateScope.of(context);
    final authController = appState.authController;
    final providerController = appState.providerController;
    final user = authController.session?.username ?? AppConstants.authUsername;
    final activeModelId = providerController.activeModelId;

    return Drawer(
      backgroundColor: Colors.transparent,
      elevation: 0,
      width: 320,
      child: ClipRRect(
        borderRadius: const BorderRadius.horizontal(right: Radius.circular(24)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
          child: Container(
            decoration: const BoxDecoration(
              color: Color(0xF209090D), // Zinc 950 deep translucent
              border: Border(
                right: BorderSide(color: Color(0x30FFFFFF), width: 1.2),
              ),
            ),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Developer Profile Header
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        // Avatar Squircle
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: const Color(0xFF18181B),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0x40FFFFFF), width: 1.2),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.accentPrimary.withValues(alpha: 0.3),
                                blurRadius: 14,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(13),
                            child: Image.asset(
                              AppConstants.appLogoPath,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      AppConstants.developer,
                                      style: AppTypography.titleMedium.copyWith(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 15,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(
                                    LucideIcons.badgeCheck,
                                    size: 15,
                                    color: AppColors.accentPrimary,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '@$user • Authorized',
                                style: AppTypography.codeSmall.copyWith(
                                  color: AppColors.accentSuccess,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Divider
                  const Divider(color: Color(0x1FFFFFFF), height: 1),

                  // 2. Active Workspace & Model Card
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(LucideIcons.folderGit2, size: 14, color: AppColors.textSecondary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '/var/www/ava-code-alpha',
                                  style: AppTypography.codeSmall.copyWith(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  color: AppColors.accentSuccess,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(LucideIcons.sparkles, size: 13, color: AppColors.accentPrimary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Provider: $activeModelId',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.textSecondary,
                                    fontSize: 11,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // 3. Navigation Links
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      children: [
                        _buildNavItem(
                          index: 0,
                          icon: LucideIcons.messageSquare,
                          label: 'Agent Workspace',
                          badge: 'Live',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 1,
                          icon: LucideIcons.gitBranch,
                          label: 'Session Threads',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 2,
                          icon: LucideIcons.terminal,
                          label: 'Terminal Shell',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 3,
                          icon: LucideIcons.folderTree,
                          label: 'Workspace Files & Editor',
                          badge: 'VPS',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 4,
                          icon: LucideIcons.sparkles,
                          label: 'Model Providers',
                          badge: 'Antigravity',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 5,
                          icon: LucideIcons.plugZap,
                          label: 'MCP Tools & Servers',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 6,
                          icon: LucideIcons.activity,
                          label: 'System & PM2 Monitor',
                          badge: 'Stats',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 7,
                          icon: LucideIcons.settings,
                          label: 'Preferences',
                          context: context,
                        ),

                        const SizedBox(height: 16),
                        const Divider(color: Color(0x1FFFFFFF), height: 1),
                        const SizedBox(height: 12),

                        // System MCP & Engine Status Section
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          child: Text(
                            'CORE ENGINE SERVICES',
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textMuted,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                        _buildStatusRow(
                          icon: LucideIcons.hardDrive,
                          label: 'MCP Local Filesystem',
                          status: 'Mounted',
                          isGreen: true,
                        ),
                        _buildStatusRow(
                          icon: LucideIcons.cpu,
                          label: 'Google Antigravity SDK',
                          status: 'Active',
                          isGreen: true,
                        ),
                        _buildStatusRow(
                          icon: LucideIcons.network,
                          label: 'JSON-RPC App Server',
                          status: 'Port 4096',
                          isGreen: true,
                        ),
                        _buildStatusRow(
                          icon: LucideIcons.database,
                          label: 'MySQL / PM2 Services',
                          status: 'Online',
                          isGreen: true,
                        ),
                      ],
                    ),
                  ),

                  // 4. Footer & Logout Action
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0x1FFFFFFF), width: 1)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Logout Button
                        InkWell(
                          onTap: () {
                            Navigator.of(context).pop(); // Close drawer
                            _showLogoutDialog(context, authController);
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.diffRemoveBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: AppColors.accentDanger.withValues(alpha: 0.3),
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(LucideIcons.logOut, size: 15, color: AppColors.diffRemoveText),
                                const SizedBox(width: 8),
                                Text(
                                  'Sign Out of AvA Core',
                                  style: AppTypography.titleMedium.copyWith(
                                    color: AppColors.diffRemoveText,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Center(
                          child: Text(
                            '${AppConstants.appName} • ${AppConstants.appVersion}',
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 10,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required String label,
    String? badge,
    required BuildContext context,
  }) {
    final isSelected = selectedIndex == index;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: InkWell(
        onTap: () {
          Navigator.of(context).pop(); // Close drawer
          onSelectTab(index);
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0x28FFFFFF) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: isSelected
                ? Border.all(color: const Color(0x40FFFFFF), width: 1)
                : Border.all(color: Colors.transparent, width: 1),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 18,
                color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.bodyMedium.copyWith(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
                  ),
                ),
              ),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.accentPrimary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: AppColors.accentPrimary.withValues(alpha: 0.3),
                      width: 0.8,
                    ),
                  ),
                  child: Text(
                    badge,
                    style: AppTypography.codeSmall.copyWith(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accentPrimary,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusRow({
    required IconData icon,
    required String label,
    required String status,
    required bool isGreen,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppColors.textMuted),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.textSecondary,
                fontSize: 11,
              ),
            ),
          ),
          Container(
            width: 5,
            height: 5,
            decoration: BoxDecoration(
              color: isGreen ? AppColors.accentSuccess : AppColors.accentPrimary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            status,
            style: AppTypography.codeSmall.copyWith(
              fontSize: 10,
              color: isGreen ? AppColors.accentSuccess : AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, dynamic authController) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF18181B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x40FFFFFF), width: 1),
        ),
        title: Row(
          children: [
            const Icon(LucideIcons.alertTriangle, size: 20, color: AppColors.accentDanger),
            const SizedBox(width: 10),
            Text('Sign Out', style: AppTypography.titleMedium),
          ],
        ),
        content: Text(
          'Are you sure you want to end your current session with AvA Core?',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentDanger,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              Navigator.of(ctx).pop();
              await authController.logout();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}
