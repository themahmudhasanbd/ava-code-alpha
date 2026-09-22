import "package:flutter/material.dart";
import "package:lucide_icons_flutter/lucide_icons.dart";
import "../../models/app_models.dart";
import "../../utils/app_toast.dart";

/// Active Permission Request Dock pinned directly above the Prompt Box
class StickyPermissionDock extends StatelessWidget {
  final Map<String, dynamic>? activePermission;

  static Map<String, dynamic>? getActivePermission(List<ChatMessageModel> messages, {String? dismissedPermissionId}) {
    final startIdx = (messages.length - 10).clamp(0, messages.length);
    for (int i = messages.length - 1; i >= startIdx; i--) {
      final msg = messages[i];
      if (msg.sender == 'user') continue;
      final p = msg.permissionData;
      if (p != null && p['answered'] != true) {
        final pId = (p['requestID'] ?? p['id'] ?? '').toString();
        if (pId.isNotEmpty && pId != dismissedPermissionId) {
          return p;
        }
      }
    }
    return null;
  }
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final Function(bool approved, String command, {String? requestId})? onPermissionDecision;
  final ValueChanged<String> onDismiss;

  const StickyPermissionDock({
    super.key,
    required this.activePermission,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onPermissionDecision,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final p = activePermission;
    if (p == null) return const SizedBox.shrink();

    final reqId = (p['requestID'] ?? p['id'] ?? '').toString();
    final command = (p['command'] ?? p['description'] ?? 'run operation').toString();

    const amberAccent = Color(0xFFD97706);

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 4, 14, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF18130C) : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: amberAccent.withValues(alpha: isDark ? 0.5 : 0.4),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: amberAccent.withValues(alpha: isDark ? 0.12 : 0.08),
            blurRadius: 16,
            spreadRadius: 1,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: amberAccent.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(LucideIcons.shieldAlert, size: 13, color: amberAccent),
              ),
              const SizedBox(width: 8),
              const Text(
                'Permission Request',
                style: TextStyle(
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w800,
                  color: amberAccent,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                decoration: BoxDecoration(
                  color: amberAccent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Action Required',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w700,
                    color: amberAccent,
                  ),
                ),
              ),
              const Spacer(),
              InkWell(
                onTap: () => onDismiss(reqId),
                borderRadius: BorderRadius.circular(4),
                child: Padding(
                  padding: const EdgeInsets.all(3),
                  child: Icon(LucideIcons.x, size: 14, color: textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'The assistant is requesting permission to execute:',
            style: TextStyle(fontSize: 12, fontFamily: 'Inter', color: textSecondary),
          ),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF221A10) : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: amberAccent.withValues(alpha: 0.35), width: 0.8),
            ),
            child: SelectableText(
              command,
              style: const TextStyle(fontFamily: 'JetBrainsMono', fontSize: 11.5, color: amberAccent),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () {
                    onPermissionDecision?.call(true, command, requestId: reqId);
                    onDismiss(reqId);
                    AppToast.success(context, 'Permission approved!');
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5), width: 0.8),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.check, size: 13, color: Color(0xFF10B981)),
                        SizedBox(width: 5),
                        Text('Approve', style: TextStyle(fontSize: 12, fontFamily: 'Inter', fontWeight: FontWeight.w700, color: Color(0xFF10B981))),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () {
                    onPermissionDecision?.call(false, command, requestId: reqId);
                    onDismiss(reqId);
                    AppToast.info(context, 'Permission denied.');
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4), width: 0.8),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.x, size: 13, color: Color(0xFFEF4444)),
                        SizedBox(width: 5),
                        Text('Deny', style: TextStyle(fontSize: 12, fontFamily: 'Inter', fontWeight: FontWeight.w700, color: Color(0xFFEF4444))),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
