import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../state/app_state.dart';

/// Premier Glassmorphic Top Header for AvA Code Alpha App Shell
/// Inspired by 21st.dev / shadcn dark UI design systems
class AppShellHeader extends StatelessWidget implements PreferredSizeWidget {
  final VoidCallback? onNewThread;
  final ValueChanged<int>? onNavigateTab;

  const AppShellHeader({
    super.key,
    this.onNewThread,
    this.onNavigateTab,
  });

  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) {
    final appState = AppStateScope.of(context);
    final user = appState.authController.session?.username ?? AppConstants.authUsername;
    final activeModelId = appState.providerController.activeModelId;

    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 60,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: const BoxDecoration(
            color: Color(0xCC0D0D11), // Deep zinc translucent
            border: Border(
              bottom: BorderSide(
                color: Color(0x24FFFFFF), // 21st.dev subtle rim divider
                width: 1.0,
              ),
            ),
          ),
          child: SafeArea(
            bottom: false,
            child: Row(
              children: [
                // Drawer Menu Button
                IconButton(
                  icon: const Icon(LucideIcons.menu, size: 20, color: AppColors.textPrimary),
                  tooltip: 'Open Workspace Menu',
                  splashRadius: 20,
                  onPressed: () {
                    Scaffold.of(context).openDrawer();
                  },
                ),

                const SizedBox(width: 6),

                // Brand Mark & Title
                GestureDetector(
                  onTap: () => onNavigateTab?.call(0),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: const Color(0xFF18181B),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0x40FFFFFF), width: 1),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.accentPrimary.withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(7),
                          child: Image.asset(
                            AppConstants.appLogoPath,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            children: [
                              Text(
                                AppConstants.appShortName,
                                style: AppTypography.titleMedium.copyWith(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -0.3,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: AppColors.accentPrimary.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: AppColors.accentPrimary.withValues(alpha: 0.4),
                                    width: 0.8,
                                  ),
                                ),
                                child: Text(
                                  'ALPHA',
                                  style: AppTypography.codeSmall.copyWith(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.accentPrimary,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // Active Provider / Model Status Badge (Tap to switch model)
                InkWell(
                  onTap: () => onNavigateTab?.call(4),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Pulsing active dot
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: AppColors.accentSuccess,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.accentSuccess.withValues(alpha: 0.6),
                                blurRadius: 6,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          activeModelId,
                          style: AppTypography.codeSmall.copyWith(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 8),

                // User / Developer Pill (Tap to go to Settings)
                InkWell(
                  onTap: () => onNavigateTab?.call(7),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0x20FFFFFF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0x30FFFFFF), width: 0.8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.shieldCheck, size: 13, color: AppColors.accentSuccess),
                        const SizedBox(width: 5),
                        Text(
                          '@$user',
                          style: AppTypography.codeSmall.copyWith(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
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
