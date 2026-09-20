import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import 'chat/chat_screen.dart';
import 'providers/providers_screen.dart';
import 'settings/settings_screen.dart';
import 'terminal/terminal_screen.dart';
import 'threads/threads_screen.dart';

/// Premier 21st.dev Floating Dock App Shell
/// Inspired by Manu Arora's iconic 21st.dev / Aceternity macOS Floating Dock
class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;
  double? _touchX;
  int? _hoveredIndex;

  final List<_DockItem> _dockItems = [
    _DockItem(icon: LucideIcons.messageSquare, label: 'Chat', tooltip: 'AI Workspace'),
    _DockItem(icon: LucideIcons.gitBranch, label: 'Threads', tooltip: 'Sessions'),
    _DockItem(icon: LucideIcons.sparkles, label: 'Models', tooltip: 'Antigravity'),
    _DockItem(icon: LucideIcons.terminal, label: 'Terminal', tooltip: 'Shell & Logs'),
    _DockItem(icon: LucideIcons.settings, label: 'Settings', tooltip: 'Preferences'),
  ];

  void _onTabSelect(int index) {
    setState(() {
      _currentIndex = index;
      _hoveredIndex = index;
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
          // Active Screen Content
          IndexedStack(
            index: _currentIndex,
            children: screens,
          ),

          // 21st.dev Floating Dock Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 24,
            child: Center(
              child: _build21stFloatingDock(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _build21stFloatingDock() {
    return Container(
      constraints: const BoxConstraints(maxWidth: 380),
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Floating Tooltip Indicator (21st.dev style)
          _buildFloatingTooltip(),

          const SizedBox(height: 6),

          // Glassmorphic Dock Container
          ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xE0121215), // Zinc 950 deep translucent
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: const Color(0x33FFFFFF), // 21st.dev subtle rim light
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.6),
                      blurRadius: 32,
                      offset: const Offset(0, 12),
                    ),
                    BoxShadow(
                      color: AppColors.accentPrimary.withValues(alpha: 0.1),
                      blurRadius: 20,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: GestureDetector(
                  onHorizontalDragUpdate: (details) {
                    final box = context.findRenderObject() as RenderBox?;
                    if (box != null) {
                      setState(() {
                        _touchX = details.localPosition.dx;
                      });
                    }
                  },
                  onHorizontalDragEnd: (_) {
                    setState(() {
                      _touchX = null;
                    });
                  },
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(_dockItems.length, (index) {
                      return _buildDockIcon(index);
                    }),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingTooltip() {
    final activeIndex = _hoveredIndex ?? _currentIndex;
    final item = _dockItems[activeIndex];

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 180),
      opacity: 1.0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xF018181B), // Zinc 900
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0x30FFFFFF), width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              item.label,
              style: AppTypography.codeSmall.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 11,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              '• ${item.tooltip}',
              style: AppTypography.codeSmall.copyWith(
                color: AppColors.textMuted,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDockIcon(int index) {
    final item = _dockItems[index];
    final isSelected = _currentIndex == index;

    // 21st.dev Proximity Magnification Calculation
    double scale = 1.0;
    if (_touchX != null) {
      final itemCenterX = index * 56.0 + 28.0;
      final distance = (_touchX! - itemCenterX).abs();
      final proximity = math.max(0.0, 1.0 - (distance / 80.0));
      scale = 1.0 + (0.35 * proximity);
    } else if (isSelected) {
      scale = 1.15;
    }

    return MouseRegion(
      onEnter: (_) {
        setState(() {
          _hoveredIndex = index;
        });
      },
      onExit: (_) {
        setState(() {
          _hoveredIndex = null;
        });
      },
      child: InkWell(
        onTap: () => _onTabSelect(index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutBack,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0x28FFFFFF) : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
            border: isSelected
                ? Border.all(color: const Color(0x40FFFFFF), width: 1)
                : Border.all(color: Colors.transparent, width: 1),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedScale(
                scale: scale,
                duration: const Duration(milliseconds: 160),
                curve: Curves.easeOutBack,
                child: Icon(
                  item.icon,
                  size: 20,
                  color: isSelected ? AppColors.textPrimary : AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 3),
              // Active dot indicator (21st.dev / macOS style)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: isSelected ? 4 : 0,
                height: isSelected ? 4 : 0,
                decoration: const BoxDecoration(
                  color: AppColors.accentPrimary,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DockItem {
  final IconData icon;
  final String label;
  final String tooltip;

  _DockItem({
    required this.icon,
    required this.label,
    required this.tooltip,
  });
}
