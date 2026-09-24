import 'package:flutter/material.dart';
import '../models/app_models.dart';
import '../services/agent_core_service.dart';
import '../screens/chat_screen.dart';
import '../screens/models_screen.dart';
import '../screens/mcp_screen.dart';
import '../screens/sessions_screen.dart';
import '../screens/system_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/files_screen.dart';
import '../screens/media_screen.dart';
import '../screens/terminal_screen.dart';
import '../screens/browser_screen.dart';
import '../screens/scheduled_tasks_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/remote_desktop_screen.dart';
import '../screens/workspace_preference_screen.dart';
import 'interactive_swipe_to_chat.dart';

/// Wrapper that keeps TerminalScreen alive when switching tabs
class KeepAliveTerminal extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String vpsWorkspacePath;
  final String? serverUrl;
  final AvaAgentCoreService? agentCoreService;

  const KeepAliveTerminal({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.vpsWorkspacePath,
    this.serverUrl,
    this.agentCoreService,
  });

  @override
  State<KeepAliveTerminal> createState() => _KeepAliveTerminalState();
}

class _KeepAliveTerminalState extends State<KeepAliveTerminal>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return TerminalScreen(
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      vpsWorkspacePath: widget.vpsWorkspacePath,
      serverUrl: widget.serverUrl,
      agentCoreService: widget.agentCoreService,
    );
  }
}

/// Routes and renders active tab screen content based on selected navigation index
class MainTabRouter extends StatefulWidget {
  final int selectedNavIndex;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String serverUrl;
  final String vpsWorkspacePath;
  final AvaAgentCoreService agentCoreService;
  final List<ChatMessageModel> chatMessages;
  final String selectedMode;
  final ValueChanged<String> onSelectMode;
  final String selectedAgent;
  final ValueChanged<String> onSelectAgent;
  final VoidCallback onNewSession;
  final Future<void> Function(String promptText, {List<String>? attachments, String? userDisplayText}) onSendPrompt;
  final VoidCallback onInterrupt;
  final Future<void> Function(String requestId, String answer) onQuestionReplied;
  final Future<void> Function(bool approved, String command, {String? requestId}) onPermissionDecision;
  final ValueChanged<int> onSwitchTab;
  final VoidCallback onClearMessages;
  final void Function(String filePath, {String? diffOrContent}) onOpenFile;
  final ValueChanged<Map<String, dynamic>> onSelectSession;
  final AvaModelItem? selectedModel;
  final List<AvaModelItem> availableModels;
  final ValueChanged<AvaModelItem?> onSelectModel;
  final String reasoningEffort;
  final ValueChanged<String>? onSelectReasoningEffort;
  final Future<void> Function() onRefreshModels;
  final void Function({String? newUrl, String? newPath}) onUpdateCoreService;
  final String? pendingOpenFile;
  final String? pendingChatAttachment;
  final ValueChanged<String?> onSelectChatAttachment;
  final VoidCallback onClearInitialAttachment;

  final String? activeSessionId;
  final bool isTurnRunning;

  const MainTabRouter({
    super.key,
    required this.selectedNavIndex,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.serverUrl,
    required this.vpsWorkspacePath,
    required this.agentCoreService,
    this.activeSessionId,
    this.isTurnRunning = false,
    required this.chatMessages,
    required this.selectedMode,
    required this.onSelectMode,
    required this.selectedAgent,
    required this.onSelectAgent,
    required this.onNewSession,
    required this.onSendPrompt,
    required this.onInterrupt,
    required this.onQuestionReplied,
    required this.onPermissionDecision,
    required this.onSwitchTab,
    required this.onClearMessages,
    required this.onOpenFile,
    required this.onSelectSession,
    required this.selectedModel,
    required this.availableModels,
    required this.onSelectModel,
    this.reasoningEffort = "medium",
    this.onSelectReasoningEffort,
    required this.onRefreshModels,
    required this.onUpdateCoreService,
    required this.pendingOpenFile,
    required this.pendingChatAttachment,
    required this.onSelectChatAttachment,
    required this.onClearInitialAttachment,
  });

  @override
  State<MainTabRouter> createState() => _MainTabRouterState();
}

class _MainTabRouterState extends State<MainTabRouter> {
  @override
  Widget build(BuildContext context) {
    final screen = _buildScreen(context);
    if (widget.selectedNavIndex == 0) {
      return screen;
    }
    return Padding(
      padding: const EdgeInsets.only(top: 64),
      child: screen,
    );
  }

