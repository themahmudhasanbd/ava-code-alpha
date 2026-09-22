import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../models/app_models.dart';
import '../formatted_message_view.dart';

/// Clean, modern shadcn / linear-inspired dashboard empty state matching reference design
class ChatEmptyView extends StatelessWidget {
  final Color textPrimary;
  final Color textSecondary;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final String? vpsWorkspacePath;
  final AvaModelItem? selectedModel;
  final VoidCallback? onNewSession;
  final ValueChanged<String>? onSelectPrompt;

  const ChatEmptyView({
    super.key,
    required this.textPrimary,
    required this.textSecondary,
    this.isDark = true,
    this.cardBg = const Color(0xFF141418),
    this.borderColor = const Color(0x1FFFFFFF),
    this.vpsWorkspacePath,
    this.selectedModel,
    this.onNewSession,
    this.onSelectPrompt,
  });

  @override
  Widget build(BuildContext context) {
    final wsPath = vpsWorkspacePath != null && vpsWorkspacePath!.isNotEmpty
        ? vpsWorkspacePath!
        : '/var/www/ava-code';
    final modelName = selectedModel?.name ?? 'Claude 3.7 Sonnet';

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 80, 16, 160),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── 1. Header Overview ──────────────────────────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: buildAvaLogoAvatar(size: 48, radius: 14),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'AvA Code',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: textPrimary,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                                  width: 0.8,
                                ),
                              ),
                              child: const Text(
                                'Pro Agent',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF6366F1),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Direct native agent connected to your Linux workspace',
                          style: TextStyle(
                            fontSize: 12,
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // ── 2. Bento Cards Grid (Reference 2-Column Cards) ──────────────
              LayoutBuilder(
                builder: (ctx, constraints) {
                  final isWide = constraints.maxWidth > 480;
                  final card1 = _buildBentoCard(
                    icon: LucideIcons.folder,
                    iconColor: const Color(0xFF6366F1),
                    title: 'Active Workspace',
                    subtitle: wsPath,
                    tag: 'Mounted',
                    tagColor: const Color(0xFF10B981),
                  );
                  final card2 = _buildBentoCard(
                    icon: LucideIcons.sparkles,
                    iconColor: const Color(0xFF8B5CF6),
                    title: 'AI Intelligence',
                    subtitle: modelName,
                    tag: 'Ready',
                    tagColor: const Color(0xFF3B82F6),
                  );

                  if (isWide) {
                    return Row(
                      children: [
                        Expanded(child: card1),
                        const SizedBox(width: 12),
                        Expanded(child: card2),
                      ],
                    );
                  }
                  return Column(
                    children: [
                      card1,
                      const SizedBox(height: 10),
                      card2,
                    ],
                  );
                },
              ),

              const SizedBox(height: 16),

              // ── 3. Quick Action Capabilities Panel (Reference Bottom Card) ──
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.03)
                      : Colors.black.withValues(alpha: 0.02),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : Colors.black.withValues(alpha: 0.06),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          LucideIcons.terminal,
                          size: 14,
                          color: textSecondary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'QUICK ACTIONS & PROMPTS',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: textSecondary.withValues(alpha: 0.8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildActionTile(
                      icon: LucideIcons.gitBranch,
                      title: 'Inspect Git Status & Changes',
                      subtitle: 'Check active commits, diffs, and staged files on origin/main',
                      prompt: '@git Show current git status and recent branch diffs',
                    ),
                    const SizedBox(height: 8),
                    _buildActionTile(
                      icon: LucideIcons.folderSearch,
                      title: 'Explore & Search Workspace Files',
                      subtitle: 'Find files, grep patterns, or inspect project structure',
                      prompt: 'Find and list all recent files modified in this project',
                    ),
                    const SizedBox(height: 8),
                    _buildActionTile(
                      icon: LucideIcons.database,
                      title: 'Cloudflare & Infrastructure Check',
                      subtitle: 'Verify DNS records, cache status, and web services',
                      prompt: 'Check DNS records and Cloudflare cache status for my domains',
                    ),
                    const SizedBox(height: 8),
                    _buildActionTile(
                      icon: LucideIcons.code2,
                      title: 'Build & Full-Stack Refactor',
                      subtitle: 'Execute commands, run tests, and perform code edits',
                      prompt: 'Review the current codebase and explain what we can improve next',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBentoCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String tag,
    required Color tagColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.03)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.06),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: iconColor),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: tagColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(
                  tag,
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: tagColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: textSecondary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: textPrimary,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required String prompt,
  }) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: () => onSelectPrompt?.call(prompt),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.02)
                : Colors.black.withValues(alpha: 0.02),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.black.withValues(alpha: 0.04),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(icon, size: 14, color: const Color(0xFF6366F1)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: textPrimary,
                      ),
                    ),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 10.5,
                        color: textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Icon(
                LucideIcons.arrowUpRight,
                size: 13,
                color: textSecondary.withValues(alpha: 0.6),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
