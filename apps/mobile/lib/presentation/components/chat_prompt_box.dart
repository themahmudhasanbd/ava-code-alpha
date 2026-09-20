import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/prompt_theme.dart';
import 'connect_provider_sheet.dart';

/// Premier Glassmorphic Prompt Box matching AvA Code's original signature aesthetic
/// Features multi-line input, action toolbar, suggestion pills, and gradient send button
class ChatPromptBox extends StatefulWidget {
  final TextEditingController controller;
  final bool isStreaming;
  final VoidCallback onSend;
  final VoidCallback onInterrupt;
  final ValueChanged<String>? onSelectSuggestion;

  const ChatPromptBox({
    super.key,
    required this.controller,
    required this.isStreaming,
    required this.onSend,
    required this.onInterrupt,
    this.onSelectSuggestion,
  });

  @override
  State<ChatPromptBox> createState() => _ChatPromptBoxState();
}

class _ChatPromptBoxState extends State<ChatPromptBox> {
  final List<String> _suggestions = [
    '✨ Refactor Auth Flow',
    '⚡ Run Cargo Check',
    '🔍 Inspect Git Diff',
    '🚀 Run Test Suite',
  ];

  bool _hasText = false;
  bool _isVoiceRecording = false;

  @override
  void initState() {
    super.initState();
    _hasText = widget.controller.text.trim().isNotEmpty;
    widget.controller.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    final has = widget.controller.text.trim().isNotEmpty;
    if (has != _hasText) {
      setState(() => _hasText = has);
    }
  }

