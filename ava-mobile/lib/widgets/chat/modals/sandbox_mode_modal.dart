import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../utils/app_toast.dart';

/// Modal bottom sheet to configure Codex sandbox permission mode
class SandboxModeModal extends StatelessWidget {
  final String selectedMode;
  final List<Map<String, dynamic>> sandboxOptions;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final ValueChanged<String> onSelectMode;

  const SandboxModeModal({
    super.key,
    required this.selectedMode,
    required this.sandboxOptions,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onSelectMode,
  });

  static void show(
    BuildContext context, {
    required String selectedMode,
    required List<Map<String, dynamic>> sandboxOptions,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
    required ValueChanged<String> onSelectMode,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => SandboxModeModal(
        selectedMode: selectedMode,
        sandboxOptions: sandboxOptions,
        isDark: isDark,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        onSelectMode: onSelectMode,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.65),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.shieldCheck, size: 16, color: Color(0xFF38BDF8)),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sandbox Permission Mode',
                    style: TextStyle(
                      fontSize: 16,
                      fontFamily: 'PlusJakartaSans',
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                  ),
                  Text(
                    'Control filesystem boundaries & bash execution permissions',
                    style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: textSecondary),
                  ),
                ],
              ),
              const Spacer(),
              IconButton(
                icon: Icon(LucideIcons.x, size: 18, color: textSecondary),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              children: sandboxOptions.map((opt) {
                final optId = opt['id'] as String;
                final isSelected = selectedMode.toLowerCase() == optId.toLowerCase() ||
                    selectedMode.replaceAll('-', '_').toUpperCase() == optId.replaceAll('-', '_').toUpperCase();
                final optColor = opt['color'] as Color;
                final optIcon = opt['icon'] as IconData;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    onTap: () {
                      onSelectMode(optId);
                      Navigator.pop(context);
                      AppToast.info(context, 'Sandbox mode set to ${opt['name']}');
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? optColor.withValues(alpha: isDark ? 0.14 : 0.08)
                            : (isDark ? const Color(0xFF13131A) : const Color(0xFFF8FAFC)),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSelected ? optColor : borderColor.withValues(alpha: 0.6),
                          width: isSelected ? 1.2 : 0.8,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: optColor.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(optIcon, size: 18, color: optColor),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      opt['name'] as String,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontFamily: 'PlusJakartaSans',
                                        fontWeight: FontWeight.w700,
                                        color: textPrimary,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: optColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        opt['badge'] as String? ?? (isSelected ? 'ACTIVE' : ''),
                                        style: TextStyle(
                                          fontSize: 9.5,
                                          fontFamily: 'Inter',
                                          fontWeight: FontWeight.w800,
                                          color: optColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  opt['desc'] as String? ?? '',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontFamily: 'Inter',
                                    color: textSecondary,
                                    height: 1.35,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isSelected) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: optColor,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(LucideIcons.check, size: 12, color: Colors.white),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
