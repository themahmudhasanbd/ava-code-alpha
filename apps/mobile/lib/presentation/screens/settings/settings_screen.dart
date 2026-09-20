import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
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
    final themeCtrl = scope.themeController;
    final isDark = AppColors.isDark(context);

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Screen Title Header
          Row(
            children: [
              const Icon(LucideIcons.settings, size: 16, color: AppColors.accentPrimary),
              const SizedBox(width: 8),
              Text(
                'System Preferences',
                style: AppTypography.titleLarge.copyWith(fontSize: 18, color: AppColors.text(context)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Authenticated User Profile Card
          ShadcnCard(
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceSubtle : AppColors.lightSurfaceElevated,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(LucideIcons.userCheck, size: 22, color: AppColors.accentSuccess),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        auth.session?.username ?? AppConstants.authUsername,
                        style: AppTypography.titleMedium.copyWith(color: AppColors.text(context)),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const ShadcnBadge(label: 'Developer Tier', variant: ShadcnBadgeVariant.success),
                          const SizedBox(width: 6),
                          Text(
                            'AvA Core Admin',
                            style: AppTypography.bodySmall.copyWith(color: AppColors.subtext(context)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Appearance Theme Mode Selection Card
          Text('APPEARANCE & THEME', style: AppTypography.codeSmall.copyWith(color: AppColors.muted(context))),
          const SizedBox(height: 10),

          ShadcnCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      themeCtrl.isDarkMode ? LucideIcons.moon : LucideIcons.sun,
                      size: 16,
                      color: AppColors.accentPrimary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Theme Mode',
                      style: AppTypography.titleMedium.copyWith(color: AppColors.text(context)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Switch between Clean Slate (Light) and Zinc Obsidian (Dark) styles.',
                  style: AppTypography.bodySmall.copyWith(color: AppColors.subtext(context)),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => themeCtrl.setThemeMode(ThemeMode.dark),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: themeCtrl.themeMode == ThemeMode.dark
                                ? AppColors.accentPrimary.withValues(alpha: 0.2)
                                : (isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: themeCtrl.themeMode == ThemeMode.dark
                                  ? AppColors.accentPrimary
                                  : AppColors.line(context),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(LucideIcons.moon, size: 14, color: AppColors.accentPrimary),
                              const SizedBox(width: 6),
                              Text(
                                'Dark Mode',
                                style: AppTypography.codeSmall.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.text(context),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: InkWell(
                        onTap: () => themeCtrl.setThemeMode(ThemeMode.light),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: themeCtrl.themeMode == ThemeMode.light
                                ? AppColors.accentPrimary.withValues(alpha: 0.15)
                                : (isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: themeCtrl.themeMode == ThemeMode.light
                                  ? AppColors.accentPrimary
                                  : AppColors.line(context),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(LucideIcons.sun, size: 14, color: AppColors.accentWarning),
                              const SizedBox(width: 6),
                              Text(
                                'Light Mode',
                                style: AppTypography.codeSmall.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.text(context),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Server Endpoint Settings
          Text('CORE ENGINE & APP-SERVER', style: AppTypography.codeSmall.copyWith(color: AppColors.muted(context))),
          const SizedBox(height: 10),

          ShadcnCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'JSON-RPC 2.0 Host',
                  style: AppTypography.titleMedium.copyWith(color: AppColors.text(context)),
                ),
                const SizedBox(height: 4),
                Text(
                  'Address of the running ava-rs app-server daemon.',
                  style: AppTypography.bodySmall.copyWith(color: AppColors.subtext(context)),
                ),
                const SizedBox(height: 12),
                ShadcnInput(
                  controller: _serverController,
                  hintText: 'https://ava.mahmudhasan.pro/api',
                  prefixIcon: LucideIcons.server,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(LucideIcons.shieldCheck, size: 14, color: AppColors.accentSuccess),
                    const SizedBox(width: 6),
                    Text(
                      'Auto-compaction limit: 900,000 tokens',
                      style: AppTypography.codeSmall.copyWith(color: AppColors.muted(context)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // About App Branding Section
          ShadcnCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.line(context)),
                      ),
                      child: Image.asset(AppConstants.appLogoPath, fit: BoxFit.contain),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppConstants.appName,
                          style: AppTypography.titleMedium.copyWith(color: AppColors.text(context)),
                        ),
                        Text(
                          '${AppConstants.appVersion} (Build ${AppConstants.appBuildNumber})',
                          style: AppTypography.codeSmall.copyWith(color: AppColors.muted(context)),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  AppConstants.appDescription,
                  style: AppTypography.bodySmall.copyWith(color: AppColors.subtext(context)),
                ),
                const SizedBox(height: 8),
                Divider(color: AppColors.line(context)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Developer', style: AppTypography.bodySmall.copyWith(color: AppColors.subtext(context))),
                    Text(
                      AppConstants.developer,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.text(context),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('License', style: AppTypography.bodySmall.copyWith(color: AppColors.subtext(context))),
                    Text(
                      'Proprietary Alpha',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.accentPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
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
              AppConstants.appCopyright,
              style: AppTypography.codeSmall.copyWith(color: AppColors.muted(context), fontSize: 10),
            ),
          ),
        ],
      ),
    );
  }
}
