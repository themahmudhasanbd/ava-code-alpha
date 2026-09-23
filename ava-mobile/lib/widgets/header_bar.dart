import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/app_models.dart';
import 'context_window_modal.dart';

class HeaderBar extends StatelessWidget implements PreferredSizeWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaModelItem? selectedModel;
  final List<AvaModelItem> availableModels;
  final ValueChanged<AvaModelItem>? onSelectModel;
  final Future<void> Function()? onRefreshModels;
  final bool isCoreConnected;
  final bool isReconnecting;
  final ValueNotifier<CoreConnectionStatus>? statusNotifier;
  final VoidCallback? onReconnectCore;
  final VoidCallback onOpenDrawer;
  final VoidCallback? onOpenWorkspacePreferences;
  final VoidCallback? onOpenTerminal;
  final VoidCallback? onOpenSystemHealth;
  final VoidCallback? onNewSession;
  final List<ChatMessageModel>? chatMessages;
  final String? activeSessionId;
  final String? activeSessionTitle;
  final String? serverUrl;
  final Future<void> Function()? onCompactSession;

  const HeaderBar({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.selectedModel,
    this.availableModels = const [],
    this.onSelectModel,
    this.onRefreshModels,
    required this.isCoreConnected,
    this.isReconnecting = false,
    this.statusNotifier,
    this.onReconnectCore,
    required this.onOpenDrawer,
    this.onOpenWorkspacePreferences,
    this.onOpenTerminal,
    this.onOpenSystemHealth,
    this.onNewSession,
    this.chatMessages,
    this.activeSessionId,
    this.activeSessionTitle,
    this.serverUrl,
    this.onCompactSession,
  });

  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) {
    final String sessionDisplayTitle = (activeSessionTitle != null && activeSessionTitle!.trim().isNotEmpty)
        ? activeSessionTitle!.trim()
        : ((activeSessionId != null && activeSessionId!.isNotEmpty)
            ? 'Session ${activeSessionId!.length > 8 ? activeSessionId!.substring(0, 8) : activeSessionId}'
            : 'New Session');

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Container(
          height: 60,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xFF0C0C10).withValues(alpha: 0.75)
                : Colors.white.withValues(alpha: 0.85),
            border: Border(
              bottom: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.10)
                    : Colors.black.withValues(alpha: 0.08),
                width: 1.0,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.03),
                blurRadius: 12,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              // Sleek Modern Sidebar/Menu Drawer Button
              InkWell(
                onTap: onOpenDrawer,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF1E1B4B).withValues(alpha: 0.55)
                        : const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark
                          ? const Color(0xFF6366F1).withValues(alpha: 0.35)
                          : const Color(0xFF818CF8).withValues(alpha: 0.45),
                      width: 1.1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.15 : 0.06),
                        blurRadius: 6,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Icon(
                      LucideIcons.menu,
                      size: 19,
                      color: isDark ? const Color(0xFFC7D2FE) : const Color(0xFF4F46E5),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Active Session Name / Title Pill (Taps to open Workspace Preference & Hub Modal)
              Expanded(
                child: GestureDetector(
                  onTap: onOpenWorkspacePreferences,
                  child: Container(
                    height: 38,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF161622).withValues(alpha: 0.85)
                          : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isDark
                            ? const Color(0xFF6366F1).withValues(alpha: 0.30)
                            : const Color(0xFF6366F1).withValues(alpha: 0.20),
                        width: 1.0,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.10 : 0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Icon(
                            LucideIcons.briefcase,
                            size: 12,
                            color: Color(0xFF818CF8),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            sessionDisplayTitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'PlusJakartaSans',
                              color: textPrimary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          LucideIcons.chevronDown,
                          size: 14,
                          color: textSecondary,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Core Engine Connection Status Indicator & Context Window Pill
              ValueListenableBuilder<CoreConnectionStatus>(
                valueListenable: statusNotifier ?? ValueNotifier(isCoreConnected ? CoreConnectionStatus.connected : (isReconnecting ? CoreConnectionStatus.reconnecting : CoreConnectionStatus.disconnected)),
                builder: (context, status, _) {
                  final bool isLiveOnline = status == CoreConnectionStatus.connected;
                  final bool isSyncingOrConnecting = status == CoreConnectionStatus.syncing || status == CoreConnectionStatus.connecting || status == CoreConnectionStatus.reconnecting || isReconnecting;

                  String tooltipMsg;
                  Color pillBg;
                  Color pillBorder;
                  Color pillFg;

                  if (isLiveOnline) {
                    tooltipMsg = 'AvA Core Online • Tap for Context Window & Tokens';
                    pillBg = isDark ? const Color(0xFF064E3B).withValues(alpha: 0.40) : const Color(0xFFECFDF5);
                    pillBorder = isDark ? const Color(0xFF059669).withValues(alpha: 0.7) : const Color(0xFFA7F3D0);
                    pillFg = const Color(0xFF10B981);
                  } else if (isSyncingOrConnecting) {
                    tooltipMsg = status == CoreConnectionStatus.syncing ? 'Syncing with AvA Core…' : 'Connecting to AvA Core…';
                    pillBg = isDark ? const Color(0xFF312E81).withValues(alpha: 0.40) : const Color(0xFFEEF2FF);
                    pillBorder = isDark ? const Color(0xFF6366F1).withValues(alpha: 0.7) : const Color(0xFFC7D2FE);
                    pillFg = const Color(0xFF818CF8);
                  } else {
                    tooltipMsg = 'AvA Core Disconnected (Tap to Reconnect)';
                    pillBg = isDark ? const Color(0xFF7F1D1D).withValues(alpha: 0.40) : const Color(0xFFFEF2F2);
                    pillBorder = isDark ? const Color(0xFFDC2626).withValues(alpha: 0.7) : const Color(0xFFFECACA);
                    pillFg = const Color(0xFFEF4444);
                  }

                  return Tooltip(
                    message: tooltipMsg,
                    child: InkWell(
                      onTap: () {
                        if (!isLiveOnline && !isSyncingOrConnecting) {
                          if (onReconnectCore != null) {
                            onReconnectCore!();
                          } else if (onOpenSystemHealth != null) {
                            onOpenSystemHealth!();
                          }
                        } else {
                          showContextWindowModal(
                            context: context,
                            isDark: isDark,
                            cardBg: cardBg,
                            borderColor: borderColor,
                            textPrimary: textPrimary,
                            textSecondary: textSecondary,
                            selectedModel: selectedModel,
                            chatMessages: chatMessages,
                            isCoreConnected: isLiveOnline,
                            activeSessionId: activeSessionId,
                            activeSessionTitle: activeSessionTitle,
                            serverUrl: serverUrl,
                            onCompactSession: onCompactSession,
                            onNewSession: onNewSession,
                            onOpenAnalytics: onOpenWorkspacePreferences,
                          );
                        }
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        height: 38,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: pillBg,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: pillBorder, width: 1.0),
                        ),
                        child: isSyncingOrConnecting
                            ? Center(
                                child: SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 1.8,
                                    color: pillFg,
                                  ),
                                ),
                              )
                            : Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    isLiveOnline ? LucideIcons.zap : LucideIcons.refreshCw,
                                    size: 14,
                                    color: pillFg,
                                  ),
                                  if (isLiveOnline) ...[
                                    const SizedBox(width: 4),
                                    Container(
                                      width: 5,
                                      height: 5,
                                      decoration: BoxDecoration(
                                        color: pillFg,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