  Widget _buildScreen(BuildContext context) {
    switch (widget.selectedNavIndex) {
      case 0:
        return ChatScreen(
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          messages: widget.chatMessages,
          selectedMode: widget.selectedMode,
          onSelectMode: widget.onSelectMode,
          selectedAgent: widget.selectedAgent,
          onSelectAgent: widget.onSelectAgent,
          onNewSession: widget.onNewSession,
          vpsWorkspacePath: widget.vpsWorkspacePath,
          onSendPrompt: widget.onSendPrompt,
          onInterrupt: widget.onInterrupt,
          onQuestionReplied: widget.onQuestionReplied,
          onPermissionDecision: widget.onPermissionDecision,
          agentCoreService: widget.agentCoreService,
          onNavigateTab: widget.onSwitchTab,
          onClearMessages: widget.onClearMessages,
          onOpenFile: widget.onOpenFile,
          onSelectSession: widget.onSelectSession,
          selectedModel: widget.selectedModel,
          availableModels: widget.availableModels,
          onSelectModel: (m) => widget.onSelectModel(m),
          reasoningEffort: widget.reasoningEffort,
          onSelectReasoningEffort: widget.onSelectReasoningEffort,
          initialAttachment: widget.pendingChatAttachment,
          onClearInitialAttachment: widget.onClearInitialAttachment,
        );
      case 1:
        return InteractiveSwipeToChat(
          onDismissed: () => widget.onSwitchTab(0),
          child: FilesScreen(
            isDark: widget.isDark,
            cardBg: widget.cardBg,
            borderColor: widget.borderColor,
            textPrimary: widget.textPrimary,
            textSecondary: widget.textSecondary,
            vpsWorkspacePath: '/',
            agentCoreService: widget.agentCoreService,
            initialOpenFile: widget.pendingOpenFile,
            onSelectFileForChat: (filePath) {
              widget.onSelectChatAttachment(filePath);
              widget.onSwitchTab(0);
            },
          ),
        );
      case 2:
        return ModelsScreen(
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          availableModels: widget.availableModels,
          selectedModel: widget.selectedModel,
          onSelectModel: widget.onSelectModel,
          onRefreshModels: widget.onRefreshModels,
          serverUrl: widget.serverUrl,
          agentCoreService: widget.agentCoreService,
        );
      case 3:
        return McpScreen(
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          serverUrl: widget.serverUrl,
          agentCoreService: widget.agentCoreService,
        );
      case 4:
        return SessionsScreen(
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          agentCoreService: widget.agentCoreService,
          activeSessionId: widget.activeSessionId,
          isTurnRunning: widget.isTurnRunning,
          onSelectSession: widget.onSelectSession,
        );
      case 5:
        return SystemScreen(
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          agentCoreService: widget.agentCoreService,
        );
      case 6:
        return SettingsScreen(
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          serverUrl: widget.serverUrl,
          onUpdateServerUrl: (url) => widget.onUpdateCoreService(newUrl: url),
          vpsWorkspacePath: widget.vpsWorkspacePath,
          onUpdateWorkspacePath: (path) => widget.onUpdateCoreService(newPath: path),
          agentCoreService: widget.agentCoreService,
          availableModels: widget.availableModels,
          currentActiveModel: widget.selectedModel,
          onSelectPrimaryModel: widget.onSelectModel,
          currentActiveMode: widget.selectedMode,
          onSelectAgentMode: widget.onSelectMode,
        );
      case 7:
        return InteractiveSwipeToChat(
          onDismissed: () => widget.onSwitchTab(0),
          child: KeepAliveTerminal(
            isDark: widget.isDark,
            cardBg: widget.cardBg,
            borderColor: widget.borderColor,
            textPrimary: widget.textPrimary,
            textSecondary: widget.textSecondary,
            vpsWorkspacePath: '/',
            serverUrl: widget.serverUrl,
            agentCoreService: widget.agentCoreService,
          ),
        );
      case 8:
        return InteractiveSwipeToChat(
          onDismissed: () => widget.onSwitchTab(0),
          child: BrowserScreen(
            isDark: widget.isDark,
            cardBg: widget.cardBg,
            borderColor: widget.borderColor,
            textPrimary: widget.textPrimary,
            textSecondary: widget.textSecondary,
            serverUrl: widget.serverUrl,
            onBackToChat: () => widget.onSwitchTab(0),
          ),
        );
      case 9:
        return InteractiveSwipeToChat(
          onDismissed: () => widget.onSwitchTab(0),
          child: MediaScreen(
            isDark: widget.isDark,
            cardBg: widget.cardBg,
            borderColor: widget.borderColor,
            textPrimary: widget.textPrimary,
            textSecondary: widget.textSecondary,
            agentCoreService: widget.agentCoreService,
            initialOpenFile: widget.pendingOpenFile,
            vpsWorkspacePath: '/root/shared-media',
            onBackToChat: () => widget.onSwitchTab(0),
            onSelectFileForChat: (filePath) {
              widget.onSelectChatAttachment(filePath);
              widget.onSwitchTab(0);
            },
          ),
        );
      case 10:
        return ScheduledTasksScreen(
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          agentCoreService: widget.agentCoreService,
          onSelectSession: (session) {
            widget.onSelectSession(session);
            widget.onSwitchTab(0);
          },
        );
      case 11:
        return ProfileScreen(
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          agentCoreService: widget.agentCoreService,
          onBack: () => widget.onSwitchTab(0),
        );
      case 12:
        return RemoteDesktopScreen(
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          serverUrl: widget.serverUrl,
          onBack: () => widget.onSwitchTab(0),
        );
      case 13:
        return WorkspacePreferenceScreen(
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          vpsWorkspacePath: widget.vpsWorkspacePath,
          onUpdateWorkspacePath: (path) => widget.onUpdateCoreService(newPath: path),
          agentCoreService: widget.agentCoreService,
          availableModels: widget.availableModels,
          selectedModel: widget.selectedModel,
          onSelectModel: widget.onSelectModel,
          selectedMode: widget.selectedMode,
          onSelectMode: widget.onSelectMode,
          onBackToChat: () => widget.onSwitchTab(0),
          onNewSession: ({workspacePath, mode}) => widget.onNewSession(),
          onSelectFileForChat: (filePath) {
            widget.onSelectChatAttachment(filePath);
            widget.onSwitchTab(0);
          },
          initialOpenFile: widget.pendingOpenFile,
          serverUrl: widget.serverUrl,
          activeSessionId: widget.activeSessionId,
          chatMessages: widget.chatMessages,
          onNavigateTab: widget.onSwitchTab,
          onSelectSession: widget.onSelectSession,
        );
      default:
        return const SizedBox.shrink();
    }
  }
}
