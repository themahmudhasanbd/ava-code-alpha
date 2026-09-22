import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/app_models.dart';
import 'model_selector_modal.dart';
import 'context_window_modal.dart';

class HeaderBar extends StatelessWidget implements PreferredSizeWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaModelItem? selectedModel;
  final List<AvaModelItem> availableModels;
  final ValueChanged<AvaModelItem> onSelectModel;
  final Future<void> Function()? onRefreshModels;
  final bool isCoreConnected;
  final bool isReconnecting;
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
    required this.selectedModel,
    required this.availableModels,
    required this.onSelectModel,
    this.onRefreshModels,
    required this.isCoreConnected,
    this.isReconnecting = false,
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
  Size get preferredSize => const Size.fromHeight(62);

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Container(
          height: 62,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xFF0C0C10).withValues(alpha: 0.55)
                : Colors.white.withValues(alpha: 0.65),
            border: Border(
              bottom: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.12)
                    : Colors.black.withValues(alpha: 0.08),
                width: 1.0,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
                blurRadius: 16,
                offset: const Offset(0, 4),
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
              const SizedBox(width: 10),

              // Dynamic Model Selector Dropdown Pill Button
              Expanded(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: GestureDetector(
                    onTap: () {
                      showModelSelectorModal(
                        context: context,
                        isDark: isDark,
                        cardBg: cardBg,
                        borderColor: borderColor,
                        textPrimary: textPrimary,
                        textSecondary: textSecondary,
                        availableModels: availableModels,
                        selectedModel: selectedModel,
                        onSelectModel: onSelectModel,
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6.5),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF181822).withValues(alpha: 0.8)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isDark
                              ? const Color(0xFF6366F1).withValues(alpha: 0.35)
                              : const Color(0xFF6366F1).withValues(alpha: 0.25),
                          width: 1.1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.15 : 0.06),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            margin: const EdgeInsets.only(right: 7),
                            decoration: const BoxDecoration(
                              color: Color(0xFF6366F1),
                              shape: BoxShape.circle,
                            ),
                          ),
                          Flexible(
                            child: Text(
                              selectedModel?.name ?? 'Select Model',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 5),
                          Icon(
                            LucideIcons.chevronDown,
                            size: 13,
                            color: textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Workspace Preferences / Hub Button
              if (onOpenWorkspacePreferences != null) ...[
                Tooltip(
                  message: 'Workspace Hub & Preferences',
                  child: InkWell(
                    onTap: onOpenWorkspacePreferences,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.06)
                            : Colors.black.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.10)
                              : Colors.black.withValues(alpha: 0.07),
                        ),
                      ),
                      child: const Icon(
                        LucideIcons.briefcase,
                        size: 14,
                        color: Color(0xFF6366F1),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
              ],

              // Core Engine Connection Status Indicator & Context Window Pill
              Tooltip(
                message: isReconnecting
                    ? 'Reconnecting to AvA Core...'
                    : (isCoreConnected
                        ? 'AvA Core Online • Tap for Context Window & Tokens'
                        : 'AvA Core Disconnected (Tap to Reconnect)'),
                child: InkWell(
                  onTap: () {
                    if (!isCoreConnected) {
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
                        isCoreConnected: isCoreConnected,
                        activeSessionId: activeSessionId,
                        activeSessionTitle: activeSessionTitle,
                        serverUrl: serverUrl,
                        onCompactSession: onCompactSession,
                        onNewSession: onNewSession,
                        onOpenAnalytics: onOpenWorkspacePreferences,
                      );
                    }
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                    decoration: BoxDecoration(
                      color: isCoreConnected
                          ? (isDark ? const Color(0xFF064E3B).withValues(alpha: 0.40) : const Color(0xFFECFDF5))
                          : (isDark ? const Color(0xFF7F1D1D).withValues(alpha: 0.40) : const Color(0xFFFEF2F2)),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isCoreConnected
                            ? (isDark ? const Color(0xFF059669).withValues(alpha: 0.7) : const Color(0xFFA7F3D0))
                            : (isDark ? const Color(0xFFDC2626).withValues(alpha: 0.7) : const Color(0xFFFECACA)),
                        width: 1.0,
                      ),
                    ),
                    child: isReconnecting
                        ? const SizedBox(
                            width: 13,
                            height: 13,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF59E0B)),
                          )
                        : Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isCoreConnected ? LucideIcons.zap : LucideIcons.refreshCw,
                                size: 13,
                                color: isCoreConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                              ),
                              if (isCoreConnected) ...[
                                const SizedBox(width: 4),
                                Container(
                                  width: 5,
                                  height: 5,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ],
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
