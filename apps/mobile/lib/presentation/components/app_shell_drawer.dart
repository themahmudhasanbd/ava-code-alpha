import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../state/app_state.dart';

/// Clean, professional sliding navigation drawer for AvA Code Alpha
/// Supports dynamic Light and Dark modes
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
    final themeCtrl = appState.themeController;
    final user = authController.session?.username ?? AppConstants.authUsername;
    final isDark = AppColors.isDark(context);

    return Drawer(
      backgroundColor: Colors.transparent,
      elevation: 0,
      width: 300,
      child: ClipRRect(
        borderRadius: const BorderRadius.horizontal(right: Radius.circular(20)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xF509090B) : const Color(0xF5FFFFFF),
              border: Border(
                right: BorderSide(color: AppColors.line(context), width: 1.0),
              ),
            ),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Clean App Header & Workspace Title
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          alignment: Alignment.center,
                          child: Image.asset(
                            AppConstants.appLogoPath,
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                AppConstants.appName,
                                style: AppTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  color: AppColors.text(context),
                                ),
                              ),
                              Text(
                                '@$user',
                                style: AppTypography.codeSmall.copyWith(
                                  color: AppColors.subtext(context),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Divider
                  Divider(color: AppColors.line(context), height: 1),

                  // 2. Active Workspace Badge
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.cardElevated(context),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.line(context)),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.folderGit2, size: 14, color: AppColors.subtext(context)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '/var/www/ava-code-alpha',
                              style: AppTypography.codeSmall.copyWith(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: AppColors.text(context),
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
                    ),
                  ),

                  // 3. Navigation Links
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      children: [
                        _buildNavItem(
                          index: 0,
                          icon: LucideIcons.messageSquare,
                          label: 'Chat',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 1,
                          icon: LucideIcons.gitBranch,
                          label: 'Sessions',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 2,
                          icon: LucideIcons.terminal,
                          label: 'Terminal',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 3,
                          icon: LucideIcons.folderTree,
                          label: 'Files & Editor',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 4,
                          icon: LucideIcons.sparkles,
                          label: 'Models',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 5,
                          icon: LucideIcons.plugZap,
                          label: 'MCP Tools',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 6,
                          icon: LucideIcons.activity,
                          label: 'System',
                          context: context,
                        ),
                        _buildNavItem(
                          index: 7,
                          icon: LucideIcons.settings,
                          label: 'Settings',
                          context: context,
                        ),
                      ],
                    ),
                  ),

                  // 4. Footer & Actions
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: AppColors.line(context), width: 1)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Theme Toggle Bar
                        InkWell(
                          onTap: () => themeCtrl.toggleTheme(),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.cardElevated(context),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.line(context)),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isDark ? LucideIcons.moon : LucideIcons.sun,
                                  size: 14,
                                  color: AppColors.text(context),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    isDark ? 'Dark Theme' : 'Light Theme',
                                    style: AppTypography.bodySmall.copyWith(
                                      color: AppColors.text(context),
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                Text(
                                  'Toggle',
                                  style: AppTypography.codeSmall.copyWith(
                                    fontSize: 10,
                                    color: AppColors.muted(context),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Sign Out Button
                        InkWell(
                          onTap: () {
                            Navigator.of(context).pop();
                            _showLogoutDialog(context, authController);
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.diffRemoveBg,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(LucideIcons.logOut, size: 14, color: AppColors.diffRemoveText),
                                const SizedBox(width: 6),
                                Text(
                                  'Sign Out',
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.diffRemoveText,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
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
    required BuildContext context,
  }) {
    final isSelected = selectedIndex == index;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: InkWell(
        onTap: () {
          Navigator.of(context).pop();
          onSelectTab(index);
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.cardElevated(context) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: isSelected
                ? Border.all(color: AppColors.lineStrong(context), width: 1)
                : Border.all(color: Colors.transparent, width: 1),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? AppColors.accentPrimary : AppColors.subtext(context),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.bodyMedium.copyWith(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                    color: isSelected ? AppColors.text(context) : AppColors.subtext(context),
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, dynamic authController) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card(context),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: AppColors.line(context)),
        ),
        title: Text('Sign Out', style: AppTypography.titleMedium.copyWith(color: AppColors.text(context))),
        content: Text(
          'Are you sure you want to sign out?',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.subtext(context)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.muted(context))),
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
