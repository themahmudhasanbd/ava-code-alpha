import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../components/app_shell_drawer.dart';
import '../components/app_shell_header.dart';
import 'chat/chat_screen.dart';
import 'files/files_screen.dart';
import 'mcp/mcp_screen.dart';
import 'providers/providers_screen.dart';
import 'settings/settings_screen.dart';
import 'system/system_screen.dart';
import 'terminal/terminal_screen.dart';
import 'threads/threads_screen.dart';

/// Premier App Shell with Glassmorphic Top Header and Sliding Navigation Drawer
class MainNavigationShell extends StatefulWidget {
  final int? initialIndex;

  const MainNavigationShell({super.key, this.initialIndex});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex ?? 0;
  }

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
      const TerminalScreen(),
      const FilesScreen(),
      const ProvidersScreen(),
      const McpScreen(),
      const SystemScreen(),
      SettingsScreen(onNavigateTab: _onTabSelect),
    ];

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      appBar: AppShellHeader(
        onNavigateTab: _onTabSelect,
      ),
      drawer: AppShellDrawer(
        selectedIndex: _currentIndex,
        onSelectTab: _onTabSelect,
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
    );
  }
}
