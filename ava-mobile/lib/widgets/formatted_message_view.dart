import "dart:async";
import "dart:convert";
import "dart:math";
import "dart:ui";
import "package:flutter/gestures.dart";
import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter_markdown/flutter_markdown.dart";
import "package:lucide_icons_flutter/lucide_icons.dart";

import "package:cached_network_image/cached_network_image.dart";
import "package:markdown/markdown.dart" as md;
import "package:url_launcher/url_launcher.dart";
import "../models/app_models.dart";
import "../services/agent_core_service.dart";
import "../theme/app_theme.dart";
import "../utils/app_toast.dart";
import "../utils/downloader/file_downloader.dart";
import "chat/fmv_file_attachments.dart";
import "chat/session_compact_widget.dart";
import "chat/voice_note_player_widget.dart";
import "chat/image_lightbox_viewer.dart";

// Part files — each contains a focused slice of the view's logic.
// All share this library's private namespace, so `_` members are fully accessible.
part "chat/fmv_markdown_builders.dart";
part "chat/fmv_animated_widgets.dart";
part "chat/fmv_agent_header.dart";
part "chat/fmv_user_bubble.dart";
part "chat/fmv_thinking.dart";
part "chat/fmv_tool_cards.dart";
part "chat/fmv_markdown.dart";
part "chat/fmv_question_permission.dart";
part "chat/fmv_image_preview.dart";
part "chat/fmv_mermaid_view.dart";

/// Shared Bangla & Unicode font family fallback across FormattedMessageView parts
const List<String> kFmvFontFamilyFallback = [
  "HindSiliguri",
  "Hind Siliguri",
  "NotoSansBengali",
  "Noto Sans Bengali",
  "sans-serif",
];

// ─── Logo Avatar ──────────────────────────────────────────────────────────────

/// AvA Interactive Mascot Avatar Widget matching reference AIMascot in ask-ai.tsx.
Widget buildAvaLogoAvatar({double size = 22, double radius = 6, bool awake = true, MascotGaze? gaze}) {
  return AiMascotAvatar(
    size: size,
    awake: awake,
    gaze: gaze,
  );
}

// ─── FormattedMessageView ─────────────────────────────────────────────────────

/// FormattedMessageView — AvA Minimalist Execution Loop Display Style & Dedicated Typography.
class FormattedMessageView extends StatefulWidget {
  final ChatMessageModel message;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final VoidCallback? onRetry;
  final Function(String option)? onOptionSelected;
  final Function(String requestID, String answer)? onQuestionReplied;
  final void Function(bool approved, String command, {String? requestId})? onPermissionDecision;
  final Function(String filePath, {String? diffOrContent})? onOpenFile;
  final Function(String sessionId)? onOpenSession;
  final String? baseUrl;
  final String? userAvatar;
  final AvaAgentCoreService? agentCoreService;

  const FormattedMessageView({
    super.key,
    required this.message,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.onRetry,
    this.onOptionSelected,
    this.onQuestionReplied,
    this.onPermissionDecision,
    this.onOpenFile,
    this.onOpenSession,
    this.baseUrl,
    this.userAvatar,
    this.agentCoreService,
  });

  @override
  State<FormattedMessageView> createState() => _FormattedMessageViewState();
}

// ─── State ────────────────────────────────────────────────────────────────────

class _FormattedMessageViewState extends State<FormattedMessageView> with SingleTickerProviderStateMixin {
  final Map<String, bool> _expandedState = {};
  final Map<String, bool> _fullOutputExpanded = {};
  final TextEditingController _customAnswerCtrl = TextEditingController();
  
  // Per-message state tracking maps to prevent state recycling leaks in ListView
  final Map<String, bool> _answerSubmittedMap = {};
  final Map<String, String> _localSubmittedAnswerMap = {};
  final Map<String, bool> _permissionDecidedMap = {};
  final Map<String, bool> _permissionApprovedMap = {};
  final Map<String, String> _selectedQuestionOptionMap = {};

  late AnimationController _cursorAnimController;
  late Animation<double> _cursorOpacity;

  // ── Markdown memoization cache ───────────────────────────────────────────────
  String? _cachedMarkdownText;
  bool? _cachedMarkdownIsLive;
  Widget? _cachedMarkdownWidget;
  bool _cachedMarkdownBuilt = false;

  @override
  void initState() {
    super.initState();
    _cursorAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
    _cursorOpacity = Tween<double>(begin: 0.2, end: 1.0).animate(_cursorAnimController);
  }

