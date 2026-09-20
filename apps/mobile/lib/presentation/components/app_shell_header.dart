import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../state/app_state.dart';

/// Clean, professional App Shell Top Header
/// Inspired by Claude Code and Lovable minimal design
class AppShellHeader extends StatelessWidget implements PreferredSizeWidget {
  final VoidCallback? onNewThread;
  final ValueChanged<int>? onNavigateTab;

  const AppShellHeader({
    super.key,
    this.onNewThread,
    this.onNavigateTab,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  void _showModelPicker(BuildContext context) {
    final providerCtrl = AppStateScope.of(context).providerController;
    final activeModel = providerCtrl.activeModelId;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.sparkles, size: 18, color: AppColors.accentPrimary),
                    const SizedBox(width: 8),
                    Text(
                      'Select AI Model',
                      style: AppTypography.titleLarge.copyWith(
                        fontSize: 16,
                        color: AppColors.text(context),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ...providerCtrl.providers.expand((p) => p.models).map((model) {
                  final isSelected = model == activeModel;
                  return InkWell(
                    onTap: () {
                      providerCtrl.setModel(model);
                      Navigator.pop(ctx);
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.cardElevated(context) : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSelected ? LucideIcons.checkCircle2 : LucideIcons.circle,
                            size: 16,
                            color: isSelected ? AppColors.accentPrimary : AppColors.muted(context),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              model,
                              style: AppTypography.bodyMedium.copyWith(
                                color: isSelected ? AppColors.text(context) : AppColors.subtext(context),
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = AppStateScope.of(context);
    final themeCtrl = appState.themeController;
    final providerCtrl = appState.providerController;
    final activeModel = providerCtrl.activeModelId;
    final isDark = AppColors.isDark(context);

    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xE609090B) : const Color(0xE6FFFFFF),
            border: Border(
              bottom: BorderSide(
                color: AppColors.line(context),
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
                  icon: Icon(LucideIcons.menu, size: 19, color: AppColors.text(context)),
                  tooltip: 'Menu',
                  splashRadius: 18,
                  onPressed: () => Scaffold.of(context).openDrawer(),
                ),

                const SizedBox(width: 4),

                // Brand Mark & Title
                GestureDetector(
                  onTap: () => onNavigateTab?.call(0),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        alignment: Alignment.center,
                        child: Image.asset(
                          AppConstants.appLogoPath,
                          fit: BoxFit.contain,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        AppConstants.appShortName,
                        style: AppTypography.titleMedium.copyWith(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          color: AppColors.text(context),
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // Minimalist Model Selector Pill
                InkWell(
                  onTap: () => _showModelPicker(context),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                    decoration: BoxDecoration(
                      color: AppColors.cardElevated(context),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.line(context)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppColors.accentSuccess,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 140),
                          child: Text(
                            activeModel,
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppColors.text(context),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(LucideIcons.chevronDown, size: 12, color: AppColors.subtext(context)),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 6),

                // Theme Switcher Button
                IconButton(
                  tooltip: isDark ? 'Light Theme' : 'Dark Theme',
                  icon: Icon(
                    isDark ? LucideIcons.sun : LucideIcons.moon,
                    size: 17,
                    color: AppColors.text(context),
                  ),
                  splashRadius: 18,
                  onPressed: () => themeCtrl.toggleTheme(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
