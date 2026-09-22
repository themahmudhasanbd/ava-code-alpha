import 'package:flutter/material.dart';
import '../services/agent_core_service.dart';
import '../widgets/workspace_file_explorer.dart';

class FilesScreen extends StatelessWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String vpsWorkspacePath;
  final AvaAgentCoreService agentCoreService;
  final ValueChanged<String>? onSelectFileForChat;
  final String? initialOpenFile;

  const FilesScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.vpsWorkspacePath,
    required this.agentCoreService,
    this.onSelectFileForChat,
    this.initialOpenFile,
  });

  @override
  Widget build(BuildContext context) {
    return WorkspaceFileExplorerWidget(
      isDark: isDark,
      cardBg: cardBg,
      borderColor: borderColor,
      textPrimary: textPrimary,
      textSecondary: textSecondary,
      vpsWorkspacePath: vpsWorkspacePath,
      agentCoreService: agentCoreService,
      onSelectFileForChat: onSelectFileForChat,
      showHeaderBar: false,
      initialOpenFile: initialOpenFile,
    );
  }
}