  @override
  void didUpdateWidget(covariant FormattedMessageView oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Invalidate markdown cache when message, dark mode, base URL or text change.
    if (!identical(oldWidget.message, widget.message) ||
        oldWidget.isDark != widget.isDark ||
        oldWidget.baseUrl != widget.baseUrl ||
        oldWidget.message.text != widget.message.text) {
      _cachedMarkdownBuilt = false;
      _cachedMarkdownWidget = null;
      _cachedMarkdownText = null;
    }
  }

  @override
  void dispose() {
    _cursorAnimController.dispose();
    _customAnswerCtrl.dispose();
    super.dispose();
  }

  // ── High-Contrast Dynamic Color Tokens ─────────────────────────────────────
  Color get _cPrimary => widget.isDark ? const Color(0xFFFAFAFA) : const Color(0xFF0F172A);
  Color get _cSecondary => widget.isDark ? const Color(0xFFA1A1AA) : const Color(0xFF334155);
  Color get _cFaint => widget.isDark ? const Color(0xFF71717A) : const Color(0xFF64748B);
  Color get _cCardBg => widget.isDark ? widget.cardBg : Colors.white;
  Color get _cBorder => widget.isDark ? widget.borderColor : const Color(0xFFCBD5E1);
  Color get _cInset => widget.isDark ? const Color(0xFF111114) : const Color(0xFFF1F5F9);
  Color get _cCodeBg => const Color(0xFF0B0F19);
  Color get _cInlineCodeBg => widget.isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0);
  Color get _cInlineCodeText => widget.isDark ? const Color(0xFF93C5FD) : const Color(0xFF312E81);
  Color get _cAccentPurple => const Color(0xFF4F46E5);

  // Defined High-Contrast Colors for Tool Execution States
  Color get _statusRunning => const Color(0xFF38BDF8); // Sky Blue / Cyan
  Color get _statusRunningBg => const Color(0xFF0284C7).withValues(alpha: 0.14);
  Color get _statusRunningBorder => const Color(0xFF38BDF8).withValues(alpha: 0.40);

  Color get _statusSuccess => const Color(0xFF10B981); // Emerald Green
  Color get _statusSuccessBg => const Color(0xFF10B981).withValues(alpha: 0.14);
  Color get _statusSuccessBorder => const Color(0xFF10B981).withValues(alpha: 0.35);

  Color get _statusFailed => const Color(0xFFEF4444); // Rose Crimson Red
  Color get _statusFailedBg => const Color(0xFFEF4444).withValues(alpha: 0.14);
  Color get _statusFailedBorder => const Color(0xFFEF4444).withValues(alpha: 0.40);

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final msg = widget.message;

    // 1. User Message: High-Contrast Bubble with Full Markdown & Dedicated Message Font
    if (msg.sender == "user") {
      final trimmedText = msg.text.trim();
      final bool isEngineInternalPrompt = msg.isCompaction ||
          (msg.parts.any((p) => p.metadata != null && p.metadata!['compaction_continue'] == true)) ||
          trimmedText.startsWith("The conversation history was compacted") ||
          trimmedText.startsWith("<command_result") ||
          trimmedText.startsWith("<tool_result") ||
          trimmedText.startsWith("<task_progress") ||
          trimmedText.startsWith("<timer_notification") ||
          trimmedText.startsWith("<task_result") ||
          trimmedText.startsWith("<task_status") ||
          trimmedText.startsWith("<synthetic_prompt") ||
          (trimmedText.startsWith("<task") && trimmedText.contains("state="));
      if (isEngineInternalPrompt) return const SizedBox.shrink();
      return _buildUserBubble(msg.text, msg.timestamp, attachments: msg.attachments);
    }

    // 2. Session Compaction Checkpoint
    if (msg.isCompactionMessage) {
      return SessionCompactWidget(
        message: msg,
        isDark: widget.isDark,
        cardBg: widget.cardBg,
        borderColor: widget.borderColor,
        textPrimary: widget.textPrimary,
        textSecondary: widget.textSecondary,
      );
    }

    // 3. Agent Message: AvA Minimalist Execution Loop Display Style
    final isTurnActive = msg.isPending;
    final hasParts = msg.parts.isNotEmpty;
    final hasReasoning = msg.reasoningText?.trim().isNotEmpty == true;
    final hasText = msg.text.trim().isNotEmpty;
    final hasTimeline = msg.timelineEvents.isNotEmpty;
    final hasQuestion = msg.questionData != null;
    final hasPermission = msg.permissionData != null;

    if (isTurnActive && !hasParts && !hasReasoning && !hasText && !hasTimeline && !hasQuestion && !hasPermission) {
      return _buildPendingShimmer(msg);
    }

    final bool hasError = msg.isError || (msg.errorMessage != null && msg.errorMessage!.trim().isNotEmpty);
    final String errorToDisplay = (msg.errorMessage != null && msg.errorMessage!.trim().isNotEmpty)
        ? msg.errorMessage!.trim()
        : (msg.text.trim().isNotEmpty ? msg.text.trim() : "AvA Core execution error encountered.");

    if (hasError && !hasParts && !hasText && !hasReasoning && !hasTimeline) {
      return _buildErrorCard(errorToDisplay);
    }

    // Suppress empty messages completely to avoid empty card / header glitches
    if (!isTurnActive && !hasParts && !hasReasoning && !hasText && !hasTimeline && !hasQuestion && !hasPermission && !hasError) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Agent Header
          _buildAgentHeader(msg, isTurnActive: isTurnActive),
          const SizedBox(height: 10),

          // Sequential Interleaved Execution Loop (Minimalist, Borderless Timeline Style)
          if (hasParts) ...[
            // 1. If reasoningText exists but is not represented as a part in msg.parts, render it first
            if (hasReasoning && !msg.parts.any((p) => p.type == "reasoning" || p.type == "thinking" || p.type == "thought")) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: _buildThinkingAccordion(
                  "thinking-top-${msg.id}",
                  msg.reasoningText!.trim(),
                  isStreaming: isTurnActive && msg.text.isEmpty,
                  isTurnActive: isTurnActive,
                  startedAt: DateTime.tryParse(msg.timestamp),
                ),
              ),
            ],
            ...msg.parts.map((part) {
              if (part.type == "reasoning" || part.type == "thinking" || part.type == "thought") {
                final isPartStreaming = isTurnActive &&
                    (part.status == "running" ||
                        (part.status != "completed" && part == msg.parts.last && msg.text.isEmpty));
                String text = part.text.trim();
                if (msg.reasoningText != null && msg.reasoningText!.trim().length > text.length) {
                  text = msg.reasoningText!.trim();
                }
                if (text.isEmpty && !isPartStreaming && (msg.reasoningText == null || msg.reasoningText!.trim().isEmpty)) {
                  return const SizedBox.shrink();
                }
                final effectiveText = text.isNotEmpty ? text : (msg.reasoningText?.trim() ?? "");
                final accordionKey = part.id.isNotEmpty
                    ? "thinking-${part.id}"
                    : "thinking-${msg.id}-${msg.parts.indexOf(part)}";
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: _buildThinkingAccordion(
                    accordionKey,
                    effectiveText,
                    isStreaming: isPartStreaming,
                    isTurnActive: isTurnActive,
                    durationMs: part.durationMs,
                    startedAt: part.timestamp,
                  ),
                );
              } else if (part.type == "tool" ||
                  part.type == "tool-call" ||
                  part.type == "tool_call" ||
                  part.type == "tool_use" ||
                  part.type == "tool-use" ||
                  part.type == "function_call" ||
                  part.type == "function" ||
                  part.type == "todo" ||
                  (part.tool != null && part.tool!.isNotEmpty)) {
                final toolName = (part.tool ?? part.type).toLowerCase();
                final isTodoTool = toolName == 'todowrite' ||
                    toolName == 'todo' ||
                    part.type == 'todo' ||
                    (part.input is Map && (part.input as Map).containsKey('todos'));
                final isQuestionTool = toolName == 'question' ||
                    toolName == 'ask_question' ||
                    toolName == 'default_api:ask_question' ||
                    toolName.contains('question');
                if (isTodoTool) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: _buildTodosCard(part, isTurnActive: isTurnActive),
                  );
                }
                if (isQuestionTool) {
                  final qData = _extractQuestionDataFromPart(part, msg.questionData);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: _buildQuestionCard(qData),
                  );
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: _buildToolCardFromPart(part, isTurnActive: isTurnActive),
                );
              } else if (part.type == "text" && part.text.trim().isNotEmpty) {
                final trimmedPart = part.text.trim();
                final bool isInternalSynthetic = part.synthetic ||
                    trimmedPart.startsWith("<command_result") ||
                    trimmedPart.startsWith("<tool_result") ||
                    trimmedPart.startsWith("<task_progress") ||
                    trimmedPart.startsWith("<timer_notification") ||
                    trimmedPart.startsWith("<task_result") ||
                    trimmedPart.startsWith("<task_status") ||
                    trimmedPart.startsWith("<synthetic_prompt") ||
                    (trimmedPart.startsWith("<task") && trimmedPart.contains("state="));
                if (isInternalSynthetic) return const SizedBox.shrink();

                final isTextLive = isTurnActive && part == msg.parts.last;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _buildMarkdown(part.text, isUser: false, isLive: isTextLive, isHistory: msg.isHistory),
                );
              }
              return const SizedBox.shrink();
            }),
            // Safety guarantee: render msg.text if no text part was shown
            if (!msg.parts.any((p) => p.type == "text" && p.text.trim().isNotEmpty && !p.synthetic && !p.text.trim().startsWith("<tool_result") && !p.text.trim().startsWith("<command_result")) && hasText && (!hasError || (msg.text.trim() != errorToDisplay && !msg.text.trim().startsWith('❌'))))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _buildMarkdown(msg.text, isUser: false, isLive: isTurnActive, isHistory: msg.isHistory),
              ),
          ] else ...[
            // Fallback for non-part turns
            if (hasReasoning) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: _buildThinkingAccordion(
                  "legacy-reasoning-${msg.id}",
                  msg.reasoningText!.trim(),
                  isStreaming: isTurnActive && !hasText,
                  isTurnActive: isTurnActive,
                  startedAt: DateTime.tryParse(msg.timestamp),
                ),
              ),
            ],
            if (hasTimeline) ...[
              _buildLegacyToolTimeline(msg.timelineEvents, isTurnActive: isTurnActive),
              const SizedBox(height: 6),
            ],
            if (hasText && (!hasError || (msg.text.trim() != errorToDisplay && !msg.text.trim().startsWith('❌'))))
              _buildMarkdown(msg.text, isUser: false, isLive: isTurnActive, isHistory: msg.isHistory),
          ],

          // Error Notice Card (Consistent visual styling for all error states)
          if (hasError)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: _buildErrorCard(errorToDisplay),
            ),

          // Interactive Question: Only render in-message once answered
          if (hasQuestion &&
              !msg.parts.any((p) {
                final t = (p.tool ?? p.type).toLowerCase();
                return t == 'question' || t == 'ask_question' || t == 'default_api:ask_question' || t.contains('question');
              })) ...[
            if (msg.questionData!['answered'] == true || _answerSubmittedMap[msg.id] == true) ...[
              const SizedBox(height: 10),
              _buildQuestionCard(msg.questionData!),
            ],
          ],

          // Interactive Permission Request: Only render in-message once decided
          if (hasPermission) ...[
            if (msg.permissionData!['answered'] == true || _permissionDecidedMap[msg.id] == true || !msg.isPending) ...[
              const SizedBox(height: 10),
              _buildPermissionCard(msg.permissionData!),
            ],
          ],

          // Working indicator when turn is active (at bottom of turn)
          if (isTurnActive) ...[
            const SizedBox(height: 6),
            _buildAestheticCookingIndicator(),
          ],

          // Agent File Attachments & Download Cards (Intentional Deliverables)
          () {
            final List<String> allAttachments = List<String>.from(msg.attachments);
            for (final p in msg.parts) {
              final toolName = (p.tool ?? '').toLowerCase();
              if (toolName == 'share_file' || toolName == 'attach_file') {
                if (p.input is Map) {
                  final target = p.input['path']?.toString() ?? p.input['filePath']?.toString();
                  if (target != null && target.isNotEmpty && !allAttachments.contains(target)) {
                    allAttachments.add(target);
                  }
                }
                if (p.metadata is Map) {
                  final target = p.metadata?['filepath']?.toString() ?? p.metadata?['path']?.toString();
                  if (target != null && target.isNotEmpty && !allAttachments.contains(target)) {
                    allAttachments.add(target);
                  }
                }
              }
            }
            if (allAttachments.isNotEmpty) {
              return AgentFileAttachmentsWidget(
                filePaths: allAttachments,
                isDark: widget.isDark,
                cardBg: widget.cardBg,
                borderColor: widget.borderColor,
                textPrimary: widget.textPrimary,
                textSecondary: widget.textSecondary,
                agentCoreService: widget.agentCoreService,
                onOpenFile: widget.onOpenFile,
              );
            }
            return const SizedBox.shrink();
          }(),

          // Output Copy Action Bar
          if (hasText && !isTurnActive) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  msg.timestamp,
                  style: TextStyle(fontSize: 10.5, color: _cFaint, fontFamily: "Inter"),
                ),
                const SizedBox(width: 8),
                Container(
                  width: 3,
                  height: 3,
                  decoration: BoxDecoration(color: _cFaint.withValues(alpha: 0.4), shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: msg.text.trim()));
                    AppToast.copied(context, "Copied final output response to clipboard!");
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _cAccentPurple.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: _cAccentPurple.withValues(alpha: 0.3), width: 0.6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.copy, size: 11, color: _cAccentPurple),
                        const SizedBox(width: 4),
                        Text("Copy",
                            style: TextStyle(fontSize: 10.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: _cAccentPurple)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
