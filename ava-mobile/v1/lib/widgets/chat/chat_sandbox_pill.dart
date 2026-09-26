import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../theme/prompt_theme.dart';

/// Compact, theme-matched pill for selecting the sandbox mode inside the prompt box bottom action bar.
class ChatSandboxPill extends StatelessWidget {
  final Map<String, dynamic> currentOption;
  final Color badgeColor;
  final bool isDark;
  final VoidCallback onTap;

  const ChatSandboxPill({
    super.key,
    required this.currentOption,
    required this.badgeColor,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final String label = currentOption['short'] as String? ?? 'Workspace';
    final IconData icon = (currentOption['icon'] as IconData?) ?? LucideIcons.shieldCheck;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
          decoration: BoxDecoration(
            color: PromptTheme.toolsButtonBg(isDark),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: PromptTheme.toolsButtonBorder(isDark),
              width: 0.8,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: badgeColor,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: badgeColor.withValues(alpha: 0.5),
                      blurRadius: 3,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 5),
              Icon(
                icon,
                size: 12.5,
                color: badgeColor,
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                ),
              ),
              const SizedBox(width: 3),
              Icon(
                LucideIcons.chevronDown,
                size: 11,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
