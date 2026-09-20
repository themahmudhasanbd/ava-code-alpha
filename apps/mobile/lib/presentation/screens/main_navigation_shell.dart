import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_motion.dart';
import '../../../core/theme/app_typography.dart';
import 'chat/chat_screen.dart';
import 'providers/providers_screen.dart';
import 'settings/settings_screen.dart';
import 'terminal/terminal_screen.dart';
import 'threads/threads_screen.dart';

/// Modern App Shell featuring a floating glassmorphic bottom navigation dock
class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  void _onTabSelect(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const ChatScreen(),
      ThreadsScreen(onNavigateTab: _onTabSelect),
      const ProvidersScreen(),
      const TerminalScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Current Page
          IndexedStack(
            index: _currentIndex,
            children: screens,
          ),

          // Floating Glassmorphic Bottom Dock
          Positioned(
            left: 20,
            right: 20,
            bottom: 24,
            child: _buildFloatingDock(),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingDock() {
    final navItems = [
      _NavItem(icon: LucideIcons.messageSquare, label: 'Chat'),
      _NavItem(icon: LucideIcons.gitBranch, label: 'Threads'),
      _NavItem(icon: LucideIcons.sparkles, label: 'Models'),
      _NavItem(icon: LucideIcons.terminal, label: 'Terminal'),
      _NavItem(icon: LucideIcons.settings, label: 'Settings'),
    ];

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.borderStrong, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(navItems.length, (index) {
              final item = navItems[index];
              final isSelected = _currentIndex == index;

              return InkWell(
                onTap: () => _onTabSelect(index),
                borderRadius: BorderRadius.circular(16),
                child: AnimatedContainer(
                  duration: AppMotion.durationFast,
                  curve: AppMotion.curveSmooth,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.surfaceHighlight : Colors.transparent,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        item.icon,
                        size: 18,
                        color: isSelected ? AppColors.textPrimary : AppColors.textMuted,
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 6),
                        Text(
                          item.label,
                          style: AppTypography.labelMedium.copyWith(
                            fontSize: 12,
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;

  _NavItem({required this.icon, required this.label});
}