  /// Handle slash commands typed in the prompt box
  void _handleSlashCommand(String text) {
    final trimmed = text.trim().toLowerCase();
    if (trimmed == '/connect' || trimmed.startsWith('/connect ')) {
      widget.controller.clear();
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => const ConnectProviderSheet(),
      );
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _showToolsModal(BuildContext context) {
    final isDark = AppColors.isDark(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF18181B) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(
          color: isDark ? const Color(0x30FFFFFF) : const Color(0xFFE2E8F0),
          width: 1,
        ),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.settings2, size: 18, color: AppColors.accentPrimary),
                  const SizedBox(width: 8),
                  Text(
                    'Workspace Tools & Capabilities',
                    style: AppTypography.titleMedium.copyWith(color: AppColors.text(context)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildToolItem(context, LucideIcons.fileCode, 'File System Tools', 'Read, search, create, and patch files'),
              _buildToolItem(context, LucideIcons.terminal, 'Bash Terminal', 'Execute commands inside sandboxed workspace'),
              _buildToolItem(context, LucideIcons.sparkles, 'Autonomous Engine', 'Multi-step reasoning and automated execution'),
              _buildToolItem(context, LucideIcons.database, 'Database Engine', 'Direct database query and schema analysis'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToolItem(BuildContext context, IconData icon, String title, String desc) {
    final isDark = AppColors.isDark(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.line(context)),
            ),
            child: Icon(icon, size: 16, color: AppColors.accentPrimary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.text(context),
                  ),
                ),
                Text(
                  desc,
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.subtext(context),
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: AppColors.accentSuccess,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }

  void _showAttachModal(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.isDark(context) ? const Color(0xFF18181B) : const Color(0xFF0F172A),
        content: Text(
          'Workspace filesystem active. Reference files using @path in your prompt.',
          style: AppTypography.bodySmall.copyWith(color: Colors.white),
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
      decoration: const BoxDecoration(
        color: Colors.transparent,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Suggestion Pills
          if (!widget.isStreaming && widget.controller.text.isEmpty)
            Container(
              height: 32,
              margin: const EdgeInsets.only(bottom: 8),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _suggestions.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final suggestion = _suggestions[index];
                  return InkWell(
                    onTap: () {
                      final cleanPrompt = suggestion.replaceFirst(RegExp(r'^[^\w\s]+\s*'), '');
                      widget.controller.text = cleanPrompt;
                      widget.onSelectSuggestion?.call(cleanPrompt);
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xCC18181D) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark ? const Color(0x30FFFFFF) : const Color(0xFFCBD5E1),
                          width: 0.8,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          suggestion,
                          style: AppTypography.codeSmall.copyWith(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: AppColors.subtext(context),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

          // 2. Floating Prompt Card
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                decoration: BoxDecoration(
                  color: PromptTheme.cardBgFor(context),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: PromptTheme.borderColorFor(context),
                    width: 1.1,
                  ),
                  boxShadow: PromptTheme.promptCardShadowFor(context),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Text Input Area
                    TextField(
                      controller: widget.controller,
                      style: AppTypography.bodyLarge.copyWith(
                        fontSize: 14.5,
                        height: 1.4,
                        color: AppColors.text(context),
                      ),
                      cursorColor: PromptTheme.primary,
                      maxLines: 6,
                      minLines: 1,
                      keyboardType: TextInputType.multiline,
                      decoration: InputDecoration(
                        hintText: widget.isStreaming
                            ? 'Agent is executing instructions...'
                            : 'Ask AvA to build, edit, test or explore code...',
                        hintStyle: AppTypography.bodyMedium.copyWith(
                          color: AppColors.muted(context),
                          fontSize: 13.5,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                      ),
                      onSubmitted: (val) {
                        if (val.trimLeft().startsWith('/')) {
                          _handleSlashCommand(val);
                          return;
                        }
                        if (!widget.isStreaming && _hasText) {
                          widget.onSend();
                        }
                      },
                    ),

                    const SizedBox(height: 8),

                    // Bottom Action Toolbar Row: [+] [Tools] [Workspace] ... [Mic] [Send]
                    Row(
                      children: [
                        // Attach Files Button (+)
                        Tooltip(
                          message: 'Attach file reference',
                          child: InkWell(
                            onTap: () => _showAttachModal(context),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: PromptTheme.buttonBgFor(context),
                              ),
                              child: Icon(
                                LucideIcons.plus,
                                size: 16,
                                color: AppColors.text(context),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 7),

                        // Tools Menu Pill
                        Tooltip(
                          message: 'Workspace Tools',
                          child: InkWell(
                            onTap: () => _showToolsModal(context),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              height: 32,
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              decoration: BoxDecoration(
                                color: PromptTheme.buttonBgFor(context),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isDark ? const Color(0x20FFFFFF) : const Color(0xFFE2E8F0),
                                  width: 0.8,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    LucideIcons.settings2,
                                    size: 14,
                                    color: AppColors.text(context),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    'Tools',
                                    style: AppTypography.codeSmall.copyWith(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.text(context),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 7),

                        // Workspace / Sandbox Mode Pill
                        Container(
                          height: 32,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0x203B82F6) : const Color(0x152563EB),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isDark ? const Color(0x403B82F6) : const Color(0x302563EB),
                              width: 0.8,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 5,
                                height: 5,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF3B82F6),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Workspace',
                                style: AppTypography.codeSmall.copyWith(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF2563EB),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const Spacer(),

                        // Voice input / Mic button
                        Tooltip(
                          message: 'Voice input',
                          child: InkWell(
                            onTap: () {
                              setState(() => _isVoiceRecording = !_isVoiceRecording);
                              if (_isVoiceRecording) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: AppColors.accentPrimary,
                                    content: Text('Voice input listening...', style: AppTypography.bodySmall),
                                    duration: const Duration(seconds: 2),
                                  ),
                                );
                              }
                            },
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _isVoiceRecording
                                    ? AppColors.accentDanger
                                    : PromptTheme.buttonBgFor(context),
                              ),
                              child: Icon(
                                LucideIcons.mic,
                                size: 15,
                                color: _isVoiceRecording ? Colors.white : AppColors.text(context),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 8),

                        // Send / Stop / Interrupt Button
                        InkWell(
                          onTap: widget.isStreaming
                              ? widget.onInterrupt
                              : (_hasText ? widget.onSend : null),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: widget.isStreaming
                                  ? PromptTheme.stopButtonGradient
                                  : (_hasText ? PromptTheme.primarySendGradient : null),
                              color: (!widget.isStreaming && !_hasText)
                                  ? (isDark ? const Color(0x28FFFFFF) : const Color(0xFFE2E8F0))
                                  : null,
                              boxShadow: (widget.isStreaming || _hasText)
                                  ? [
                                      BoxShadow(
                                        color: (widget.isStreaming
                                                ? const Color(0xFFEF4444)
                                                : PromptTheme.primary)
                                            .withValues(alpha: 0.35),
                                        blurRadius: 10,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Icon(
                              widget.isStreaming ? LucideIcons.square : LucideIcons.arrowUp,
                              size: 16,
                              color: (!widget.isStreaming && !_hasText)
                                  ? (isDark ? AppColors.textMuted : AppColors.lightTextMuted)
                                  : Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
