import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/prompt_theme.dart';

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
    '🚀 Verify Antigravity Engine',
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

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _showToolsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF18181B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: Color(0x30FFFFFF), width: 1),
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
                  Text('Active MCP Tools & Capabilities', style: AppTypography.titleMedium),
                ],
              ),
              const SizedBox(height: 16),
              _buildToolItem(LucideIcons.fileCode, 'Filesystem Explorer', 'Read/write files under workspace root'),
              _buildToolItem(LucideIcons.terminal, 'Bash Shell Terminal', 'Execute commands inside sandboxed environment'),
              _buildToolItem(LucideIcons.sparkles, 'Google Antigravity Bridge', 'Multi-agent reasoning with Gemini 3.7 Flash'),
              _buildToolItem(LucideIcons.database, 'MySQL / DB Schema', 'Direct database query & migration inspection'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToolItem(IconData icon, String title, String desc) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: Icon(icon, size: 16, color: AppColors.accentPrimary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text(desc, style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
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
        backgroundColor: const Color(0xFF18181B),
        content: Text(
          'Workspace filesystem active. You can reference files directly using @/path in your instruction.',
          style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary),
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
      decoration: const BoxDecoration(
        color: Colors.transparent,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Dynamic Suggestion Pills (Old Style)
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
                        color: const Color(0xCC18181D),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0x30FFFFFF), width: 0.8),
                      ),
                      child: Center(
                        child: Text(
                          suggestion,
                          style: AppTypography.codeSmall.copyWith(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

          // 2. Crystal Transparent Floating Glass Prompt Card
          ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                decoration: BoxDecoration(
                  color: PromptTheme.cardBg,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: PromptTheme.borderColor,
                    width: 1.1,
                  ),
                  boxShadow: PromptTheme.promptCardShadow,
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
                      ),
                      cursorColor: PromptTheme.primary,
                      maxLines: 6,
                      minLines: 1,
                      keyboardType: TextInputType.multiline,
                      decoration: InputDecoration(
                        hintText: widget.isStreaming
                            ? 'AvA Agent is executing instructions...'
                            : 'Message AvA Agent (e.g. check cloudflare, build feature)...',
                        hintStyle: AppTypography.bodyMedium.copyWith(
                          color: const Color(0xFF9CA3AF),
                          fontSize: 13.5,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                      ),
                      onSubmitted: (_) {
                        if (!widget.isStreaming && _hasText) {
                          widget.onSend();
                        }
                      },
                    ),

                    const SizedBox(height: 8),

                    // Bottom Action Toolbar Row (Old Layout: [+] [Tools] [Workspace] ... [Mic] [Send])
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
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: PromptTheme.buttonBg,
                              ),
                              child: const Icon(
                                LucideIcons.plus,
                                size: 17,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 7),

                        // Tools Menu Pill
                        Tooltip(
                          message: 'Explore Tools',
                          child: InkWell(
                            onTap: () => _showToolsModal(context),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              height: 32,
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              decoration: BoxDecoration(
                                color: PromptTheme.buttonBg,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0x20FFFFFF), width: 0.8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    LucideIcons.settings2,
                                    size: 14,
                                    color: AppColors.textPrimary,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    'Tools',
                                    style: AppTypography.codeSmall.copyWith(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
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
                            color: const Color(0x203B82F6),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0x403B82F6), width: 0.8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 5,
                                height: 5,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF60A5FA),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Workspace',
                                style: AppTypography.codeSmall.copyWith(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF93C5FD),
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
                                    content: Text('Voice recording listening...', style: AppTypography.bodySmall),
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
                                color: _isVoiceRecording ? AppColors.accentDanger : PromptTheme.buttonBg,
                              ),
                              child: Icon(
                                LucideIcons.mic,
                                size: 16,
                                color: _isVoiceRecording ? Colors.white : AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 8),

                        // Send / Stop / Interrupt Button (Original Gradient)
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
                                  : (_hasText
                                      ? PromptTheme.primarySendGradient
                                      : null),
                              color: (!widget.isStreaming && !_hasText)
                                  ? const Color(0x28FFFFFF)
                                  : null,
                              boxShadow: (widget.isStreaming || _hasText)
                                  ? [
                                      BoxShadow(
                                        color: (widget.isStreaming
                                                ? const Color(0xFFEF4444)
                                                : PromptTheme.primary)
                                            .withValues(alpha: 0.4),
                                        blurRadius: 10,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Icon(
                              widget.isStreaming
                                  ? LucideIcons.square
                                  : LucideIcons.arrowUp,
                              size: 16,
                              color: (!widget.isStreaming && !_hasText)
                                  ? AppColors.textMuted
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
