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
      const TerminalScreen(),
      const FilesScreen(),
      const ProvidersScreen(),
      const McpScreen(),
      const SystemScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
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
