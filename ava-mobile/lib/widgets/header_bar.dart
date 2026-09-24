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
  Size get preferredSize => const Size.fromHeight(64);

  void _handleRightAction(BuildContext context, bool isLiveOnline, bool isSyncingOrConnecting) {
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
  }

  @override
  Widget build(BuildContext context) {
    final String sessionDisplayTitle = (activeSessionTitle != null && activeSessionTitle!.trim().isNotEmpty)
        ? activeSessionTitle!.trim()
        : ((activeSessionId != null && activeSessionId!.isNotEmpty)
            ? 'Session ${activeSessionId!.length > 8 ? activeSessionId!.substring(0, 8) : activeSessionId}'
            : 'Pixel Perfect');

    final Color buttonBg = isDark
        ? const Color(0xFF18181B).withValues(alpha: 0.95)
        : Colors.white;

    final Color buttonBorder = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.black.withValues(alpha: 0.08);

    final List<BoxShadow> buttonShadows = [
      BoxShadow(
        color: Colors.black.withValues(alpha: isDark ? 0.40 : 0.08),
        blurRadius: 14,
        spreadRadius: 0,
        offset: const Offset(0, 3),
      ),
      BoxShadow(
        color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.03),
        blurRadius: 4,
        spreadRadius: 0,
        offset: const Offset(0, 1),
      ),
    ];

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                (isDark ? const Color(0xFF09090B) : Colors.white).withValues(alpha: isDark ? 0.85 : 0.88),
                (isDark ? const Color(0xFF09090B) : Colors.white).withValues(alpha: 0.40 : 0.45),
                (isDark ? const Color(0xFF09090B) : Colors.white).withValues(alpha: 0.0),
              ],
              stops: const [0.0, 0.65, 1.0],
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // ── Left Circle Action Button (Close / Drawer) ─────────────────
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: buttonBg,
                  shape: BoxShape.circle,
                  border: Border.all(color: buttonBorder, width: 1.0),
                  boxShadow: buttonShadows,
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onOpenDrawer,
                    customBorder: const CircleBorder(),
                    child: Center(
                      child: Icon(
                        LucideIcons.x,
                        size: 19,
                        color: textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // ── Center Pill Button (Title + Chevron Down) ──────────────────
              Expanded(
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: buttonBg,
                    borderRadius: BorderRadius.circular(26),
                    border: Border.all(color: buttonBorder, width: 1.0),
                    boxShadow: buttonShadows,
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: onOpenWorkspacePreferences,
                      borderRadius: BorderRadius.circular(26),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Flexible(
                              child: Text(
                                sessionDisplayTitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w600,
                                  fontFamily: 'PlusJakartaSans',
                                  color: textPrimary,
                                  letterSpacing: -0.2,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Icon(
                              LucideIcons.chevronDown,
                              size: 16,
                              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF64748B),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // ── Right Circle Action Button (Forward / Next / Context Modal) ──
              ValueListenableBuilder<CoreConnectionStatus>(
                valueListenable: statusNotifier ??
                    ValueNotifier(isCoreConnected
                        ? CoreConnectionStatus.connected
                        : (isReconnecting
                            ? CoreConnectionStatus.reconnecting
                            : CoreConnectionStatus.disconnected)),
                builder: (context, status, _) {
                  final bool isLiveOnline = status == CoreConnectionStatus.connected;
                  final bool isSyncingOrConnecting =
                      status == CoreConnectionStatus.syncing ||
                          status == CoreConnectionStatus.connecting ||
                          status == CoreConnectionStatus.reconnecting ||
                          isReconnecting;

                  return Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: buttonBg,
                      shape: BoxShape.circle,
                      border: Border.all(color: buttonBorder, width: 1.0),
                      boxShadow: buttonShadows,
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => _handleRightAction(context, isLiveOnline, isSyncingOrConnecting),
                        customBorder: const CircleBorder(),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            if (isSyncingOrConnecting)
                              SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.0,
                                  color: textPrimary,
                                ),
                              )
                            else
                              Icon(
                                LucideIcons.chevronRight,
                                size: 20,
                                color: textPrimary,
                              ),
                            if (!isLiveOnline && !isSyncingOrConnecting)
                              Positioned(
                                top: 8,
                                right: 8,
                                child: Container(
                                  width: 7,
                                  height: 7,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
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
